# 引継書（クラウドのセッション → PC のセッション）

作成日: 2026-11-23 ／ 作業ブランチ: `claude/vibrant-maxwell-v5lhkb`（すべてプッシュ済み）

このファイルは、これまでクラウドの Claude Code セッションで進めてきた開発を、運営者の PC 上の Claude Code セッションに引き継ぐためのもの。**新しいセッションは、最初にこのファイルを全部読み、続けて「6. 必ず読む文書」を読むこと。**

---

## 1. プロダクトの概要

- **名前:** 模試ラボ（リポジトリ名 `japan-univ-moshi-lab`）
- **内容:** 大学入試の予想模試を、大学・学部ごとに本番と同じ形式のオリジナル問題で作る Web アプリ。Web 受験・紙で受験（印刷）・撮影採点・成績分析・偏差値。
- **第1弾:** 慶應義塾大学 商学部 英語（90分・200点、大問 I〜VIII、マーク46問＋記述11問）。
- **今の段階:** 「**無料で、使われるかを確かめる**」検証版（検証期間の想定は 2026年12月〜2027年3月）。課金はしない。シンプルに、核となる価値（本番そっくりの問題・採点・偏差値）を確かめる。
- **事業企画書:** Claude Docs のドキュメント https://claude.ai/artifact/2BRc5jaTAjTAhug5YeFGRt （「検証方針」の章に KPI と判断基準）
- **スマホ確認用デモ:** https://claude.ai/artifact/KA4scW4FNCs84DZsfZDKj7 （`scripts/build-demo-artifact.mjs` で作る単一 HTML。サーバーなしで動く）

## 2. 運営者との約束ごと（必ず守る）

| 項目 | 内容 |
|---|---|
| 言語 | 返答・文書・コミットメッセージは日本語 |
| 個人情報 | 運営者のメールアドレスなど個人情報を、コード・コミット・外部へのリクエストに入れない。通知先メールはデプロイ時だけ渡す（GitHub の Secret `ALERT_EMAIL` か `-c alertEmail=`） |
| 過去問の著作権 | **慶應の本物の過去問の本文・設問・OCR結果は絶対にコミットしない。** 形式・語数・難しさの確認にだけ使う。置き場は `.local/`（git では無視）。大学は二次利用に許諾が必要と明記している |
| 問題の独自性 | 問題はすべてオリジナル。過去問の転用・言い換えもしない。`npm run validate` に、8語連続の一致を検出する重複検査がある |
| AWS の認証情報 | 長期のアクセスキーは作らない。デプロイは GitHub Actions の OIDC。PC からは `--profile motoikataoka`（IAM Identity Center/SSO を推奨）。**最初は閲覧だけ。設定を変える前に内容を説明して承認をもらう** |
| git | 作業はこのブランチにコミット・プッシュ。**頼まれない限りプルリクエストは作らない** |
| コミット | コードやコミットにモデル名・モデルIDを書かない（アプリが使う API のモデル指定は除く） |
| 断定しない | 調べて確かめられないことは「確かめられなかった」と書く。テストの失敗は失敗と報告する |

## 3. 現在の状況

### できていること（すべてローカルで検証済み）
- **問題:** 模試2回分（`content/exams/keio-shogaku-eigo-01.json`, `-02.json`）と大問演習6セット（`content/practice/keio-shogaku-eigo-p01〜p06.json`）。
- **受験:** 登録なし受験（結果は端末内に保存、ログイン後に取り込み）、Web 受験（90分タイマー・自動保存）、紙で受験（印刷して答えを入力）、撮影採点（答案写真を Claude API で読み取り → 利用者が確認・修正して採点）。
- **結果:** 大問別・分野別の得点、全問の解説、偏差値（母集団が30人以上のときだけ表示）、満足度（星）と、問題ごとの指摘ボタン（目立たないアイコン。文言に「おかしい」は使わない）。
- **アカウント:** Cognito（メール＋パスワード、Google ログイン）、名前・メール（確認コード）・パスワードの変更、退会（データ削除）。
- **運営:** 管理画面 `/admin`（Cognito の `admin` グループのみ）：概要 KPI・意見一覧・設問分析（正答率・識別力・選択の分布）。
- **計測:** GA4（`exam_view` / `exam_start` / `exam_submit` など。Google シグナルは無効）。
- **インフラ:** CDK（`infra/lib/stack.ts`）。DynamoDB の PITR、AWS Budgets のアラート、CloudWatch アラーム → メール、レート制限、CloudFront。
- **品質:** 単体テスト 26件（`tests/`）、E2E 10件（`e2e/`、axe によるアクセシビリティ検査を全配色・ダークモードで）、CI（`.github/workflows/ci.yml`：型検査・テスト・ビルド・E2E・npm audit）、CodeQL、Dependabot、`scripts/check-bundle.ts`（正解データが Web の配布物に混ざったら失敗）。
- **文書:** 設計書・デプロイ・セキュリティ・運用・作問手順・品質レポート（「6.」参照）。

