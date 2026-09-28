import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const MAX_RETRIES = 3;

type FetchOptions = {
  // La Data API oficial (open.faceit.com) necesita la API key; las internas no.
  auth?: boolean;
};

export async function fetchJson<T = any>(
  url: string,
  { auth = false }: FetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0" };
  if (auth) {
    headers.Authorization = `Bearer ${process.env.FACEIT_API_KEY}`;
  }

  let response = await fetch(url, { headers });

  // Faceit limita las peticiones por segundo: ante un 429 se espera lo que diga
  // Retry-After (o un backoff creciente) y se reintenta unas pocas veces.
  for (let attempt = 1; response.status === 429 && attempt <= MAX_RETRIES; attempt++) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 10_000)));
    response = await fetch(url, { headers });
  }

  const raw = await response.text();

  if (!response.ok) {
    throw new HttpError(response.status, `Faceit ${response.status}: ${raw.slice(0, 300)}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(502, `FACEIT returned a non-JSON response: ${raw.slice(0, 200)}`);
  }
}

// Cloudflare bloquea frecuentemente requests de Node fetch para algunos endpoints
// internos de faceit.com; curl usa un fingerprint TLS/HTTP aceptado y evita el 403.
export async function curlJson<T = any>(url: string): Promise<T> {
  const curlCommand = process.platform === "win32" ? "curl.exe" : "curl";

  let output: string;
  try {
    ({ stdout: output } = await execFileAsync(
      curlCommand,
      [
        "--silent",
        "--show-error",
        "--max-time",
        "20",
        "-H",
        "User-Agent: PostmanRuntime/7.43.4",
        "-H",
        "Accept: */*",
        // El código HTTP va en la última línea para poder distinguir 404 de 5xx.
        "--write-out",
        "\n%{http_code}",
        url,
      ],
      { maxBuffer: 20 * 1024 * 1024 },
    ));
  } catch (error: any) {
    const details = error?.stderr || error?.message || "Unknown error";
    throw new HttpError(502, `Faceit request failed: ${details}`);
  }

  const split = output.lastIndexOf("\n");
  const body = output.slice(0, split);
  const status = Number(output.slice(split + 1));

  if (status < 200 || status >= 300) {
    throw new HttpError(status || 502, `Faceit ${status}: ${body.slice(0, 300)}`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(502, `FACEIT returned a non-JSON response: ${body.slice(0, 200)}`);
  }
}

// Endpoints internos de faceit.com: primero fetch (más rápido) y, si
// Cloudflare lo bloquea (403), se repite con curl.
export async function internalJson<T = any>(url: string): Promise<T> {
  try {
    return await fetchJson<T>(url);
  } catch (error) {
    if (error instanceof HttpError && error.status === 403) return curlJson<T>(url);
    throw error;
  }
}

// Como Promise.all + map, pero con un máximo de tareas simultáneas para no
// disparar el rate limit de Faceit.
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
