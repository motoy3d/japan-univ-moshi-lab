// スマホ動作確認用のデモ版ビルド（1枚の HTML にまとめて共有する）: npm -w web run build:demo
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 1e9,
    rollupOptions: { input: "demo.html", output: { inlineDynamicImports: true } },
  },
});
