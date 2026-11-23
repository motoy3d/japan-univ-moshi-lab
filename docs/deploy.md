# デプロイ手順

デプロイは GitHub Actions（`.github/workflows/deploy.yml`）から行う。AWS への認証は GitHub の OIDC で、長期のアクセスキーは作らない。初回の準備（1〜6）は AWS と GitHub の画面で一度だけ行い、以後は 7 だけを行う。

## 1. AWS の準備（AWS CloudShell で実行）

東京リージョン（ap-northeast-1）の CloudShell を開き、CDK のブートストラップを行う。

```bash
npx -y aws-cdk@2 bootstrap aws://<アカウントID>/ap-northeast-1
```

## 2. GitHub からデプロイするためのロール

CloudFormation の「スタックの作成」で `infra/github-oidc.yaml` をアップロードする（スタック名は `moshi-lab-github`）。

- すでに GitHub Actions の OIDC プロバイダがあるアカウントでは、`CreateProvider` を `false` にする。
- 出力の `RoleArn` を控える。

このロールは CDK のブートストラップロールを引き受けることしかできない。また、引き受けられるのはこのリポジトリの `production` 環境のジョブだけ。

## 3. シークレットの登録（CloudShell）

```bash
# Google ログインを使う場合（Google Cloud Console で作った OAuth クライアントのシークレット）
aws secretsmanager create-secret --name moshi-lab/google-oauth --secret-string '{"clientSecret":"<シークレット>"}'
# 撮影採点を使う場合（Anthropic Console で発行した APIキー）
aws secretsmanager create-secret --name moshi-lab/anthropic --secret-string '{"apiKey":"<APIキー>"}'
```

Anthropic Console で月の利用上限を設定しておくと、想定外の費用を防げる。

## 4. Google アナリティクス

GA4 のプロパティとウェブストリームを作り、測定ID（`G-` で始まる）を控える。Google シグナルは有効にしない（このアプリ側でも無効にして送っている）。

## 5. GitHub の設定

リポジトリの Settings → Environments → `production` を作り、次を登録する。

| 種類 | 名前 | 値 |
|---|---|---|
| Variable | `AWS_DEPLOY_ROLE_ARN` | 2 の `RoleArn` |
| Variable | `COGNITO_DOMAIN_PREFIX` | Cognito のドメイン接頭辞（全世界で一意。例: `moshi-lab-xxxx`） |
| Variable | `GOOGLE_CLIENT_ID` | Google ログインを使う場合のクライアントID |
| Variable | `GA_ID` | 4 の測定ID |
| Secret | `ALERT_EMAIL` | エラー通知を受け取るメールアドレス |

`production` 環境に「Required reviewers」を設定すると、デプロイの前に承認が必要になる（推奨）。

## 6. Google ログインのリダイレクトURI

初回のデプロイ後、出力の `GoogleRedirectUri` を Google Cloud Console の「承認済みのリダイレクト URI」に登録する。`ALERT_EMAIL` に届く確認メールのリンクも開く。

## 6.5 独自ドメイン（moshi-lab.com）

2026-11-23 に設定済み。サイトは `https://moshi-lab.com`（`www.` は転送）、ログイン画面は `https://auth.moshi-lab.com`。

1. Route 53 でドメインを登録する（ホストゾーンが自動で作られる）。
2. **us-east-1** の ACM で、`<ドメイン>`・`www.<ドメイン>`・`auth.<ドメイン>` を含む証明書を DNS 検証で作り、検証用の CNAME をホストゾーンに登録する（発行まで数分）。
3. CDK のコンテキストに `-c domainName=<ドメイン> -c certificateArn=<証明書の ARN>` を足してデプロイする。CloudFront の別名・Route 53 のレコード・Cognito の独自ドメインが作られる（ログイン画面の準備に10分前後かかる）。
4. 独自ドメインを変えるときは、`web/vite.config.ts` の `AUTH_ORIGINS`（CSP）も直す。

CloudFront の URL（`*.cloudfront.net`）と接頭辞のログイン用ドメインも残してあり、ログイン後の戻り先にも登録されている。

## 6.6 PC から直接デプロイする場合（現在の運用）

```bash
npm run build
cd infra && npx cdk deploy --profile motoikataoka \
  -c domainPrefix=moshi-lab -c alertEmail=<通知先メール> \
  -c domainName=moshi-lab.com -c certificateArn=<us-east-1 の証明書の ARN>
```

Google ログイン・GA4・撮影採点を有効にしたあとは、`-c googleClientId=... -c gaId=... -c photoGrading=true` も毎回付ける（付け忘れると無効に戻る）。Node.js 26 が必要。

## 7. デプロイ

GitHub の Actions → `deploy` → Run workflow。撮影採点を有効にするときは `photo_grading` にチェックを入れる。

Claude Code のセッションからも、GitHub の連携でこのワークフローを起動し、結果（ログと出力）を確認できる。AWS の認証情報はセッションには置かない。
