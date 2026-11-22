// 模試データの整合性チェック: npm run validate
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXAMS } from "../content/index";
import { allQuestions, normalizeWritten } from "../shared/scoring";
import { CATEGORY_LABELS } from "../shared/types";
import { ADMISSIONS } from "../content/admissions";
import { findExam } from "../content/index";

let errors = 0;
const here = path.dirname(fileURLToPath(import.meta.url));

interface Profile {
  totalPoints: number;
  durationMin: number;
  markQuestions: number;
  writeQuestions: number;
  choicesPerMark: number;
  longPassages: { sections: string[]; wordsEach: [number, number]; wordsTotal: [number, number]; questionTypes: Record<string, [number, number]> };
  sections: { label: string; kind: string; mark: [number, number]; write: number; words?: [number, number]; wordsEach?: [number, number] }[];
}

const countWords = (paras: string[] = []) =>
  paras.join(" ").replace(/\{\{[buw]:\w+\|?/g, " ").replace(/\}\}/g, " ").split(/\s+/).filter(Boolean).length;
const inRange = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;

function checkProfile(exam: (typeof EXAMS)[number], qs: ReturnType<typeof allQuestions<(typeof EXAMS)[number]["sections"][number]["groups"][number]["questions"][number]>>) {
  const file = path.join(here, "../content/profiles", `${exam.profile}.json`);
  if (!fs.existsSync(file)) return fail(exam.id, `プロファイル ${exam.profile} が見つからない`);
  const pr: Profile = JSON.parse(fs.readFileSync(file, "utf8"));
  const tag = `プロファイル ${exam.profile}`;
  if (exam.totalPoints !== pr.totalPoints || exam.durationMin !== pr.durationMin) fail(exam.id, `${tag}: 配点・試験時間が違う`);
  const marks = qs.filter((q) => q.kind === "mark"), writes = qs.filter((q) => q.kind === "write");
  if (marks.length !== pr.markQuestions || writes.length !== pr.writeQuestions)
    fail(exam.id, `${tag}: 設問数 マーク${marks.length}/記述${writes.length}（基準 ${pr.markQuestions}/${pr.writeQuestions}）`);
  for (const q of marks) if (q.choices?.length !== pr.choicesPerMark) fail(exam.id, `${tag}: ${q.id} の選択肢が${pr.choicesPerMark}つでない`);
  if (exam.sections.map((s) => s.label).join(",") !== pr.sections.map((s) => s.label).join(","))
    return fail(exam.id, `${tag}: 大問の並びが違う`);
  let longTotal = 0;
  const typeCount: Record<string, number> = {};
  pr.sections.forEach((ps, i) => {
    const s = exam.sections[i];
    const sq = s.groups.flatMap((g) => g.questions);
    const m = sq.filter((q) => q.kind === "mark").length, w = sq.filter((q) => q.kind === "write").length;
    if (!inRange(m, ps.mark) || w !== ps.write) fail(exam.id, `${tag}: 大問${s.label} の設問数 ${m}/${w}`);
    if (ps.kind === "long") {
      const wc = countWords(s.passage?.paragraphs);
      longTotal += wc;
      if (!inRange(wc, pr.longPassages.wordsEach)) fail(exam.id, `${tag}: 大問${s.label} の語数 ${wc}（基準 ${pr.longPassages.wordsEach.join("〜")}）`);
      if (s.groups.length !== 2 || s.groups[0].questions.some((q) => q.prompt) || s.groups[1].questions.some((q) => !q.prompt))
        fail(exam.id, `${tag}: 大問${s.label} は (i) 空所 → (ii) その他 の2グループにする`);
      for (const q of sq) {
        const k = q.category === "logic" || q.category === "vocab" ? "logic+vocab" : q.category;
        typeCount[k] = (typeCount[k] ?? 0) + 1;
      }
    }
    if (ps.words && !inRange(countWords(s.passage?.paragraphs), ps.words)) fail(exam.id, `${tag}: 大問${s.label} の語数が基準外`);
    if (ps.wordsEach) for (const g of s.groups) if (!inRange(countWords(g.passage?.paragraphs), ps.wordsEach)) fail(exam.id, `${tag}: 大問${s.label} の短文の語数が基準外（${countWords(g.passage?.paragraphs)}語）`);
  });
  if (!inRange(longTotal, pr.longPassages.wordsTotal)) fail(exam.id, `${tag}: 長文の総語数 ${longTotal}`);
  for (const [k, range] of Object.entries(pr.longPassages.questionTypes))
    if (!inRange(typeCount[k] ?? 0, range)) fail(exam.id, `${tag}: 長文の設問の種類 ${k} が ${typeCount[k] ?? 0} 問（基準 ${range.join("〜")}）`);
  console.log(`  ↳ ${tag} に適合（長文 計${longTotal}語、設問の種類 ${Object.entries(typeCount).map(([k, v]) => `${k}:${v}`).join(" ")}）`);
}
const fail = (examId: string, msg: string) => {
  errors++;
  console.error(`✗ [${examId}] ${msg}`);
};

