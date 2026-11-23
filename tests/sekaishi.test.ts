// 世界史（慶應商）の形式: 2桁の語群番号で答える空欄・論述の自己採点・表記ゆれの吸収
import { test } from "node:test";
import assert from "node:assert/strict";
import { findExam } from "../content/index";
import {
  allQuestions, autoMaxScore, choiceIndexFromNumber, choiceNumber, isCorrect, markColumns, normalizeWritten, scoreExam, stripAnswers, usesTwoDigitMarks,
} from "../shared/scoring";
import type { QuestionWithKey } from "../shared/types";

const exam = findExam("keio-shogaku-sekaishi-01")!;

test("世界史 第1回: 空欄は1問2列で、解答欄は (1)(2) から通しで並ぶ", () => {
  assert.ok(exam, "模試が登録されていない");
  assert.ok(usesTwoDigitMarks(exam));
  const cols = markColumns(exam);
  assert.equal(cols.length, allQuestions(exam).filter((q) => q.kind === "mark").length);
  cols.forEach((c, i) => {
    assert.deepEqual(c.cols, [2 * i + 1, 2 * i + 2]);
    assert.equal(c.q.label, `${2 * i + 1}-${2 * i + 2}`);
  });
  // 英語の模試は1問1列のまま
  const eigo = findExam("keio-shogaku-eigo-01")!;
  assert.ok(!usesTwoDigitMarks(eigo));
  assert.deepEqual(markColumns(eigo).slice(0, 2).map((c) => c.cols), [[1], [2]]);
});

test("語群の番号は 11 から。番号と選択肢の位置を相互に変換できる", () => {
  const g = exam.sections[0].groups[0];
  assert.equal(g.choiceStart, 11);
  assert.equal(choiceNumber(g, 1), 11);
  assert.equal(choiceIndexFromNumber(g, 11), 1);
  assert.equal(choiceIndexFromNumber(g, 10 + g.choices!.length), g.choices!.length);
  assert.equal(choiceIndexFromNumber(g, 11 + g.choices!.length), null);
  assert.equal(choiceIndexFromNumber(g, 5), null);
  // 2桁に収まる
  for (const s of exam.sections) assert.ok(choiceNumber(s.groups[0], s.groups[0].choices!.length) <= 99);
});

test("論述は自動採点に含めず、満点・分野別からも除く", () => {
  const essays = allQuestions(exam).filter((q) => q.selfGrade);
  assert.equal(essays.length, 3);
  const answers = Object.fromEntries(allQuestions(exam).map((q) => [q.id, q.kind === "mark" ? (q.answer as number) : (q.answer as string[])[0]]));
  const r = scoreExam(exam, answers);
  const essayPts = essays.reduce((t, q) => t + q.points, 0);
  assert.equal(r.score, exam.totalPoints - essayPts);
  assert.equal(r.maxScore, autoMaxScore(exam));
  assert.ok(!r.categories.some((c) => c.key === "wh-essay"));
  for (const q of essays) assert.deepEqual(r.results.find((x) => x.id === q.id), { id: q.id, correct: false, earned: 0 });
});

test("人名の「・」「=」の有無や全角・半角の違いは同じ答えとして扱う", () => {
  assert.equal(normalizeWritten("マルコ・ポーロ"), normalizeWritten("マルコ=ポーロ"));
  assert.equal(normalizeWritten("マルコ＝ポーロ"), normalizeWritten("マルコポーロ"));
  const q = allQuestions(exam).find((x) => (x.answer as string[])?.[0] === "マルコ=ポーロ") as QuestionWithKey;
  assert.ok(q);
  assert.ok(isCorrect(q, "マルコ・ポーロ"));
  assert.ok(isCorrect(q, "マルコ＝ポーロ"));
  assert.ok(!isCorrect(q, "マゼラン"));
});

test("受験前のデータに語群の番号の情報は残り、正解・解説は残らない", () => {
  const s = stripAnswers(exam);
  assert.equal(s.sections[0].groups[0].choiceStart, 11);
  assert.ok(!/"answer"|"explanation"/.test(JSON.stringify(s)));
});
