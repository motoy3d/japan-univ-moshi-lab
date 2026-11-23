import { test } from "node:test";
import assert from "node:assert/strict";
import { BOT_GUARD, PHOTO_DAILY_LIMIT, route } from "../api/src/app";
import { MemoryRepo } from "../api/src/repo-memory";
import { findExam } from "../content/index";
import { allQuestions, isCorrect, normalizeWritten, scoreExam, stripAnswers } from "../shared/scoring";
import { deviationScore, toExamStats, topPercent } from "../shared/stats";
import type { AttemptReview, Answers, Exam } from "../shared/types";

const exam = findExam("keio-shogaku-eigo-01")!;
const perfect: Answers = Object.fromEntries(
  allQuestions(exam).map((q) => [q.id, q.kind === "mark" ? (q.answer as number) : (q.answer as string[])[0]]),
);

test("満点の解答は200点", () => {
  const r = scoreExam(exam, perfect);
  assert.equal(r.score, 200);
  assert.equal(r.maxScore, 200);
  assert.equal(r.sections.reduce((s, p) => s + p.max, 0), 200);
});

test("記述の正規化（大文字・空白・全角・末尾ピリオド）", () => {
  assert.equal(normalizeWritten("  Merger. "), "merger");
  assert.equal(normalizeWritten("ｍｅｒｇｅｒ"), "merger");
  const w1 = allQuestions(exam).find((q) => q.id === "w1")!;
  assert.ok(isCorrect(w1, " Undergone."));
  assert.ok(!isCorrect(w1, "undergo"));
});

test("偏差値: 平均で50、+1SDで60", () => {
  // 40人（100点×20、80点×10、120点×10）
  const stats = toExamStats("x", 200, { count: 40, sum: 4000, sumSq: (100 ** 2 * 2 + 80 ** 2 + 120 ** 2) * 10, buckets: {}, sectionSums: {} });
  assert.equal(stats.mean, 100);
  assert.ok(Math.abs(stats.sd - Math.sqrt(200)) < 1e-9);
  assert.equal(deviationScore(100, stats), 50);
  assert.equal(deviationScore(100 + stats.sd, stats), 60);
});

test("上位%の推定", () => {
  const stats = toExamStats("x", 200, { count: 40, sum: 4000, sumSq: 440000, buckets: { 5: 20, 15: 20 }, sectionSums: {} });
  assert.equal(topPercent(100, stats), 50); // 150点台の5人だけが上
  assert.equal(topPercent(155, stats), 25); // 帯の中央 → 帯の半分が上
  assert.equal(topPercent(200, stats), 0.1);
});

test("API: 正解は受験前に返さない・提出→結果→統計", async () => {
  const repo = new MemoryRepo();
  // 一覧と問題は登録なしで見られるが、履歴は見られない
  assert.equal((await route(repo, "GET", "/api/exams", undefined, undefined)).status, 200);
  assert.equal((await route(repo, "GET", "/api/attempts", undefined, undefined)).status, 401);

  const ex = (await route(repo, "GET", "/api/exams/keio-shogaku-eigo-01", "u1", undefined)).body as Exam;
  const q = ex.sections[0].groups[0].questions[0] as unknown as Record<string, unknown>;
  assert.equal(q.answer, undefined);
  assert.equal(q.explanation, undefined);

  // 3人が受験（u1 は2回受験するが母集団は初回のみ）
  const submit = async (user: string, answers: Answers) =>
    (await route(repo, "POST", "/api/attempts", user, JSON.stringify({ examId: exam.id, answers, durationSec: 4000, mode: "web" }))).body as { attemptId: string };
  await submit("u1", perfect);
  await submit("u2", {});
  const half = Object.fromEntries(Object.entries(perfect).slice(0, 28));
  const { attemptId } = await submit("u3", half);
  await submit("u1", {});

  const review = (await route(repo, "GET", `/api/attempts/${attemptId}`, "u3", undefined)).body as AttemptReview;
  assert.equal(review.stats.count, 2); // u2 は白紙なので母集団に含めない
  assert.equal(review.attempt.score, 120); // I(42) + II(39) + III の (20)〜(28)(39)
  assert.equal(review.currentDeviation, null); // 30人未満は偏差値を出さない
  assert.equal(review.attempt.counted, true);

  // 他人の受験記録は見られない
  const other = await route(repo, "GET", `/api/attempts/${attemptId}`, "u1", undefined);
  assert.equal(other.status, 404);

  const mine = (await route(repo, "GET", "/api/attempts", "u1", undefined)).body as { counted: boolean }[];
  assert.equal(mine.length, 2);
  assert.deepEqual(mine.map((m) => m.counted).sort(), [false, true]);
});

