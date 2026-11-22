import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMITS, route } from "../api/src/app";
import { MemoryRepo } from "../api/src/repo-memory";
import { findExam } from "../content/index";
import { allQuestions } from "../shared/scoring";
import type { Answers } from "../shared/types";
import type { AdminSummary, ItemStat } from "../api/src/admin";

const exam = findExam("keio-shogaku-eigo-p03")!; // 大問演習（文法・中文）
const perfect: Answers = Object.fromEntries(allQuestions(exam).map((q) => [q.id, q.answer as number]));
const guest = (repo: MemoryRepo, clientId: string, answers: Answers, ip = "203.0.113.1") =>
  route(repo, "POST", "/api/guest/attempts", undefined, JSON.stringify({ examId: exam.id, answers, durationSec: 900, mode: "web", clientId }), {}, { ip });

test("管理API: admin グループ以外は 403、未ログインは 401", async () => {
  const repo = new MemoryRepo();
  assert.equal((await route(repo, "GET", "/api/admin/summary", undefined, undefined)).status, 401);
  assert.equal((await route(repo, "GET", "/api/admin/summary", "u1", undefined)).status, 403);
  assert.equal((await route(repo, "GET", "/api/admin/feedback", "u1", undefined, {}, { admin: false })).status, 403);
  assert.equal((await route(repo, "GET", "/api/admin/summary", "op", undefined, {}, { admin: true })).status, 200);
});

test("管理API: 2回目受験率・満足度・設問別の正答率と選択の分布", async () => {
  const repo = new MemoryRepo();
  await guest(repo, "device-aaaa1", perfect);
  await guest(repo, "device-aaaa1", {}); // 同じ端末の2回目
  await guest(repo, "device-bbbb2", { m1: perfect.m1 });
  await route(repo, "POST", "/api/feedback", undefined, JSON.stringify({ type: "rating", examId: exam.id, rating: 4 }));
  await route(repo, "POST", "/api/feedback", undefined, JSON.stringify({ type: "rating", examId: exam.id, rating: 2 }));
  await route(repo, "POST", "/api/feedback", undefined, JSON.stringify({ type: "question", examId: exam.id, questionId: "m2", reason: "answer" }));

  const s = (await route(repo, "GET", "/api/admin/summary", "op", undefined, {}, { admin: true })).body as AdminSummary;
  assert.equal(s.totals.attempts, 3);
  assert.equal(s.totals.takers, 2);
  assert.equal(s.totals.secondAttemptRate, 0.5);
  assert.equal(s.totals.ratingAvg, 3);
  assert.equal(s.totals.questionReports, 1);
  const row = s.byExam.find((e) => e.examId === exam.id)!;
  assert.equal(row.attempts, 3);
  assert.equal(row.reports, 1);

  const items = (await route(repo, "GET", `/api/admin/exams/${exam.id}/items`, "op", undefined, {}, { admin: true })).body as ItemStat[];
  const m1 = items.find((q) => q.id === "m1")!;
  assert.equal(m1.n, 3);
  assert.ok(Math.abs(m1.correctRate! - 2 / 3) < 1e-9);
  assert.equal(m1.choiceCounts!.reduce((a, b) => a + b, 0), 3);
  assert.equal(m1.choiceCounts![0], 1); // 無解答1件
  assert.equal(items.find((q) => q.id === "m2")!.reports, 1);
  assert.equal((await route(repo, "GET", "/api/admin/exams/nope/items", "op", undefined, {}, { admin: true })).status, 404);
});

test("回数制限: 登録なし受験は端末ごと・IPごとに1日の上限がある", async () => {
  const repo = new MemoryRepo();
  for (let i = 0; i < LIMITS.guestPerClientPerDay; i++) assert.equal((await guest(repo, "device-limit1", {})).status, 200);
  assert.equal((await guest(repo, "device-limit1", {})).status, 429);
  // 別の端末なら受けられる
  assert.equal((await guest(repo, "device-limit2", {})).status, 200);
});

test("回数制限: 意見の送信は IP ごとに1日の上限がある", async () => {
  const repo = new MemoryRepo();
  const send = () => route(repo, "POST", "/api/feedback", undefined, JSON.stringify({ type: "rating", examId: exam.id, rating: 5 }), {}, { ip: "198.51.100.9" });
  for (let i = 0; i < LIMITS.feedbackPerIpPerDay; i++) assert.equal((await send()).status, 200);
  assert.equal((await send()).status, 429);
});

test("撮影採点: サービス全体の1日の上限を超えたら受け付けない", async () => {
  const repo = new MemoryRepo();
  const services = { photo: { start: async () => undefined } };
  const body = JSON.stringify({ examId: "keio-shogaku-eigo-01", images: ["QUJD"] });
  // 全体のカウンタを上限まで進めておく
  for (let i = 0; i < LIMITS.photoTotalPerDay; i++) await repo.hit("photo:all", new Date().toISOString().slice(0, 10));
  assert.equal((await route(repo, "POST", "/api/photo-jobs", "u1", body, services)).status, 503);
});

test("登録なしの採点結果に、受験前に送らない採点専用データ（語形の表）は含めない", async () => {
  const repo = new MemoryRepo();
  const p05 = findExam("keio-shogaku-eigo-p05")!;
  const r = await route(repo, "POST", "/api/guest/attempts", undefined, JSON.stringify({ examId: p05.id, answers: {}, durationSec: 900, mode: "web", clientId: "device-forms1" }));
  // 結果画面には正解・解説が必要なので exam は返すが、受験前の GET /exams/:id には含めない
  const before = await route(repo, "GET", `/api/exams/${p05.id}`, undefined, undefined);
  const json = JSON.stringify(before.body);
  assert.ok(!json.includes("wordForms") && !json.includes("explanation"));
  assert.equal(r.status, 200);
});
