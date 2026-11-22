// 撮影採点の読み取り用 Lambda（API の Lambda から非同期で起動される）。
// S3 の画像を Claude で読み取り、結果をジョブに保存して画像を削除する。
import Anthropic from "@anthropic-ai/sdk";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DynamoRepo } from "./repo-dynamo";
import { readAnswerSheets } from "./photo-reader";

export interface PhotoWorkerEvent {
  userId: string;
  jobId: string;
  examId: string;
  createdAt: string;
  keys: string[];
}

const repo = new DynamoRepo(process.env.TABLE_NAME!);
const s3 = new S3Client({});
let client: Anthropic | undefined;

async function anthropic(): Promise<Anthropic> {
  if (client) return client;
  const sm = new SecretsManagerClient({});
  const r = await sm.send(new GetSecretValueCommand({ SecretId: process.env.ANTHROPIC_SECRET! }));
  const { apiKey } = JSON.parse(r.SecretString ?? "{}") as { apiKey?: string };
  if (!apiKey) throw new Error("Anthropic の APIキーが Secrets Manager にありません");
  client = new Anthropic({ apiKey, timeout: 100_000, maxRetries: 1 });
  return client;
}

export async function handler(ev: PhotoWorkerEvent): Promise<void> {
  const bucket = process.env.PHOTO_BUCKET!;
  const base = { jobId: ev.jobId, examId: ev.examId, createdAt: ev.createdAt };
  try {
    const images: string[] = [];
    for (const key of ev.keys) {
      const o = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      images.push(Buffer.from(await o.Body!.transformToByteArray()).toString("base64"));
    }
    const result = await readAnswerSheets(await anthropic(), ev.examId, images);
    await repo.putPhotoJob(ev.userId, { ...base, status: "DONE", result });
    console.log(JSON.stringify({ msg: "photo read done", jobId: ev.jobId, low: result.marks.filter((m) => m.confidence === "low").length }));
  } catch (e) {
    console.error(e);
    await repo.putPhotoJob(ev.userId, { ...base, status: "FAILED", error: "読み取りに失敗しました。明るい場所で、用紙全体が写るように撮り直してください" });
  } finally {
    // 画像はすぐ消す（取り残しはバケットのライフサイクルで1日後に削除）
    await Promise.all(ev.keys.map((Key) => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key })).catch(() => undefined)));
  }
}
