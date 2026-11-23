// 模試データとAPIで共有する型定義（api / web の両方からインポートされる）

/** 設問の分野タグ。成績分析の集計単位になる */
export type Category =
  | "logic" // 長文の空所補充（文脈・論理）
  | "vocab" // 空所補充（語彙・語法）
  | "paraphrase" // 下線部の内容説明
  | "detail" // 内容一致
  | "main-idea" // 表題・要旨
  | "inference" // 短文の内容推測
  | "grammar" // 文法・語法
  | "verb-form" // 語形変化：動詞（記述）
  | "noun-form"; // 派生語：名詞形（記述）

export const CATEGORY_LABELS: Record<Category, string> = {
  logic: "空所補充（文脈・論理）",
  vocab: "空所補充（語彙・語法）",
  paraphrase: "下線部の内容説明",
  detail: "内容一致",
  "main-idea": "表題・要旨",
  inference: "短文の内容推測",
  grammar: "文法・語法",
  "verb-form": "語形変化：動詞（記述）",
  "noun-form": "派生語：名詞形（記述）",
};

/** マーク式（選択）か記述式か */
export type QuestionKind = "mark" | "write";

export interface Question {
  /** 模試内で一意のID（例: m1, w3） */
  id: string;
  kind: QuestionKind;
  /** 解答番号（マークは 1..N、記述は 記述1..M） */
  no: number;
  /** 表示用の番号（記述の (a)〜(f) など）。省略時は no */
  label?: string;
  category: Category;
  /** 設問文（空所補充など本文中に問題がある場合は省略可） */
  prompt?: string;
  /** 選択肢（グループ共通選択肢を使う場合は省略） */
  choices?: string[];
  points: number;
}

/** 正解・解説（受験前のクライアントには送らない） */
export interface AnswerKey {
  /** mark: 正解の選択肢番号（1始まり） / write: 許容解答の配列 */
  answer: number | string[];
  explanation: string;
}

export interface QuestionWithKey extends Question, AnswerKey {}

export interface QuestionGroup<Q = Question> {
  /** 設問指示（例: 「空所（1）〜（4）に入る最も適切な語を…」） */
  instruction: string;
  /** グループ共通の選択肢 */
  choices?: string[];
  /** 語群（記述の語形変化で使う語の一覧） */
  wordBox?: string[];
  /**
   * 語群の各語がとりうる語形（採点専用・受験前のクライアントには送らない）。
   * 「同じ語を二回以上選んだ場合は得点にならない」の判定に使う
   */
  wordForms?: Record<string, string[]>;
  /** 印刷時に各設問の後ろへ「The answer is: [ n ].」を付ける（本番の書式） */
  answerLine?: boolean;
  /** グループ固有の本文（短文の内容推測など、設問ごとに英文があるとき） */
  passage?: Passage;
  questions: Q[];
}

export interface Passage {
  title?: string;
  /** 段落。{{b:N}} = 空所（マーク番号N）、{{u:N|text}} = 下線部（番号N）、{{w:a}} = 記述の空所（ラベル a） */
  paragraphs: string[];
  /** 本文の語注 */
  notes?: string[];
  /** 会話文の場合は話者付きの行として描画する */
  dialogue?: boolean;
  /** 本文の前に付ける番号（短文の (43) など） */
  label?: string;
  /** 本文の末尾に右寄せで付ける出典行 */
  source?: string;
}

export interface Section<Q = Question> {
  /** ローマ数字の大問番号（I, II, ...） */
  label: string;
  /** 大問の指示文 */
  instruction: string;
  /** 大問の前に置く案内（例: ここからは解答用紙Bを使用しなさい。） */
  sheetNotice?: string;
  /** 指示文の下に置く例（例: decide → decision） */
  example?: string;
  passage?: Passage;
  groups: QuestionGroup<Q>[];
}

export interface ExamMeta {
  id: string;
  /** mock: フル模試 / practice: 大問演習（模試とは別の問題。模試には再掲しない） */
  kind?: "mock" | "practice";
  /** 大問演習の種類（一覧の表示名。例: 長文（論説）） */
  practiceType?: string;
  /** 準拠する入試プロファイル（content/profiles/<id>.json）。validate が形式を検査する */
  profile?: string;
  university: string;
  faculty: string;
  subject: string;
  /** 模試名（例: 第1回 慶應義塾大学 商学部 英語 予想模試） */
  title: string;
  edition: string;
  durationMin: number;
  totalPoints: number;
  /** 表紙に載せる注意事項 */
  coverNotes: string[];
  disclaimer: string;
}

