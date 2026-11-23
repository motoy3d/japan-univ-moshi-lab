import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Content-Security-Policy（本番ビルドのみ）。
 * CloudFront の定額 Free プランではカスタムのレスポンスヘッダーポリシーが使えないため、meta タグで指定する。
 * （frame-ancestors は meta では効かないので、CloudFront 管理ポリシーの X-Frame-Options で代替）
 * 開発サーバーは HMR にインラインスクリプトを使うので付けない。
 */
const CSP = [
  "default-src 'self'",
  // Google アナリティクス（GA4）: gtag.js と計測の送信先
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.google-analytics.com https://www.googletagmanager.com",
  "connect-src 'self' https://*.amazoncognito.com https://cognito-idp.ap-northeast-1.amazonaws.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "base-uri 'self'",
  "form-action 'self' https://*.amazoncognito.com",
  "object-src 'none'",
].join("; ");

function cspMeta(): Plugin {
  return {
    name: "csp-meta",
    apply: "build",
    transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
  };
}

export default defineConfig({
  plugins: [react(), cspMeta()],
  server: {
    port: 5173,
    // ローカルでは /api を local-server に転送（本番は CloudFront が API Gateway に転送）
    proxy: { "/api": `http://localhost:${process.env.API_PORT ?? 8787}` },
    fs: { allow: [".."] },
  },
  build: { outDir: "dist", sourcemap: false },
});