/** 大問演習: 各大問がプロファイルの同じ大問の形式に合っているか（設問数・語数・(i)/(ii) の構成） */
function checkPracticeProfile(exam: (typeof EXAMS)[number]) {
  const file = path.join(here, "../content/profiles", `${exam.profile}.json`);
  if (!fs.existsSync(file)) return fail(exam.id, `プロファイル ${exam.profile} が見つからない`);
  const pr: Profile = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!exam.practiceType) fail(exam.id, "practiceType（一覧の表示名）がない");
  for (const s of exam.sections) {
    const ps = pr.sections.find((x) => x.label === s.label);
    if (!ps) {
      fail(exam.id, `大問${s.label} がプロファイルにない`);
      continue;
    }
    const sq = s.groups.flatMap((g) => g.questions);
    const m = sq.filter((q) => q.kind === "mark").length, w = sq.filter((q) => q.kind === "write").length;
    if (!inRange(m, ps.mark) || w !== ps.write) fail(exam.id, `大問${s.label} の設問数 ${m}/${w}（基準 ${ps.mark.join("〜")}/${ps.write}）`);
    if (ps.kind === "long") {
      const wc = countWords(s.passage?.paragraphs);
      if (!inRange(wc, pr.longPassages.wordsEach)) fail(exam.id, `大問${s.label} の語数 ${wc}（基準 ${pr.longPassages.wordsEach.join("〜")}）`);
      if (s.groups.length !== 2 || s.groups[0].questions.some((q) => q.prompt) || s.groups[1].questions.some((q) => !q.prompt))
        fail(exam.id, `大問${s.label} は (i) 空所 → (ii) その他 の2グループにする`);
    }
    if (ps.words && !inRange(countWords(s.passage?.paragraphs), ps.words)) fail(exam.id, `大問${s.label} の語数が基準外`);
    if (ps.wordsEach) for (const g of s.groups) if (!inRange(countWords(g.passage?.paragraphs), ps.wordsEach)) fail(exam.id, `大問${s.label} の短文の語数が基準外（${countWords(g.passage?.paragraphs)}語）`);
  }
  console.log(`  ↳ 大問演習（${exam.practiceType}）: プロファイル ${exam.profile} の大問 ${exam.sections.map((s) => s.label).join("・")} に適合`);
}

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
      if (group.wordForms) {
        const keys = Object.keys(group.wordForms).sort().join(",");
        if (keys !== [...(group.wordBox ?? [])].sort().join(",")) fail(exam.id, `大問${section.label}: wordForms の語が語群と一致しない`);
        // 正解の語形はすべて、いずれかの語の語形として登録されていること（二回使用の判定が効くように）
        const forms = new Set(Object.values(group.wordForms).flat().map(normalizeWritten));
        for (const q of group.questions)
          if (q.kind === "write") for (const a of q.answer as string[]) if (!forms.has(normalizeWritten(a))) fail(exam.id, `${q.id}: 正解 ${a} が wordForms にない`);
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
  // 入試プロファイルへの適合（content/profiles/<profile>.json）
  if (exam.profile && exam.kind === "practice") checkPracticeProfile(exam);
  else if (exam.profile) checkProfile(exam, qs);

  // 正解の位置の偏り（4択で一つの番号に集中すると、当て推量で点が取れてしまう）
  const four = qs.filter((q) => q.kind === "mark" && (q.choices?.length ?? 0) === 4);
  const counts = [1, 2, 3, 4].map((n) => four.filter((q) => q.answer === n).length);
  if (four.length >= 20 && counts.some((c) => c === 0 || c / four.length > 0.4))
    fail(exam.id, `正解の位置が偏っている（1〜4: ${counts.join(" / ")}）`);
  console.log(`✓ ${exam.id}: マーク ${qs.filter((q) => q.kind === "mark").length} 問 / 記述 ${qs.filter((q) => q.kind === "write").length} 問 / ${total} 点`);
}
// 模試と大問演習の重複: 同じ英文（本文・選択肢）が別の試験に出ていないか（演習で解いた英文が模試に再掲されると初見でなくなる）
{
  const N = 8;
  const grams = new Map<string, string>();
  const textOf = (e: (typeof EXAMS)[number]) =>
    e.sections.flatMap((s) => [
      ...(s.passage?.paragraphs ?? []),
      // 設問文（Which one of the following ... などの定型）は除き、本文と選択肢を比べる
      ...s.groups.flatMap((g) => [...(g.passage?.paragraphs ?? []), ...g.questions.flatMap((q) => q.choices ?? [])]),
    ]);
  for (const e of EXAMS) {
    const words = textOf(e)
      .join(" ")
      .replace(/\{\{[buw]:\w+\|?/g, " ")
      .toLowerCase()
      .replace(/[^a-z' ]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const seen = new Set<string>();
    let reported = 0;
    for (let i = 0; i + N <= words.length; i++) {
      const g = words.slice(i, i + N).join(" ");
      if (seen.has(g)) continue;
      seen.add(g);
      const other = grams.get(g);
      if (other && other !== e.id && reported++ < 3) fail(e.id, `${other} と同じ英文が出ている: 「${g}」`);
      if (!other) grams.set(g, e.id);
    }
  }
  console.log(`✓ 試験間の重複なし（${EXAMS.length}件、${N}語連続一致で検査）`);
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
