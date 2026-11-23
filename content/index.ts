// 模試データの登録簿。新しい模試・大問演習を追加したらここに1行足す。
// 大問演習（content/practice）の問題は模試には再掲しない（npm run validate が重複を検査する）。
import type { ExamWithKey } from "../shared/types";
import keioShogakuEigo01 from "./exams/keio-shogaku-eigo-01.json";
import keioShogakuEigo02 from "./exams/keio-shogaku-eigo-02.json";
import keioShogakuSekaishi01 from "./exams/keio-shogaku-sekaishi-01.json";
import keioShogakuEigoP01 from "./practice/keio-shogaku-eigo-p01.json";
import keioShogakuEigoP02 from "./practice/keio-shogaku-eigo-p02.json";
import keioShogakuEigoP03 from "./practice/keio-shogaku-eigo-p03.json";
import keioShogakuEigoP04 from "./practice/keio-shogaku-eigo-p04.json";
import keioShogakuEigoP05 from "./practice/keio-shogaku-eigo-p05.json";
import keioShogakuEigoP06 from "./practice/keio-shogaku-eigo-p06.json";

const MOCKS = [keioShogakuEigo01, keioShogakuEigo02, keioShogakuSekaishi01] as ExamWithKey[];
const PRACTICE = [keioShogakuEigoP01, keioShogakuEigoP02, keioShogakuEigoP03, keioShogakuEigoP04, keioShogakuEigoP05, keioShogakuEigoP06] as ExamWithKey[];

export const EXAMS: ExamWithKey[] = [...MOCKS, ...PRACTICE];

export function findExam(id: string): ExamWithKey | undefined {
  return EXAMS.find((e) => e.id === id);
}
