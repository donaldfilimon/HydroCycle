import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiPort = process.env.HYDROCYCLE_API_PORT || "8000";

export default defineConfig({
  plugins: [react()],
  base: process.env.HYDROCYCLE_BASE_PATH || "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
