import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { route, type Services } from "./app";
import { DynamoRepo } from "./repo-dynamo";
import type { PhotoWorkerEvent } from "./photo-worker";

const repo = new DynamoRepo(process.env.TABLE_NAME!);

/** 撮影採点: 画像を S3（1日で自動削除）に置き、読み取り用 Lambda を非同期で起動する */
function photoService(): Services["photo"] {
  const bucket = process.env.PHOTO_BUCKET;
  const worker = process.env.PHOTO_WORKER;
  if (!bucket || !worker) return undefined;
  const s3 = new S3Client({});
  const lambda = new LambdaClient({});
  return {
    async start(userId, job, images) {
      const keys: string[] = [];
      for (const [i, b64] of images.entries()) {
        const key = `${job.jobId}/${i}.jpg`;
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(b64, "base64"), ContentType: "image/jpeg" }));
        keys.push(key);
      }
      const payload: PhotoWorkerEvent = { userId, jobId: job.jobId, examId: job.examId, createdAt: job.createdAt, keys };
      await lambda.send(new InvokeCommand({ FunctionName: worker, InvocationType: "Event", Payload: Buffer.from(JSON.stringify(payload)) }));
    },
  };
}
const services: Services = { photo: photoService() };

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  // HTTP API の JWT オーソライザ（Cognito）が検証済みのクレーム（公開ルートでは無い）
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined;
  const body = event.body && event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  try {
    const res = await route(repo, event.requestContext.http.method, event.rawPath, sub, body, services);
    return {
      statusCode: res.status,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify(res.body),
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "サーバーエラー" }) };
  }
}
