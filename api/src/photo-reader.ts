// 撮影採点: 解答用紙の写真から答えを読み取る（Claude の画像入力＋構造化出力）。
// 採点はしない。読み取った答えは受験者が画面で確認・修正してから、通常の提出で採点する。
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { findExam } from "../../content/index";
import { allQuestions } from "../../shared/scoring";
import type { PhotoReadResult } from "../../shared/types";

export const PHOTO_MODEL = "claude-opus-5-5";

const ResultSchema = z.object({
  marks: z.array(z.object({ no: z.number().int(), choice: z.number().int().nullable(), confidence: z.enum(["high", "low"]) })),
  writes: z.array(z.object({ label: z.string(), text: z.string(), confidence: z.enum(["high", "low"]) })),
  note: z.string(),
});

function instructions(examId: string): string {
  const exam = findExam(examId);
  if (!exam) throw new Error(`unknown exam ${examId}`);
  const qs = allQuestions(exam);
  const marks = qs.filter((q) => q.kind === "mark").map((q) => q.no);
  const choices = Math.max(...qs.filter((q) => q.kind === "mark").map((q) => q.choices?.length ?? 4));
  const writes = qs.filter((q) => q.kind === "write").map((q) => q.label ?? String(q.no));
  return [
    `これは大学入試の模試「${exam.university} ${exam.faculty} ${exam.subject} ${exam.edition}」の解答用紙の写真です。受験者が書いた答えを読み取ってください。採点はしません。`,
    "",
    `解答用紙A（マークシート）: 解答番号 ${marks[0]}〜${marks[marks.length - 1]} の各行で、塗りつぶされた番号（1〜${choices}）を読む。`,
    "- 1つだけ濃く塗られていれば、その番号。confidence は high。",
    "- 何も塗られていない行は choice を null、confidence は high。",
    "- 2つ以上塗られている、薄くて判別できない、消し跡と区別できない、写真が切れている行は、最も可能性の高い番号（決められなければ null）を入れ、confidence は low。",
    `- marks には解答番号 ${marks.join(", ")} をすべて、この順に入れる。`,
    "",
    `解答用紙B（記述）: 欄 ${writes.map((w) => `(${w})`).join(" ")} に書かれた英単語を読む。`,
    "- 書かれている綴りを、そのまま書き起こす。綴りの誤りを直してはいけない（採点に使うため）。",
    "- 空欄は text を空文字、confidence は high。読み取りに迷う文字がある場合は confidence を low。",
    `- writes には欄 ${writes.join(", ")} をすべて、この順に入れる（label は a, b のような欄の記号）。`,
    "",
    "写真が解答用紙でない、ひどくぼけている、一部しか写っていない場合は、読めた範囲だけを入れ、note に日本語で短く理由を書く（問題なければ note は空文字）。",
    "受験番号・氏名などの個人情報は読み取らない。",
  ].join("\n");
}

/** 画像（JPEG の Base64、解答用紙A・B の順）から答えを読み取る */
export async function readAnswerSheets(client: Anthropic, examId: string, imagesB64: string[]): Promise<PhotoReadResult> {
  const response = await client.beta.messages.parse({
    model: PHOTO_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(ResultSchema) },
    messages: [
      {
        role: "user",
        content: [
          ...imagesB64.map((data) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data } })),
          { type: "text", text: instructions(examId) },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("読み取りを完了できませんでした");
  const out = response.parsed_output;
  if (!out) throw new Error("読み取り結果を解釈できませんでした");

  // 設問一覧に合わせて整える（抜け・余分な行・範囲外の番号を除く）
  const exam = findExam(examId)!;
  const qs = allQuestions(exam);
  const byNo = new Map(out.marks.map((m) => [m.no, m]));
  const byLabel = new Map(out.writes.map((w) => [w.label.replace(/[()（）\s]/g, "").toLowerCase(), w]));
  return {
    marks: qs
      .filter((q) => q.kind === "mark")
      .map((q) => {
        const m = byNo.get(q.no);
        const n = q.choices?.length ?? 4;
        const valid = m?.choice != null && m.choice >= 1 && m.choice <= n;
        // 範囲外の番号を読んだ行・読み取り結果に無い行は、本人に確かめてもらう
        const confidence = !m || (m.choice != null && !valid) ? "low" : m.confidence;
        return { no: q.no, choice: valid ? m!.choice : null, confidence };
      }),
    writes: qs
      .filter((q) => q.kind === "write")
      .map((q) => {
        const label = q.label ?? String(q.no);
        const w = byLabel.get(label.toLowerCase());
        return { label, text: (w?.text ?? "").trim().slice(0, 60), confidence: w ? w.confidence : "low" };
      }),
    ...(out.note ? { note: out.note.slice(0, 300) } : {}),
  };
}
