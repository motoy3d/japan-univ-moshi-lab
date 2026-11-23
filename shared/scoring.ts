import {
  CATEGORY_LABELS,
  type Answers,
  type Category,
  type Exam,
  type ExamWithKey,
  type PartScore,
  type Question,
  type QuestionGroup,
  type QuestionResult,
  type QuestionWithKey,
} from "./types";

export function allQuestions<Q>(exam: Exam<Q>): Q[] {
  return exam.sections.flatMap((s) => s.groups.flatMap((g) => g.questions));
}

/** 記述解答の正規化（大文字小文字・前後空白・全角英字・末尾ピリオド、人名の区切り「・」「=」の有無を吸収） */
export function normalizeWritten(s: string): string {
  return s
    .normalize("NFKC")
    .trim()
    .replace(/[.。]+$/, "")
    .replace(/[・=゠·]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isCorrect(q: QuestionWithKey, value: Answers[string]): boolean {
  if (q.selfGrade) return false; // 論述は自動採点しない（自己採点）
  if (value === null || value === undefined || value === "") return false;
  if (q.kind === "mark") return Number(value) === q.answer;
  const accepted = (q.answer as string[]).map(normalizeWritten);
  return accepted.includes(normalizeWritten(String(value)));
}

/** 語群の同じ語を二回以上使った設問の ID（wordForms がある設問グループのみ） */
export function reusedWords(group: QuestionGroup<QuestionWithKey>, answers: Answers): Set<string> {
  const out = new Set<string>();
  if (!group.wordForms) return out;
  const formToWord = new Map<string, string>();
  for (const [word, forms] of Object.entries(group.wordForms)) for (const f of forms) formToWord.set(normalizeWritten(f), word);
  const byWord = new Map<string, string[]>();
  for (const q of group.questions) {
    const v = answers[q.id];
    if (q.kind !== "write" || v === undefined || v === null || v === "") continue;
    const word = formToWord.get(normalizeWritten(String(v)));
    if (word) byWord.set(word, [...(byWord.get(word) ?? []), q.id]);
  }
  for (const ids of byWord.values()) if (ids.length > 1) ids.forEach((id) => out.add(id));
  return out;
}

export interface ScoreResult {
  score: number;
  maxScore: number;
  results: QuestionResult[];
  sections: PartScore[];
  categories: PartScore[];
}

export function scoreExam(exam: ExamWithKey, answers: Answers): ScoreResult {
  const results: QuestionResult[] = [];
  const sections: PartScore[] = [];
  const catMap = new Map<Category, PartScore>();
  let score = 0;
  let maxScore = 0;

  for (const section of exam.sections) {
    const part: PartScore = {
      key: section.label,
      label: `大問${section.label}`,
      score: 0,
      max: 0,
      correct: 0,
      total: 0,
    };
    for (const group of section.groups) {
      const reused = reusedWords(group, answers);
      for (const q of group.questions) {
        // 論述（自己採点）は自動採点の得点・満点・分野別の集計に入れない
        if (q.selfGrade) {
          results.push({ id: q.id, correct: false, earned: 0 });
          continue;
        }
        // 同じ語を二回以上使った解答は、正しい形でも得点にしない（本番の注意書きどおり）
        const ok = isCorrect(q, answers[q.id]) && !reused.has(q.id);
        const earned = ok ? q.points : 0;
        results.push({ id: q.id, correct: ok, earned });
        part.score += earned;
        part.max += q.points;
        part.total += 1;
        if (ok) part.correct += 1;

        let cat = catMap.get(q.category);
        if (!cat) {
          cat = {
            key: q.category,
            label: CATEGORY_LABELS[q.category],
            score: 0,
            max: 0,
            correct: 0,
            total: 0,
          };
          catMap.set(q.category, cat);
        }
        cat.score += earned;
        cat.max += q.points;
        cat.total += 1;
        if (ok) cat.correct += 1;
      }
    }
    score += part.score;
    maxScore += part.max;
    sections.push(part);
  }
  return { score, maxScore, results, sections, categories: [...catMap.values()] };
}

/** 受験前クライアント向けに正解・解説を取り除く */
export function stripAnswers(exam: ExamWithKey): Exam<Question> {
  return {
    ...exam,
    sections: exam.sections.map((s) => ({
      ...s,
      groups: s.groups.map(({ wordForms: _w, ...g }) => ({
        ...g,
        questions: g.questions.map(({ answer: _a, explanation: _e, ...q }) => q),
      })),
    })),
  };
}

/** 共通の選択肢（語群）の表示番号。choiceStart があれば 11 から、なければ 1 から */
export function choiceNumber(group: Pick<QuestionGroup, "choiceStart"> | undefined, index: number): number {
  return (group?.choiceStart ?? 1) + index - 1;
}

/** 語群の表示番号（例: 36）から、選択肢の位置（1始まり）を求める。範囲外なら null */
export function choiceIndexFromNumber(group: Pick<QuestionGroup, "choiceStart" | "choices">, num: number): number | null {
  const i = num - (group.choiceStart ?? 1) + 1;
  return Number.isInteger(i) && i >= 1 && i <= (group.choices?.length ?? 0) ? i : null;
}

/** 2桁の語群番号で答える形式（マークシートで1問2列）を含むか */
export function usesTwoDigitMarks(exam: Exam<unknown>): boolean {
  return exam.sections.some((s) => s.groups.some((g) => g.choiceStart !== undefined && g.choiceStart >= 10));
}

/**
 * マークシートの解答欄の割り当て。ふつうは1問1列、2桁の語群番号で答える設問は1問2列（十の位・一の位）。
 * 列番号は 1 から通しで振る。
 */
export function markColumns<Q extends Question>(exam: Exam<Q>): { q: Q; group: QuestionGroup<Q>; cols: number[] }[] {
  const out: { q: Q; group: QuestionGroup<Q>; cols: number[] }[] = [];
  let col = 0;
  for (const s of exam.sections)
    for (const g of s.groups)
      for (const q of g.questions) {
        if (q.kind !== "mark") continue;
        const two = !q.choices && g.choiceStart !== undefined && g.choiceStart >= 10;
        const cols = two ? [col + 1, col + 2] : [col + 1];
        col += cols.length;
        out.push({ q, group: g, cols });
      }
  return out;
}

/** 自動採点の満点（論述など自己採点の設問を除く） */
export function autoMaxScore(exam: Exam<Question>): number {
  return allQuestions(exam).reduce((s, q) => s + (q.selfGrade ? 0 : q.points), 0);
}

/** 画面・印刷での設問番号の表記（記述は (a) などのラベル） */
export function questionLabel(q: Pick<Question, "no" | "label">) {
  return q.label ?? String(q.no);
}
