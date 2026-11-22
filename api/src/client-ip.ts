/**
 * 利用者の IP（回数制限用）。API は CloudFront 経由で呼ばれるので、API Gateway の sourceIp は CloudFront の IP になる。
 * CloudFront は X-Forwarded-For の末尾に接続元の IP を付け足すため、末尾の値を使う
 * （先頭側は利用者が自由に書けるので信用しない）。CloudFront を通らない直接のアクセスは sourceIp を使う。
 */
export function clientIp(headers: Record<string, string | undefined> | undefined, sourceIp: string | undefined): string | undefined {
  const xff = headers?.["x-forwarded-for"];
  if (xff) {
    const last = xff.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
    if (last && /^[0-9a-fA-F:.]{3,45}$/.test(last)) return last;
  }
  return sourceIp;
}
