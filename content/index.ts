// 模試データの登録簿。新しい模試を追加したらここに1行足す。
import type { ExamWithKey } from "../shared/types";
import keioShogakuEigo01 from "./exams/keio-shogaku-eigo-01.json";
import keioShogakuEigo02 from "./exams/keio-shogaku-eigo-02.json";

export const EXAMS: ExamWithKey[] = [keioShogakuEigo01 as ExamWithKey, keioShogakuEigo02 as ExamWithKey];

export function findExam(id: string): ExamWithKey | undefined {
  return EXAMS.find((e) => e.id === id);
}