### まだのこと
1. **AWS へのデプロイ（最優先）。** 運営者が `docs/deploy.md` の 1〜5 を準備中。
2. デプロイ後の、実環境での動作確認（ログイン・Google ログイン・受験・撮影採点・管理画面・アラートメール）。
3. 利用規約・プライバシーポリシーは雛形のまま（`web/src/pages/LegalPages.tsx`）。公開前に運営者・専門家の確認が必要。
4. 高校生（慶應の過去問を何度も解いている）に、本番サイズの PDF でもう一度解いてもらい、感想を反映する。
5. 大問演習の問題数を増やす（設計書の「ストックの目標」参照）。

## 4. 次にやること（PC のセッションで）

1. `aws sso login --profile motoikataoka` 済みか確認し、`aws sts get-caller-identity --profile motoikataoka` でアカウントを確認。
2. `docs/deploy.md` の 1〜5 を運営者といっしょに進める（**変更系のコマンドは必ず事前に説明して承認をもらう**）。
   - 1: `npx -y aws-cdk@2 bootstrap aws://<アカウントID>/ap-northeast-1 --profile motoikataoka`
   - 2: CloudFormation で `infra/github-oidc.yaml`（スタック名 `moshi-lab-github`）。出力 `RoleArn`
   - 3: Secrets Manager に `moshi-lab/google-oauth`、`moshi-lab/anthropic`（値は運営者が自分で入力。チャットに貼らせない）
   - 4: GA4 のプロパティと測定ID
   - 5: GitHub の Environment `production` に Variables（`AWS_DEPLOY_ROLE_ARN` `COGNITO_DOMAIN_PREFIX` `GOOGLE_CLIENT_ID` `GA_ID`）と Secret（`ALERT_EMAIL`）
3. **`workflow_dispatch` は、ワークフローのファイルが既定ブランチ（main）にないと GitHub の画面に出ない。** このブランチを main に取り込む必要がある（プルリクエストを作るかは運営者に確認）。PC からなら `cdk deploy --profile motoikataoka` で直接デプロイする選択肢もある（その場合も事前に承認）。
4. デプロイ後: 出力 `GoogleRedirectUri` を Google Cloud Console に登録、アラートの確認メールのリンクを開く、運営者を `admin` グループに追加（`docs/operations.md`）。
5. 実環境で一通り動作確認し、結果を報告。

## 5. 技術構成とコードの地図

### 構成
- npm workspaces のモノレポ（`web`、`infra`）。Node.js 26（`.nvmrc`、`engines >=26`）。npm 12 以降は esbuild のインストールスクリプトだけ許可。
- **Web:** React + Vite（`web/`）。デザインは `<html data-palette data-shape data-hero data-header data-font data-logo>` の属性で切り替え。
- **API:** 1つの Lambda（`api/src/lambda.ts` → `app.ts` の `route(repo, method, path, userId, rawBody, services, ctx)`）。API Gateway HTTP API、JWT（Cognito）。
- **データ:** DynamoDB（`api/src/repo-dynamo.ts`）。ローカルはメモリ/ファイル（`repo-memory.ts`、`DATA_FILE=memory` でメモリのみ）。
- **撮影採点:** S3（1日で自動削除）→ PhotoReader Lambda（非同期）→ Claude API（`api/src/photo-reader.ts`。`client.beta.messages.parse` + Zod の構造化出力、effort medium、サーバー側フォールバック）。キーは Secrets Manager `moshi-lab/anthropic`。CDK の `-c photoGrading=true` のときだけ作られる。
- **配信:** CloudFront（AWS 管理ポリシーのみ）。CSP は `index.html` の meta。

### 公開 API（ログイン不要）と制限
- `GET /api/exams*`、`POST /api/guest/attempts`、`POST /api/feedback`
- 正解・解説は提出前のクライアントに送らない。採点はサーバー側。
- 回数制限（`api/src/app.ts` の `LIMITS`）: 登録なし受験 30回/端末/日・300回/IP/日、意見 100回/IP/日、撮影採点 全体300回/日、1人5回/24時間（`PHOTO_DAILY_LIMIT`）。DynamoDB の TTL 付きカウンタ。
- クライアント IP は X-Forwarded-For の**最後**の値（CloudFront が付ける。先頭は偽装できる）。`api/src/client-ip.ts`
- 偏差値は `MIN_POPULATION_FOR_DEVIATION = 30` 人未満では出さない。母集団は各人の初回受験。

