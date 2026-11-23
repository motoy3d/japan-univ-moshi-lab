import { test } from "node:test";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { EXAMS } from "../content/index";
import { allQuestions, scoreExam, stripAnswers } from "../shared/scoring";
import { readAnswerSheets } from "../api/src/photo-reader";

test("すべての模試・演習: 正解どおりに答えると満点、受験前のデータに正解・解説が含まれない", () => {
  for (const exam of EXAMS) {
    const answers = Object.fromEntries(allQuestions(exam).map((q) => [q.id, q.kind === "mark" ? (q.answer as number) : (q.answer as string[])[0]]));
    assert.equal(scoreExam(exam, answers).score, exam.totalPoints, exam.id);
    const json = JSON.stringify(stripAnswers(exam));
    assert.ok(!/"answer"|"explanation"|"wordForms"/.test(json), `${exam.id}: 受験前データに正解が含まれる`);
  }
});

/** Claude の応答を差し替えた偽のクライアント */
function fakeClient(parsed: unknown, stop = "end_turn"): Anthropic {
  return { beta: { messages: { parse: async () => ({ stop_reason: stop, parsed_output: parsed }) } } } as unknown as Anthropic;
}

test("撮影採点の読み取り: 設問一覧に合わせて整え、範囲外・欠けた行は自信なしにする", async () => {
  const r = await readAnswerSheets(
    fakeClient({
      marks: [
        { no: 1, choice: 3, confidence: "high" },
        { no: 2, choice: 9, confidence: "high" }, // 範囲外の番号
        { no: 99, choice: 1, confidence: "high" }, // 存在しない設問
      ],
      writes: [{ label: "(a)", text: "  Relied ", confidence: "high" }],
      note: "",
    }),
    "keio-shogaku-eigo-p05",
    ["QUJD"],
  );
  assert.equal(r.marks.length, 0); // 記述だけの演習
  assert.equal(r.writes.length, 11);
  assert.deepEqual(r.writes[0], { label: "a", text: "Relied", confidence: "high" });
  assert.equal(r.writes[1].confidence, "low"); // 読み取り結果に無い欄

  const m = await readAnswerSheets(fakeClient({ marks: [{ no: 1, choice: 3, confidence: "high" }, { no: 2, choice: 9, confidence: "high" }], writes: [], note: "一部がぼけています" }), "keio-shogaku-eigo-01", ["QUJD"]);
  assert.equal(m.marks.length, 46);
  assert.deepEqual(m.marks[0], { no: 1, choice: 3, confidence: "high" });
  assert.deepEqual(m.marks[1], { no: 2, choice: null, confidence: "low" });
  assert.equal(m.marks[2].confidence, "low");
  assert.equal(m.note, "一部がぼけています");
});

test("撮影採点の読み取り: 拒否・解釈不能はエラーにする（ジョブは FAILED になる）", async () => {
  await assert.rejects(readAnswerSheets(fakeClient(null, "refusal"), "keio-shogaku-eigo-01", ["QUJD"]));
  await assert.rejects(readAnswerSheets(fakeClient(null), "keio-shogaku-eigo-01", ["QUJD"]));
});
