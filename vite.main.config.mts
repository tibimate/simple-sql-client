import path from "node:path";
import { defineConfig } from "vite";

const projectRoot = process.cwd();

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
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
