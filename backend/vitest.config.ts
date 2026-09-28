import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Los tests nunca tocan la base de datos real.
    env: { DB_PATH: ":memory:" },
  },
});
