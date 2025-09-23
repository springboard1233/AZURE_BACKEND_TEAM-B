import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "public",
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html"
    }
  },
  server: {
    port: 5175,
    proxy: {
      "/api": "http://localhost:5000", // forward API requests to backend
    },
  },
});
