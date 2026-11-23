// 志望校データ（content/admissions.ts）の検索・表示用ヘルパー
import { ADMISSIONS, findTarget, firstExamDate, type Admission, type Faculty, type TargetRef } from "../../content/admissions";

export type { TargetRef };
export { ADMISSIONS, findTarget, firstExamDate };

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** 2027-02-14 → 2月14日（日） */
export function jpDate(date: string, withYear = false) {
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  const md = `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;
  return withYear ? `${d.getFullYear()}年${md}` : md;
}

/** 2027-02-24T10:00 → 2月24日（水）10:00 */
export function jpDateTime(dt: string) {
  return `${jpDate(dt)}${dt.length > 10 ? ` ${dt.slice(11, 16)}` : ""}`;
}

export interface FacultyHit {
  admission: Admission;
  faculty: Faculty;
  /** この学部の模試がある */
  hasMock: boolean;
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

/** 「慶應 商」「SFC」「けいおう ほう」などで学部を探す。空なら全件（模試がある学部を先頭） */
export function searchFaculties(query: string): FacultyHit[] {
  const tokens = query.normalize("NFKC").toLowerCase().split(/[\s、,]+/).filter(Boolean);
  const hits: FacultyHit[] = [];
  for (const admission of ADMISSIONS)
    for (const faculty of admission.faculties) {
      const hay = [admission.name, admission.shortName, ...admission.aliases, faculty.name, faculty.department, ...faculty.aliases].map(norm);
      if (tokens.every((t) => hay.some((h) => h.includes(norm(t)))))
        hits.push({ admission, faculty, hasMock: faculty.mockExamIds.length > 0 /* 模試の存在は npm run validate が保証する。問題データ（正解入り）を画面のコードに含めないため参照しない */ });
    }
  return hits.sort((a, b) => Number(b.hasMock) - Number(a.hasMock));
}

export function targetName(t: TargetRef, short = false) {
  const r = findTarget(t);
  if (!r) return "（不明な志望校）";
  const uni = short ? r.admission.shortName : r.admission.name;
  if (r.admission.kind === "common-test") return uni;
  return `${uni} ${r.faculty.name}${r.faculty.methods.length > 1 ? `（${r.method.name.replace(/（.*）/, "")}）` : ""}`;
}

/** 第1志望の最初の試験日（なければ手入力の受験日） */
export function primaryExamDate(targets: TargetRef[] | undefined, fallback?: string) {
  const r = targets?.[0] && findTarget(targets[0]);
  return r ? firstExamDate(r.faculty) : fallback;
}

/** 今日以降で一番近い出願関連の締切 */
export function nextDeadline(t: TargetRef | undefined, today = new Date()) {
  const r = t && findTarget(t);
  if (!r?.admission.application) return undefined;
  const now = today.getTime();
  return r.admission.application.find((a) => new Date(a.end.length > 10 ? a.end : `${a.end}T23:59`).getTime() >= now);
}