test("受験IDは時刻順に並ぶ", async () => {
  const { newAttemptId } = await import("../api/src/repo");
  const a = newAttemptId(1_700_000_000_000);
  const b = newAttemptId(1_700_000_000_001);
  assert.ok(a < b);
});

test("API: 目標設定の保存と入力値の検証", async () => {
  const repo = new MemoryRepo();
  const r = await route(repo, "PUT", "/api/me", "u1", JSON.stringify({ goalDeviation: 99, examDate: "2027-02-14", nickname: "  たろう  " }));
  assert.deepEqual(r.body, { goalDeviation: 80, examDate: "2027-02-14", nickname: "たろう" });
  const bad = await route(repo, "PUT", "/api/me", "u1", JSON.stringify({ examDate: "来年" }));
  assert.deepEqual(bad.body, {});
  const got = await route(repo, "GET", "/api/me", "u2", undefined);
  assert.deepEqual(got.body, {});
});

test("ボット的な提出: 短時間・白紙は母集団に含めず、24時間の提出回数を制限", async () => {
  const repo = new MemoryRepo();
  const post = (user: string, answers: Answers, durationSec: number) =>
    route(repo, "POST", "/api/attempts", user, JSON.stringify({ examId: exam.id, answers, durationSec, mode: "web" }));
  const fast = (await post("bot", perfect, 30)).body as { attemptId: string };
  const r1 = (await route(repo, "GET", `/api/attempts/${fast.attemptId}`, "bot", undefined)).body as AttemptReview;
  assert.equal(r1.attempt.counted, false);
  assert.match(r1.attempt.excludedReason ?? "", /所要時間/);
  assert.equal(r1.stats.count, 0);
  // 初回の枠は消費されないので、まともな受験は初回として数える
  const real = (await post("bot", perfect, 3600)).body as { attemptId: string };
  const r2 = (await route(repo, "GET", `/api/attempts/${real.attemptId}`, "bot", undefined)).body as AttemptReview;
  assert.equal(r2.attempt.counted, true);
  // 24時間の上限
  for (let i = 2; i < BOT_GUARD.dailySubmitLimit; i++) await post("bot", {}, 3600);
  assert.equal((await post("bot", {}, 3600)).status, 429);
});

test("API: 志望校は公式データにあるものだけ保存できる", async () => {
  const repo = new MemoryRepo();
  const put = (body: unknown) => route(repo, "PUT", "/api/me", "u1", JSON.stringify(body));
  const okRes = await put({ targets: [{ admissionId: "keio", facultyId: "shogaku", methodId: "a" }, { admissionId: "keio", facultyId: "shogaku", methodId: "a" }, { admissionId: "kyotsu", facultyId: "main", methodId: "general" }] });
  assert.equal(okRes.status, 200);
  assert.deepEqual((okRes.body as { targets: unknown[] }).targets.length, 2); // 重複は1つにまとめる
  assert.equal((await put({ targets: [{ admissionId: "keio", facultyId: "shogaku", methodId: "z" }] })).status, 400);
});

test("語群の同じ動詞を二回使った解答は、正しい形でも得点にならない", () => {
  const qs = allQuestions(exam);
  const a = qs.find((q) => q.id === "w1")!; // (a) undergone
  const d = qs.find((q) => q.id === "w4")!; // (d) arisen
  const base: Answers = { [a.id]: "undergone", [d.id]: "arisen" };
  const ok = scoreExam(exam, base).results;
  assert.ok(ok.find((r) => r.id === a.id)!.correct && ok.find((r) => r.id === d.id)!.correct);
  // (d) にも undergo の語形を書くと、正しい (a) も得点にならない
  const twice = scoreExam(exam, { ...base, [d.id]: "underwent" }).results;
  assert.equal(twice.find((r) => r.id === a.id)!.correct, false);
  assert.equal(twice.find((r) => r.id === d.id)!.correct, false);
});

