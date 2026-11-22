import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { AttemptDetail, Profile } from "../../shared/types";
import type { RawStats } from "../../shared/stats";
import type { Repo } from "./repo";

/**
 * シングルテーブル設計（オンデマンド課金）
 *   PK=USER#<sub>  SK=ATTEMPT#<attemptId>  受験記録（attemptId は時刻順に並ぶ）
 *   PK=USER#<sub>  SK=PROFILE              目標偏差値・受験日など
 *   PK=EXAM#<id>   SK=FIRST#<sub>          初回受験の印（母集団の重複防止）
 *   PK=EXAM#<id>   SK=STATS                集計値（n, Σx, Σx², ヒストグラム, 大問別合計）
 * 初回の印と集計の加算は1トランザクションで行うので、途中で失敗しても数がずれない。
 */
export class DynamoRepo implements Repo {
  private doc: DynamoDBDocumentClient;
  constructor(private table: string) {
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async putAttempt(userId: string, a: AttemptDetail) {
    await this.doc.send(
      new PutCommand({ TableName: this.table, Item: { PK: `USER#${userId}`, SK: `ATTEMPT#${a.attemptId}`, ...a } }),
    );
  }

  async listAttempts(userId: string) {
    const items: AttemptDetail[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const r = await this.doc.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":sk": "ATTEMPT#" },
          ScanIndexForward: false,
          ExclusiveStartKey,
        }),
      );
      items.push(...((r.Items ?? []) as AttemptDetail[]).map(strip));
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  async getAttempt(userId: string, attemptId: string) {
    const r = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { PK: `USER#${userId}`, SK: `ATTEMPT#${attemptId}` } }),
    );
    return r.Item ? strip(r.Item as AttemptDetail) : undefined;
  }

  async recordFirstAttempt(examId: string, userId: string, attemptId: string, score: number, bucket: number, sectionScores: Record<string, number>) {
    const names: Record<string, string> = { "#b": `h_${bucket}` };
    const values: Record<string, number> = { ":one": 1, ":x": score, ":x2": score * score };
    const adds = ["n :one", "s :x", "s2 :x2", "#b :one"];
    Object.entries(sectionScores).forEach(([k, v], i) => {
      names[`#s${i}`] = `sec_${k}`;
      values[`:s${i}`] = v;
      adds.push(`#s${i} :s${i}`);
    });
    try {
      await this.doc.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: this.table,
                Item: { PK: `EXAM#${examId}`, SK: `FIRST#${userId}`, attemptId },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Update: {
                TableName: this.table,
                Key: { PK: `EXAM#${examId}`, SK: "STATS" },
                UpdateExpression: `ADD ${adds.join(", ")}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
              },
            },
          ],
        }),
      );
      return true;
    } catch (e) {
      if (e instanceof TransactionCanceledException && e.CancellationReasons?.[0]?.Code === "ConditionalCheckFailed") return false;
      throw e;
    }
  }

  async getStats(examId: string): Promise<RawStats> {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `EXAM#${examId}`, SK: "STATS" } }));
    const it = (r.Item ?? {}) as Record<string, number>;
    const buckets: Record<number, number> = {};
    const sectionSums: Record<string, number> = {};
    for (const [k, v] of Object.entries(it)) {
      if (k.startsWith("h_")) buckets[Number(k.slice(2))] = Number(v);
      if (k.startsWith("sec_")) sectionSums[k.slice(4)] = Number(v);
    }
    return { count: Number(it.n ?? 0), sum: Number(it.s ?? 0), sumSq: Number(it.s2 ?? 0), buckets, sectionSums };
  }

  async getProfile(userId: string): Promise<Profile> {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `USER#${userId}`, SK: "PROFILE" } }));
    const { PK: _p, SK: _s, ...rest } = (r.Item ?? {}) as Record<string, unknown>;
    return rest as Profile;
  }

  async putProfile(userId: string, profile: Profile) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: { PK: `USER#${userId}`, SK: "PROFILE", ...profile } }));
  }
}

function strip(item: AttemptDetail): AttemptDetail {
  const { PK: _p, SK: _s, ...rest } = item as AttemptDetail & { PK?: string; SK?: string };
  return rest;
}
