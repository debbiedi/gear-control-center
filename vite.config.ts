import { fileURLToPath } from "node:url";
// vitest/config re-exports Vite's defineConfig with the test block typed.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Tauri serves the dev build; fail loudly rather than silently picking
  // another port, or the desktop window would load nothing.
  clearScreen: false,
  test: {
    // Pure functions only: the parts where a wrong number would reach the
    // hardware or misrepresent what it reported.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
  server: { port: 5173, strictPort: true },
});
