import { useCallback, useEffect, useState } from "react";

type State<T> = {
  key: string;
  data: T | null;
  error: string | null;
};

// Carga asíncrona ligada a un id: cancela la petición anterior si el id
// cambia y expone reintento. Sin id no carga nada.
export function useAsync<T>(
  id: string | undefined,
  load: (id: string, signal: AbortSignal) => Promise<T>,
) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State<T>>({ key: "", data: null, error: null });

  // Cada petición se identifica por id + intento; mientras la respuesta
  // guardada no corresponda a la petición actual, estamos cargando.
  const key = `${id}:${attempt}`;

  useEffect(() => {
    if (!id) return;

    // Si el id cambia antes de que acabe la carga, la respuesta antigua se
    // descarta en vez de pisar la nueva.
    const controller = new AbortController();

    load(id, controller.signal)
      .then((data) => setState({ key, data, error: null }))
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setState({ key, data: null, error: err.message });
      });

    return () => controller.abort();
  }, [id, key, load]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const loading = Boolean(id) && state.key !== key;

  return {
    data: loading ? null : state.data,
    error: loading ? null : state.error,
    loading,
    retry,
  };
}
