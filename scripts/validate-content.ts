// 模試データの整合性チェック: npm run validate
import { EXAMS } from "../content/index";
import { allQuestions } from "../shared/scoring";
import { CATEGORY_LABELS } from "../shared/types";
import { ADMISSIONS } from "../content/admissions";
import { findExam } from "../content/index";

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

  const tokensOf = (paras: string[] | undefined) => {
    const text = (paras ?? []).join("\n");
    return {
      marks: [...text.matchAll(/\{\{([bu]):(\d+)(?:\|[^}]*)?\}\}/g)].map((m) => Number(m[2])),
      writes: [...text.matchAll(/\{\{w:([a-z]+)\}\}/g)].map((m) => m[1]),
    };
  };
  for (const section of exam.sections) {
    const secTokens = tokensOf(section.passage?.paragraphs);
    const allMarkTokens = [...secTokens.marks];
    const allWriteTokens = [...secTokens.writes];
    for (const group of section.groups) {
      const gTokens = tokensOf(group.passage?.paragraphs);
      allMarkTokens.push(...gTokens.marks);
      allWriteTokens.push(...gTokens.writes);
      const tokens = [...secTokens.marks, ...gTokens.marks];
      const hasPassage = !!(section.passage || group.passage);
      for (const q of group.questions) {
        const choices = q.choices ?? group.choices;
        if (q.kind === "mark") {
          if (!choices?.length) fail(exam.id, `${q.id}: 選択肢がない`);
          else if (typeof q.answer !== "number" || q.answer < 1 || q.answer > choices.length)
            fail(exam.id, `${q.id}: 正解番号 ${q.answer} が選択肢の範囲外`);
          if (choices && new Set(choices).size !== choices.length) fail(exam.id, `${q.id}: 選択肢が重複`);
          // 設問文がない設問は本文中の空所・下線部と対応していること
          if (!q.prompt && hasPassage && !tokens.includes(q.no))
            fail(exam.id, `${q.id}: 本文に空所 {{b:${q.no}}} が見つからない`);
          // 下線部の設問は本文に下線部があること
          if (q.prompt?.includes(`underlined (${q.no})`) && !tokens.includes(q.no))
            fail(exam.id, `${q.id}: 本文に下線部 {{u:${q.no}|...}} が見つからない`);
        } else {
          if (!Array.isArray(q.answer) || q.answer.length === 0) fail(exam.id, `${q.id}: 記述の許容解答が空`);
          if (hasPassage && q.label && !allWriteTokens.includes(q.label) && !secTokens.writes.includes(q.label))
            fail(exam.id, `${q.id}: 本文に記述の空所 {{w:${q.label}}} が見つからない`);
        }
        if (!q.explanation) fail(exam.id, `${q.id}: 解説がない`);
        if (!(q.category in CATEGORY_LABELS)) fail(exam.id, `${q.id}: 未定義の分野 ${q.category}`);
      }
      if (group.wordBox) {
        const writes = group.questions.filter((q) => q.kind === "write");
        if (group.wordBox.length !== writes.length) fail(exam.id, `大問${section.label}: 語群の語数（${group.wordBox.length}）と設問数（${writes.length}）が違う`);
      }
      if (group.choices) {
        const answers = group.questions.map((q) => q.answer);
        if (new Set(answers).size !== answers.length) fail(exam.id, `大問${section.label}: 共通選択肢の正解が重複`);
      }
    }
    const secQs = section.groups.flatMap((g) => g.questions);
    for (const t of allMarkTokens)
      if (!secQs.some((q) => q.kind === "mark" && q.no === t)) fail(exam.id, `大問${section.label}: 本文の番号 ${t} に対応する設問がない`);
    for (const t of allWriteTokens)
      if (!secQs.some((q) => q.kind === "write" && q.label === t)) fail(exam.id, `大問${section.label}: 本文の記述空所 ${t} に対応する設問がない`);
    if (new Set(allMarkTokens).size !== allMarkTokens.length) fail(exam.id, `大問${section.label}: 本文の番号が重複`);
  }
  console.log(`✓ ${exam.id}: マーク ${qs.filter((q) => q.kind === "mark").length} 問 / 記述 ${qs.filter((q) => q.kind === "write").length} 問 / ${total} 点`);
}
// 志望校データ: 日付の形式・模試 ID の存在・年度切れ
const DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
const today = new Date().toISOString().slice(0, 10);
for (const a of ADMISSIONS) {
  for (const f of a.faculties) {
    if (!f.stages.length) fail(a.id, `${f.id}: 試験日がない`);
    for (const st of f.stages) {
      if (!DATE.test(st.date) || (st.result && !DATE.test(st.result))) fail(a.id, `${f.id}: 日付の形式が不正`);
      for (const pd of st.periods) if (!/^\d{1,2}:\d{2}$/.test(pd.start) || !/^\d{1,2}:\d{2}$/.test(pd.end)) fail(a.id, `${f.id}: 時刻の形式が不正`);
    }
    for (const id of f.mockExamIds) if (!findExam(id)) fail(a.id, `${f.id}: 模試 ${id} が存在しない`);
    if (!f.methods.length) fail(a.id, `${f.id}: 受験方式がない`);
  }
  const last = a.faculties.flatMap((f) => f.stages.map((st) => st.date)).sort().at(-1)!;
  if (last < today) console.warn(`⚠ [${a.id}] ${a.year}年度の日程はすべて終了しています。新年度の要項で更新してください（出典: ${a.source.url}）`);
  console.log(`✓ ${a.id}: ${a.year}年度 ${a.faculties.length}学部（${a.source.checkedAt} 確認）`);
}

if (errors) {
  console.error(`${errors} 件のエラー`);
  process.exit(1);
}
