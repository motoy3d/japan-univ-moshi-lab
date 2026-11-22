// 模試データの整合性チェック: npm run validate
import { EXAMS } from "../content/index";
import { allQuestions } from "../shared/scoring";

let errors = 0;
const fail = (examId: string, msg: string) => {
  errors++;
  console.error(`✗ [${examId}] ${msg}`);
};

for (const exam of EXAMS) {
  const qs = allQuestions(exam);
  const ids = new Set<string>();
  for (const q of qs) {
    if (ids.has(q.id)) fail(exam.id, `問題IDが重複: ${q.id}`);
    ids.add(q.id);
  }
  // 解答番号が 1 から連番か
  for (const kind of ["mark", "write"] as const) {
    const nos = qs.filter((q) => q.kind === kind).map((q) => q.no);
    nos.forEach((n, i) => {
      if (n !== i + 1) fail(exam.id, `${kind} の解答番号が連番でない: ${i + 1} の位置に ${n}`);
    });
  }
  const total = qs.reduce((s, q) => s + q.points, 0);
  if (total !== exam.totalPoints) fail(exam.id, `配点合計 ${total} ≠ 満点 ${exam.totalPoints}`);

  for (const section of exam.sections) {
    const text = section.passage?.paragraphs.join("\n") ?? "";
    const tokens = [...text.matchAll(/\{\{([bu]):(\d+)(?:\|[^}]*)?\}\}/g)].map((m) => Number(m[2]));
    for (const group of section.groups) {
      for (const q of group.questions) {
        const choices = q.choices ?? group.choices;
        if (q.kind === "mark") {
          if (!choices?.length) fail(exam.id, `${q.id}: 選択肢がない`);
          else if (typeof q.answer !== "number" || q.answer < 1 || q.answer > choices.length)
            fail(exam.id, `${q.id}: 正解番号 ${q.answer} が選択肢の範囲外`);
          // 空所・下線部が本文にあるなら、設問番号と対応しているか
          if (!q.prompt && section.passage && !tokens.includes(q.no) && group.choices === undefined && q.category !== "main-idea" && q.category !== "paraphrase")
            fail(exam.id, `${q.id}: 本文に空所 {{b:${q.no}}} が見つからない`);
        } else if (!Array.isArray(q.answer) || q.answer.length === 0) {
          fail(exam.id, `${q.id}: 記述の許容解答が空`);
        }
        if (!q.explanation) fail(exam.id, `${q.id}: 解説がない`);
      }
      if (group.choices) {
        const answers = group.questions.map((q) => q.answer);
        if (new Set(answers).size !== answers.length) fail(exam.id, `大問${section.label}: 共通選択肢の正解が重複`);
      }
    }
    for (const t of tokens) {
      if (!qs.some((q) => q.kind === "mark" && q.no === t))
        fail(exam.id, `大問${section.label}: 本文の番号 ${t} に対応する設問がない`);
    }
  }
  console.log(`✓ ${exam.id}: マーク ${qs.filter((q) => q.kind === "mark").length} 問 / 記述 ${qs.filter((q) => q.kind === "write").length} 問 / ${total} 点`);
}
if (errors) {
  console.error(`${errors} 件のエラー`);
  process.exit(1);
}