### 主なファイル
| 場所 | 内容 |
|---|---|
| `api/src/app.ts` | ルーティング・採点・制限 |
| `api/src/admin.ts` | 管理画面の API（Scan で集計） |
| `api/src/photo-reader.ts` / `photo-worker.ts` | 撮影採点 |
| `infra/lib/stack.ts`, `infra/bin/app.ts` | CDK |
| `infra/github-oidc.yaml` | GitHub OIDC のデプロイ用ロール |
| `web/src/pages/` | 画面（Home, Exam, Take, Result, Photo, Print, AnswerKeyPrint, History, Settings, Admin, Login, Legal, DesignGallery） |
| `web/src/design.ts` | デザインの既定値（下記） |
| `web/src/guest.ts` / `analytics.ts` / `auth.ts` | 登録なし受験・GA4・Cognito |
| `web/src/styles.css` | 全スタイル（配色・印刷・大きい文字） |
| `content/` | 問題 JSON、入試プロファイル、仮想受験者、入試日程（`admissions.ts`） |
| `scripts/build-keio-shogaku-01.py` / `-02.py` / `-practice.py` | **問題の原稿**（これを直して実行すると JSON ができる） |
| `scripts/authoring/keio_shogaku_eigo.py` | 作問の共通部品 |
| `scripts/validate-content.ts` | 形式・語数・難しさ・重複の自動検査 |
| `scripts/quality_metrics.py` | 難しさの指標 |
| `scripts/simulate/` | 仮想受験者による試し解き |

### よく使うコマンド
```bash
npm install
npm run dev            # API http://localhost:8787 / Web http://localhost:5173（ダミーログイン）
npm run validate       # 問題・入試日程の検査
npm test               # 単体テスト
npm run typecheck
npm run build          # validate + web build + check-bundle
PW_CHROMIUM=<chromiumのパス> npm run e2e   # E2E（PW_CHROMIUM は省略可）
npm -w infra run synth # CDK の合成確認（infra/package.json 参照）
```
- 問題を直したら: 原稿の Python を直す → `python3 scripts/build-keio-shogaku-NN.py` → `npm run validate` → `npm test`。
- デザイン確認用の切り替えパネルは `?design=1` を付けたときだけ表示。一覧は `/design`。

## 6. 必ず読む文書
| 文書 | 内容 |
|---|---|
| `README.md` | 全体、出題形式の根拠（出典付き） |
| `docs/design/validation-mvp.md` | 検証版の設計（登録なし受験・大問演習・撮影採点・意見・計測） |
| `docs/deploy.md` | デプロイ手順 |
| `docs/security.md` | セキュリティ点検の結果と方針 |
| `docs/operations.md` | 運用（毎日・毎週・障害対応・問題修正・復元・退会・管理者追加） |
| `docs/authoring/README.md` | 作問・検証の手順（曖昧さの点検を含む） |
| `docs/quality/review-keio-shogaku-eigo-01.md` | 第1回の品質検証 |
| `docs/quality/calibration-keio-shogaku-eigo.md` | 仮想受験者による較正 |
| `content/profiles/keio-shogaku-eigo.json` | 本番に合わせた形式・語数・難しさの基準 |

## 7. 問題の品質について分かっていること

### 本番の形式（公開情報で確認）
- 2027年度 一般選抜要項、大学公開の 2025・2026年度の問題、河合塾の分析で確認。8題構成（I〜III 長文、IV 文法・語法、V 中文空所、VI 短文の内容一致、VII 動詞の語形変化、VIII 名詞形）。マーク46問。
- 大問 II（長文）と V は、著作権の都合で大学が本文を公開しておらず、比べられない。

### 長さ（2025・2026年度を実測 → 2026-11-23 に修正済み）
| 項目 | 本番 | 修正後の模試・演習 |
|---|---|---|
| 長文1題 | 719〜837語 | 760〜809語 |
| VII・VIII | 168〜194語 | 170〜193語 |
| VI（短文） | 106〜148語 | 103〜123語（ほぼ範囲内として据え置き。最短の103語は本番の最短よりわずかに短い） |

- きっかけ: 過去問を何度も解いた高校生が「一部の文章が短い」と指摘。プロファイルの基準も引き上げ、短すぎると検査で止まる。
- 現在の語数: 第1回 I 796 / II 802 / III 809 / VII 170 / VIII 193、第2回 I 796 / II 777 / III 771 / VII 181 / VIII 178、演習 p01 799 / p02 760 / p06 777、p05 VII 183 / VIII 181。

