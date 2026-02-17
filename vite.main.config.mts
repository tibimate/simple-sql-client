import path from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        "pg",
        "pg-native",
        "mysql2",
        "mysql2/promise",
        "better-sqlite3",
        "electron",
      ],
    },
  },
  ssr: {
    external: [
      "pg",
      "pg-native",
      "mysql2",
      "mysql2/promise",
      "better-sqlite3",
      "electron",
    ],
  },
});
