import { App } from "aws-cdk-lib";
import { MoshiLabStack } from "../lib/stack";

const app = new App();
new MoshiLabStack(app, "MoshiLab", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1" },
  // Cognito のドメイン接頭辞（全世界で一意）。例: -c domainPrefix=moshi-lab-yourname
  domainPrefix: app.node.tryGetContext("domainPrefix") || undefined,
  // Google ログインを有効にする場合: -c googleClientId=xxxx.apps.googleusercontent.com
  // クライアントシークレットは Secrets Manager の googleSecretName に {"clientSecret":"..."} で保存しておく
  googleClientId: app.node.tryGetContext("googleClientId") || undefined,
  googleSecretName: app.node.tryGetContext("googleSecretName"),
  // エラー通知の送信先: -c alertEmail=you@example.com （個人情報なので cdk.json やリポジトリには書かない）
  alertEmail: app.node.tryGetContext("alertEmail") || undefined,
});
