import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ローカルでは /api を local-server に転送（本番は CloudFront が API Gateway に転送）
    proxy: { "/api": "http://localhost:8787" },
    fs: { allow: [".."] },
  },
  build: { outDir: "dist", sourcemap: false },
});
