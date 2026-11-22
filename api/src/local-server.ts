// ローカル開発用 API サーバ（認証はダミー: "Bearer dev:<ユーザー名>"）
import http from "node:http";
import path from "node:path";
import { route } from "./app";
import { MemoryRepo } from "./repo-memory";

const port = Number(process.env.PORT ?? 8787);
const file = process.env.DATA_FILE ?? path.resolve(process.cwd(), ".local-data.json");
const repo = new MemoryRepo(file);

http
  .createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const auth = req.headers.authorization ?? "";
    const user = auth.startsWith("Bearer dev:") ? decodeURIComponent(auth.slice(11)) : undefined;
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      const r = await route(repo, req.method ?? "GET", url.pathname, user ? `dev-${user}` : undefined, Buffer.concat(chunks).toString("utf8"));
      res.writeHead(r.status, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(r.body));
    } catch (e) {
      console.error(e);
      res.writeHead(500).end();
    }
  })
  .listen(port, () => console.log(`local API: http://localhost:${port}/api  (data: ${file})`));
