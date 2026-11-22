// 画面の通し確認（E2E）: npm run e2e
// ローカルの API（メモリ保存）と Vite の開発サーバを起動して、主要な流れをブラウザで確かめる。
import { defineConfig, devices } from "@playwright/test";

const port = 5174;
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "off",
    // このリポジトリのクラウド開発環境では、同梱の Chromium を使う
    ...(process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}),
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      command: "DATA_FILE=memory PORT=8788 npx tsx api/src/local-server.ts",
      url: "http://localhost:8788/api/health",
      reuseExistingServer: false,
    },
    {
      command: `npx vite --port ${port} --strictPort`,
      cwd: "web",
      url: `http://localhost:${port}`,
      env: { API_PORT: "8788" },
      reuseExistingServer: false,
    },
  ],
});
