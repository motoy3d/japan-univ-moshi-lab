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

/** 記述解答の正規化（大文字小文字・前後空白・全角英字・末尾ピリオドを吸収） */
export function normalizeWritten(s: string): string {
  return s
    .normalize("NFKC")
    .trim()
    .replace(/[.。]+$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isCorrect(q: QuestionWithKey, value: Answers[string]): boolean {
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

/** 画面・印刷での設問番号の表記（記述は (a) などのラベル） */
export function questionLabel(q: Pick<Question, "no" | "label">) {
  return q.label ?? String(q.no);
}