export interface Exam<Q = Question> extends ExamMeta {
  sections: Section<Q>[];
}

export type ExamWithKey = Exam<QuestionWithKey>;

/** 受験者の解答: 問題ID → 選択肢番号 or 記述文字列 */
export type Answers = Record<string, number | string | null>;

export type AttemptMode = "web" | "paper";

export interface SubmitAttemptRequest {
  examId: string;
  answers: Answers;
  durationSec: number;
  mode: AttemptMode;
  /** ログイン前（端末内）の受験を取り込む。偏差値の母集団には入れない */
  imported?: boolean;
  /** 取り込み時の元の受験日時 */
  createdAt?: string;
}

/** 登録なし受験の提出（端末ごとの匿名ID付き） */
export interface GuestSubmitRequest extends SubmitAttemptRequest {
  clientId: string;
}

/** 問題への意見・満足度 */
export interface FeedbackRequest {
  type: "question" | "rating";
  examId: string;
  /** 受験の参照（ゲストは端末内のID） */
  attemptRef?: string;
  questionId?: string;
  reason?: FeedbackReason;
  /** 「また受けたいか」1〜5 */
  rating?: number;
  text?: string;
  clientId?: string;
}

export type FeedbackReason = "explanation" | "answer" | "typo" | "difficulty" | "other";

export const FEEDBACK_REASONS: Record<FeedbackReason, string> = {
  explanation: "解説が分かりにくい",
  answer: "正解に納得できない",
  typo: "問題文・選択肢の誤字",
  difficulty: "難しさについて",
  other: "その他",
};

/** 撮影採点 */
export interface PhotoJobRequest {
  examId: string;
  /** JPEG の Base64（data: なし）。解答用紙A・B の順。1〜2枚 */
  images: string[];
}

export type Confidence = "high" | "low";

export interface PhotoReadResult {
  marks: { no: number; choice: number | null; confidence: Confidence }[];
  writes: { label: string; text: string; confidence: Confidence }[];
  /** 読み取りについての注意（日本語、任意） */
  note?: string;
}

export interface PhotoJob {
  jobId: string;
  examId: string;
  status: "PENDING" | "DONE" | "FAILED";
  createdAt: string;
  result?: PhotoReadResult;
  error?: string;
}

export interface PartScore {
  key: string;
  label: string;
  score: number;
  max: number;
  correct: number;
  total: number;
}

export interface QuestionResult {
  id: string;
  correct: boolean;
  earned: number;
}

export interface AttemptSummary {
  attemptId: string;
  examId: string;
  examTitle: string;
  createdAt: string;
  mode: AttemptMode;
  durationSec: number;
  score: number;
  maxScore: number;
  /** 提出時点の偏差値（初回受験のみ母集団に含める） */
  deviation: number | null;
  /** 提出時点の母集団の人数 */
  population: number;
  /** 母集団に含まれた（初回受験）か */
  counted: boolean;
  /** 母集団に含めなかった理由（所要時間が短すぎる・ほぼ白紙など） */
  excludedReason?: string;
  sections: PartScore[];
  categories: PartScore[];
}

export interface AttemptDetail extends AttemptSummary {
  answers: Answers;
  results: QuestionResult[];
}

export interface ExamStats {
  examId: string;
  count: number;
  mean: number;
  sd: number;
  maxScore: number;
  /** 10点刻みのヒストグラム（index i = [i*10, i*10+10) 点、最後の帯は満点を含む） */
  histogram: number[];
  bucketSize: number;
  sectionMeans: Record<string, number>;
}

/** 結果画面用: 受験記録 + 正解解説 + 現在の母集団統計 */
export interface AttemptReview {
  attempt: AttemptDetail;
  exam: ExamWithKey;
  stats: ExamStats;
  /** 現在の母集団に対する偏差値 */
  currentDeviation: number | null;
  /** 推定順位（上位何%か） */
  topPercent: number | null;
}

export interface ExamListItem extends ExamMeta {
  questionCount: number;
}

/** ユーザーごとの目標設定（モチベーション表示に使う） */
export interface Profile {
  /** 表示名（未設定ならログイン情報の名前） */
  nickname?: string;
  /** 目標偏差値（40〜80） */
  goalDeviation?: number;
  /** 本番の受験日 YYYY-MM-DD（志望校を設定していない場合の手入力） */
  examDate?: string;
  /** 志望校（先頭が第1志望、最大3件）。値は content/admissions.ts の ID */
  targets?: { admissionId: string; facultyId: string; methodId: string }[];
}
