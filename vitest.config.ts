import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://lydev@127.0.0.1:5433/lydev_cloud",
      JWT_SECRET: "test-secret-that-is-at-least-32-bytes-long",
      JWT_ISSUER: "cloud.lydev.id",
    },
  },
});
