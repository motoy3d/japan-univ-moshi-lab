// スマホ動作確認用のデモ版エントリ。
// 画面は本番と同じ。/api への通信だけをブラウザ内の同じ API ロジック（route）で処理し、データは端末内に保存する。
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App";
import { loadConfig } from "./config";
import { route } from "../../api/src/app";
import { BrowserRepo } from "./demo/browser-repo";
import { EXAMS } from "../../content/index";
import { allQuestions } from "../../shared/scoring";
import "./styles.css";

const repo = new BrowserRepo();
const SEED_USERS = 40;

/** 偏差値を体験できるよう、架空の受験者の初回受験を入れておく */
async function seed() {
  if (repo.data.seeded === SEED_USERS) return;
  repo.reset();
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const exam of EXAMS) {
    const qs = allQuestions(exam);
    for (let u = 0; u < SEED_USERS; u++) {
      const ability = Math.min(0.95, Math.max(0.2, 0.6 + (rnd() + rnd() + rnd() - 1.5) * 0.35));
      const answers: Record<string, unknown> = {};
      for (const q of qs) {
        if (rnd() < ability) answers[q.id] = q.kind === "mark" ? q.answer : (q.answer as string[])[0];
        else answers[q.id] = q.kind === "mark" ? 1 + Math.floor(rnd() * 4) : "x";
      }
      await route(repo, "POST", "/api/attempts", `sample-${u}`, JSON.stringify({ examId: exam.id, answers, durationSec: 4500 + Math.floor(rnd() * 900), mode: "web" }));
    }
  }
  repo.data.seeded = SEED_USERS;
  repo.save();
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const path = url.replace(location.origin, "");
  if (path === "/config.json") return new Response("{}", { status: 404 });
  if (!path.startsWith("/api")) return realFetch(input, init);
  const auth = new Headers(init?.headers).get("authorization") ?? "";
  const user = auth.startsWith("Bearer dev:") ? `dev-${decodeURIComponent(auth.slice(11))}` : undefined;
  const res = await route(repo, (init?.method ?? "GET").toUpperCase(), path.split("?")[0], user, init?.body as string | undefined);
  return new Response(JSON.stringify(res.body), { status: res.status, headers: { "content-type": "application/json" } });
};

function DemoBanner() {
  return (
    <div className="demo-banner no-print">
      デモ版：データはこの端末のブラウザ内だけに保存されます。偏差値の比較相手は架空の受験者{SEED_USERS}人です。ログインは画面右上から（任意の名前で試せます）。
    </div>
  );
}

Promise.all([loadConfig(), seed()]).then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MemoryRouter>
        <DemoBanner />
        <App />
      </MemoryRouter>
    </StrictMode>,
  );
});
