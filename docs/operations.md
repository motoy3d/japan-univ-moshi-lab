# 運用手順

検証期間（2026年12月〜2027年3月）に、運営者が定期的に行うことと、困ったときの手順。

## 毎日（5分）

1. **管理画面 `/admin` の「概要」**を見る。
   - 提出数
   - 2回目受験率（目標30%）
   - また受けたい（目標4.0）
   - 問題への指摘
   - 撮影採点の失敗率
2. **「意見」タブで新しい指摘を確認**し、48時間以内に対応する（下の「問題の誤りを直す」）。
3. **アラートのメール**が来ていたら「障害対応」へ。

## 毎週（30分）

- **「設問分析」で要確認の設問（色付き）を見る。**
  - 正答率が20%未満の設問は、正解の誤りか、難しすぎる可能性がある。
  - 識別力が0.1未満の設問は、上位層と下位層で差がつかず、問題として機能していない。
  - 選択の分布で、正解以外に人が集中している選択肢は、正解が二つ考えられる可能性がある。
- **Google アナリティクスで開始率・完了率を見る。** 演習と模試、Web と紙を分けて見る。
  - 開始率 = `exam_start` / `exam_view`
  - 完了率 = `exam_submit` / `exam_start`
- **費用を見る。** AWS の請求ダッシュボードと、Anthropic Console の使用量。
- **事業企画書の「検証方針」の数字を更新する。**

## 問題の誤りを直す

1. 指摘が正しいか、`docs/authoring/README.md` の5章（曖昧さの点検）の観点で確かめる。
2. 原稿（`scripts/build-keio-shogaku-NN.py` や `scripts/build-keio-shogaku-practice.py`）を直し、スクリプトを実行して JSON を作り直す。
3. `npm run validate`、`npm test` を通し、コミットしてデプロイする（GitHub Actions の deploy）。
4. 過去の受験の採点は、提出時点のままで自動では採点し直さない。正解そのものが誤っていた場合は、結果画面に注記を出すか、受験者数が少なければ個別に案内する。
5. 誤りの内容と直し方を `docs/quality/` のその回のレポートに追記する（次の作問で同じ誤りを防ぐため）。

## 障害対応

| アラート | まず見るところ | よくある原因と対処 |
|---|---|---|
| ApiErrors / Api5xx / AppErrors | CloudWatch Logs の Api のロググループ（`level = "ERROR"`） | デプロイ直後なら前のコミットに戻して再デプロイ。DynamoDB のスロットリングなら一時的なもの |
| Api4xxSpike | API のアクセスログ（IP・UA・path） | ボットや大量アクセス。CloudFront の Free プランの WAF でその IP を止める |
| PhotoReaderErrors | PhotoReader のロググループ | APIキーの失効・残高不足（Anthropic Console）、モデルの一時的な不調。利用者には手入力の案内が出るので、急ぎでなければ翌日でよい |
| 予算アラート（80% / 100%予測） | AWS Cost Explorer（サービス別） | 撮影採点の利用が多いなら全体の上限（`LIMITS.photoTotalPerDay`）を下げる。想定外のサービスなら設定を確認 |

CloudWatch Logs Insights でよく使うクエリ:

```
# API のエラー（直近）
fields @timestamp, @message | filter level = "ERROR" | sort @timestamp desc | limit 50

# アクセスの多い IP（API アクセスログ）
stats count(*) as n by ip | sort n desc | limit 20

# 撮影採点の読み取りで「自信なし」の多いもの
filter msg = "photo read done" | stats avg(low) as lowAvg, count(*) as n
```

## データの復元

DynamoDB の PITR で、35日以内の任意の時点の表を**新しい表**として復元できる（AWS コンソール → DynamoDB → バックアップ → 特定時点への復元）。復元した表から必要な項目だけを元の表に戻す。元の表を上書きはしない。

## 退会・データ削除の依頼

利用者は設定画面の「退会する」で自分で削除できる。メールなどで依頼があり、本人確認ができた場合は、運営者が次を行う（`<sub>` は Cognito のユーザーの sub）。

```bash
# 受験記録などの削除: 該当ユーザーで DELETE /api/me を呼ぶのと同じ処理を、管理用スクリプトで行う（必要になったら用意する）
# ログイン用アカウントの削除
aws cognito-idp admin-delete-user --user-pool-id <UserPoolId> --username <ユーザー名>
```

登録なしで受験した結果は、その人の端末にしか残っていない（サーバーには匿名の記録のみ）。

## 運営者を追加する

```bash
aws cognito-idp admin-add-user-to-group --user-pool-id <UserPoolId> --username <ユーザー名> --group-name admin
```

追加した人は、一度ログアウトしてログインし直すと管理画面が使えるようになる。ユーザー名は Cognito のコンソールで確認できる（Google ログインの人は `Google_` で始まる）。

## 回数制限・上限の変更

`api/src/app.ts` の `LIMITS` と `PHOTO_DAILY_LIMIT` を変えてデプロイする。学校の授業などで同じ IP から大勢が受ける予定があれば、事前に `guestPerIpPerDay` を上げておく。
