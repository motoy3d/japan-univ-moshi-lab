import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { route } from "./app";
import { DynamoRepo } from "./repo-dynamo";

const repo = new DynamoRepo(process.env.TABLE_NAME!);

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  // HTTP API の JWT オーソライザ（Cognito）が検証済みのクレーム
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined;
  const body = event.body && event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  try {
    const res = await route(repo, event.requestContext.http.method, event.rawPath, sub, body);
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
