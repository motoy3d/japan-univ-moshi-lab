import { test } from "node:test";
import assert from "node:assert/strict";
import { BOT_GUARD, route } from "../api/src/app";
import { MemoryRepo } from "../api/src/repo-memory";
import { findExam } from "../content/index";
import { allQuestions, isCorrect, normalizeWritten, scoreExam } from "../shared/scoring";
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
  const stats = toExamStats("x", 200, { count: 4, sum: 400, sumSq: 100 ** 2 * 2 + 80 ** 2 + 120 ** 2, buckets: {}, sectionSums: {} });
  assert.equal(stats.mean, 100);
  assert.ok(Math.abs(stats.sd - Math.sqrt(200)) < 1e-9);
  assert.equal(deviationScore(100, stats), 50);
  assert.equal(deviationScore(100 + stats.sd, stats), 60);
});

test("上位%の推定", () => {
  const stats = toExamStats("x", 200, { count: 10, sum: 1000, sumSq: 110000, buckets: { 5: 5, 15: 5 }, sectionSums: {} });
  assert.equal(topPercent(100, stats), 50); // 150点台の5人だけが上
  assert.equal(topPercent(155, stats), 25); // 帯の中央 → 帯の半分が上
  assert.equal(topPercent(200, stats), 0.1);
});

test("API: 正解は受験前に返さない・提出→結果→統計", async () => {
  const repo = new MemoryRepo();
  const unauth = await route(repo, "GET", "/api/exams", undefined, undefined);
  assert.equal(unauth.status, 401);

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
  assert.ok(review.currentDeviation !== null);
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
