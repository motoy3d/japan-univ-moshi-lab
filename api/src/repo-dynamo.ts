import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  BatchWriteCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { AttemptDetail, PhotoJob, Profile } from "../../shared/types";
import type { RawStats } from "../../shared/stats";
import type { FeedbackRecord, Repo } from "./repo";
import { EXAMS } from "../../content/index";

/**
 * シングルテーブル設計（オンデマンド課金）
 *   PK=USER#<sub>  SK=ATTEMPT#<attemptId>  受験記録（attemptId は時刻順に並ぶ）
 *   PK=USER#<sub>  SK=PROFILE              目標偏差値・受験日など
 *   PK=EXAM#<id>   SK=FIRST#<sub>          初回受験の印（母集団の重複防止）
 *   PK=EXAM#<id>   SK=STATS                集計値（n, Σx, Σx², ヒストグラム, 大問別合計）
 *   PK=GUEST#<examId> SK=<attemptId>       登録なし受験の匿名記録（clientId 付き）
 *   PK=FEEDBACK#<examId> SK=<日時>#<乱数>  問題への意見・満足度
 *   PK=USER#<sub>  SK=PHOTO#<jobId>        撮影採点のジョブ（jobId は時刻順）
 *   PK=RATE#<key>  SK=<時間枠>              回数制限のカウンタ（ttl で自動削除）
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

  async putGuestAttempt(clientId: string, a: AttemptDetail) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: { PK: `GUEST#${a.examId}`, SK: a.attemptId, clientId, ...a } }));
  }

  async putFeedback(item: FeedbackRecord) {
    const rand = Math.random().toString(36).slice(2, 8);
    await this.doc.send(new PutCommand({ TableName: this.table, Item: { PK: `FEEDBACK#${item.examId}`, SK: `${item.createdAt}#${rand}`, ...item } }));
  }

  async putPhotoJob(userId: string, job: PhotoJob) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: { PK: `USER#${userId}`, SK: `PHOTO#${job.jobId}`, ...job } }));
  }

  async getPhotoJob(userId: string, jobId: string) {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { PK: `USER#${userId}`, SK: `PHOTO#${jobId}` } }));
    if (!r.Item) return undefined;
    const { PK: _p, SK: _s, ...rest } = r.Item;
    return rest as PhotoJob;
  }

  async countPhotoJobs(userId: string, since: string) {
    const r = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        FilterExpression: "createdAt >= :since",
        ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":sk": "PHOTO#", ":since": since },
        Select: "COUNT",
      }),
    );
    return r.Count ?? 0;
  }

  async hit(key: string, bucket: string, ttlSec: number) {
    const r = await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { PK: `RATE#${key}`, SK: bucket },
        UpdateExpression: "ADD n :one SET #ttl = if_not_exists(#ttl, :ttl)",
        ExpressionAttributeNames: { "#ttl": "ttl" },
        ExpressionAttributeValues: { ":one": 1, ":ttl": Math.floor(Date.now() / 1000) + ttlSec },
        ReturnValues: "UPDATED_NEW",
      }),
    );
    return Number(r.Attributes?.n ?? 1);
  }

  /** 管理画面用: 条件に合う項目を全件読む（検証期間の小さなデータ量を前提にした Scan） */
  private async scan(filter: string, values: Record<string, unknown>, names?: Record<string, string>) {
    const items: Record<string, unknown>[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const r = await this.doc.send(
        new ScanCommand({ TableName: this.table, FilterExpression: filter, ExpressionAttributeValues: values, ExpressionAttributeNames: names, ExclusiveStartKey }),
      );
      items.push(...(r.Items ?? []));
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  }

  async listAllAttempts(since: string) {
    const items = await this.scan(
      "(begins_with(PK, :u) AND begins_with(SK, :a) OR begins_with(PK, :g)) AND createdAt >= :since",
      { ":u": "USER#", ":a": "ATTEMPT#", ":g": "GUEST#", ":since": since },
    );
    return items.map((it) => {
      const { PK, SK: _s, clientId, ...rest } = it as Record<string, unknown>;
      const who = String(PK).startsWith("GUEST#") ? `guest:${clientId}` : `user:${String(PK).slice(5)}`;
      return { who, attempt: rest as unknown as AttemptDetail };
    });
  }

  async listFeedback(since: string) {
    const items = await this.scan("begins_with(PK, :f) AND createdAt >= :since", { ":f": "FEEDBACK#", ":since": since });
    return items.map(({ PK: _p, SK: _s, ...rest }) => rest as unknown as FeedbackRecord);
  }

  async listAllPhotoJobs(since: string) {
    const items = await this.scan("begins_with(SK, :p) AND createdAt >= :since", { ":p": "PHOTO#", ":since": since });
    return items.map(({ PK: _p, SK: _s, ...rest }) => rest as unknown as PhotoJob);
  }

  async deleteUserData(userId: string) {
    const keys: { PK: string; SK: string }[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const r = await this.doc.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: { ":pk": `USER#${userId}` },
          ProjectionExpression: "PK, SK",
          ExclusiveStartKey,
        }),
      );
      keys.push(...((r.Items ?? []) as { PK: string; SK: string }[]));
      ExclusiveStartKey = r.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    const all = [...keys, ...EXAMS.map((e) => ({ PK: `EXAM#${e.id}`, SK: `FIRST#${userId}` }))];
    for (let i = 0; i < all.length; i += 25) {
      await this.doc.send(
        new BatchWriteCommand({ RequestItems: { [this.table]: all.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } })) } }),
      );
    }
    return keys.length;
  }
}

function strip(item: AttemptDetail): AttemptDetail {
  const { PK: _p, SK: _s, ...rest } = item as AttemptDetail & { PK?: string; SK?: string };
  return rest;
}
