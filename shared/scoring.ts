import {
  CATEGORY_LABELS,
  type Answers,
  type Category,
  type Exam,
  type ExamWithKey,
  type PartScore,
  type Question,
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
      for (const q of group.questions) {
        const ok = isCorrect(q, answers[q.id]);
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
      groups: s.groups.map((g) => ({
        ...g,
        questions: g.questions.map(({ answer: _a, explanation: _e, ...q }) => q),
      })),
    })),
  };
}