test("受験前の問題データに採点専用の語形一覧を含めない", () => {
  const json = JSON.stringify(stripAnswers(exam));
  assert.ok(!json.includes("wordForms"));
  assert.ok(!json.includes("assumptions"));
});

test("登録なし受験: 採点結果と正解・解説を返し、母集団は端末IDで1回だけ", async () => {
  const repo = new MemoryRepo();
  const post = (clientId: string, answers: Answers) =>
    route(repo, "POST", "/api/guest/attempts", undefined, JSON.stringify({ examId: exam.id, answers, durationSec: 4000, mode: "paper", clientId }));
  const r = (await post("device-0001", perfect)).body as AttemptReview;
  assert.equal(r.attempt.score, 200);
  assert.equal(r.attempt.counted, true);
  assert.equal(r.attempt.mode, "paper");
  const q = r.exam.sections[0].groups[0].questions[0];
  assert.ok(q.explanation.length > 0);
  const again = (await post("device-0001", {})).body as AttemptReview;
  assert.equal(again.attempt.counted, false);
  assert.equal(again.stats.count, 1);
  assert.equal((await post("x", perfect)).status, 400); // 端末IDの形式
});

test("ログイン後の取り込みは母集団に入れず、元の日時を残す", async () => {
  const repo = new MemoryRepo();
  const createdAt = "2026-01-15T10:00:00.000Z";
  const r = (await route(repo, "POST", "/api/attempts", "u1", JSON.stringify({ examId: exam.id, answers: perfect, durationSec: 4000, mode: "web", imported: true, createdAt }))).body as { attemptId: string };
  const rv = (await route(repo, "GET", `/api/attempts/${r.attemptId}`, "u1", undefined)).body as AttemptReview;
  assert.equal(rv.attempt.counted, false);
  assert.equal(rv.attempt.createdAt, createdAt);
  assert.equal(rv.stats.count, 0);
});

test("意見・満足度: 入力を検証して保存", async () => {
  const repo = new MemoryRepo();
  const post = (body: unknown) => route(repo, "POST", "/api/feedback", undefined, JSON.stringify(body));
  assert.equal((await post({ type: "rating", examId: exam.id, rating: 5, text: "また受けたい" })).status, 200);
  assert.equal((await post({ type: "rating", examId: exam.id, rating: 9 })).status, 400);
  assert.equal((await post({ type: "question", examId: exam.id, questionId: "m3", reason: "answer", text: "x".repeat(900) })).status, 200);
  assert.equal((await post({ type: "question", examId: exam.id, questionId: "zzz" })).status, 400);
  const saved = (repo as unknown as { data: { feedback: { text?: string }[] } }).data.feedback;
  assert.equal(saved.length, 2);
  assert.equal(saved[1].text!.length, 500);
});

test("撮影採点: ログイン必須・回数制限・この環境で使えないときは 503", async () => {
  const repo = new MemoryRepo();
  const body = JSON.stringify({ examId: exam.id, images: ["QUJD"] });
  assert.equal((await route(repo, "POST", "/api/photo-jobs", undefined, body)).status, 401);
  assert.equal((await route(repo, "POST", "/api/photo-jobs", "u1", body)).status, 503);
  const started: string[] = [];
  const services = { photo: { start: async (_u: string, job: { jobId: string }) => void started.push(job.jobId) } };
  for (let i = 0; i < PHOTO_DAILY_LIMIT; i++) assert.equal((await route(repo, "POST", "/api/photo-jobs", "u1", body, services)).status, 200);
  assert.equal((await route(repo, "POST", "/api/photo-jobs", "u1", body, services)).status, 429);
  assert.equal(started.length, PHOTO_DAILY_LIMIT);
  const job = (await route(repo, "GET", `/api/photo-jobs/${started[0]}`, "u1", undefined)).body as { status: string };
  assert.equal(job.status, "PENDING");
  assert.equal((await route(repo, "GET", `/api/photo-jobs/${started[0]}`, "u2", undefined)).status, 404);
  assert.equal((await route(repo, "POST", "/api/photo-jobs", "u2", JSON.stringify({ examId: exam.id, images: [] }), services)).status, 400);
});