### 難しさ（仮想受験者での較正）
- 偏差値55の AI 受験者で、共通部分の得点率は本番 80%、第1回 73%、第2回 77%（目安 ±8 の範囲内）。
- AI 受験者では「偏差値62なら何点」という絶対値は再現できない（高すぎる点を取る）。**相対比較にだけ使う。** 偏差値と得点の対応は、実際の受験データで較正する。
- 課題: 第2回の長文I が本番より易しい。第1回の長文の空所（語彙）が本番より難しい。

### 印刷（2026-11-23 に修正）
- 公開 PDF は A4。A4 に1枚1ページで印刷すると、本番と同じ大きさ（長文 12pt、設問・選択肢 11.5pt、1行約100字。本番は約95字）。
- 不具合だったこと: 横向きのマークシートを同じ PDF に入れると、Chromium が全ページを約67%に縮めていた（画面用の `.sheet.landscape` の幅が印刷時にも残っていた）。`web/src/styles.css` の印刷用 CSS で修正済み。
- 「文字を大きく」（`?text=large`）は、A4 に2ページ並べて印刷する人やタブレット向け（本文 14.5pt）。
- 運営者に渡した PDF: 模試1回ごとに1ファイル、大問演習6セットで1ファイル（本番サイズ版と文字大きめ版の2種類）。

## 8. デザイン（決定済み）
運営者が選んだ組み合わせを既定にした（`web/src/design.ts` の `DEFAULT` と `web/index.html` の属性）:
配色=空色（sky）、形=標準、トップ=濃い色、ヘッダー=白、書体=ゴシック、ロゴ=マークシート（bubbles）。
他の配色（navy, soft, mint, sakura, lavender）やロゴ6案は、比較用に残してある（`?design=1`）。

## 9. これまでの経緯（運営者の主な要望の順）
1. 慶應商学部 英語の模試アプリを作成 → 出題形式を 2020〜2026年度に合わせて全面改訂。
2. Node 26、ログ3か月、エラー通知、ボット対策。志望校・学部・方式の設定（慶應全10学部・共通テスト）。
3. 利用規約・プライバシーの雛形、名前を「模試ラボ」に。
4. 第1回の品質検証・難しさ調整、作問手順と自動検査、第2回を作成、仮想受験者で較正。
5. ChatGPT の助言を受けて「無料・シンプルで、使われるかをまず検証」に方針転換 → 事業企画書を更新、設計書を作成。
6. 要望: 指摘ボタンは「おかしい」と出さない／大問演習は模試と分けて多めにストック／撮影採点は早めに／フル模試は紙で／GA4 → 実装。
7. 運営者が AWS を準備する間に: テスト・CI・セキュリティ・運用・管理画面（「網羅的に、無理はしなくていい」）。
8. 名前・メール・パスワードの変更、柔らかい配色を含むデザインの切り替えとロゴ複数案 → 運営者が選択。
9. 印刷用 PDF の作成 → 2ページ並べると読めない → 文字を大きくする版 → 「本番に近い大きさにすべき」→ 縮小の不具合を発見・修正。
10. 高校生の「文章が短い」の指摘 → 公式問題を実測し、長文と VII・VIII を延長。
11. AWS や GA を Claude から直接操作したい → クラウドのセッションでは認証の都合で不可。PC のセッションへ移行（このファイル）。

## 10. git に入っていないもの（PC には来ない）
| もの | 対処 |
|---|---|
| 印刷用 PDF（`print/`） | 運営者がチャットで受け取った PDF を保存済みのはず。作り直すなら dev サーバーを起動して印刷画面（`/exams/<id>/print?paper=A4&parts=cover,booklet,mark,write`、`&text=large`）を Playwright の `page.pdf({preferCSSPageSize:true, printBackground:true})` で出力 |
| 公式過去問の PDF・OCR（`.local/` と作業用フォルダ） | 必要なら大学の公開ページから取り直す（2025年度の英語 PDF は暗号化されているので、ページを画像にして OCR した）。**コミットしない** |
| クラウドのセッションの会話履歴 | このファイルに要点をまとめた |

## 11. 注意点・落とし穴
- `DATA_FILE=/dev/null` はローカルサーバーを壊す。メモリだけにするなら `DATA_FILE=memory`。
- Web の配布物に正解データを含めないこと（`web/src/targets.ts` が以前 EXAMS を import して漏れていた。`check-bundle` が検出する）。
- 撮影採点で範囲外の答え（例: 1〜4 以外）を読んだら「自信なし」にして、利用者に確認させる。
- axe の色のコントラストで、muted / accent の色を暗めに直した経緯がある。配色を変えたら `e2e/a11y.spec.ts` を通す。
- 既存の GitHub OIDC プロバイダがある AWS アカウントでは、`github-oidc.yaml` の `CreateProvider` を `false` に。
- Cognito のドメイン接頭辞は全世界で一意。
