import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { CfnOutput, Duration, RemovalPolicy, SecretValue, Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as budgets from "aws-cdk-lib/aws-budgets";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export interface MoshiLabProps extends StackProps {
  domainPrefix?: string;
  googleClientId?: string;
  googleSecretName?: string;
  /** エラー通知の送信先メールアドレス（デプロイ時に -c alertEmail=... で指定。リポジトリには書かない） */
  alertEmail?: string;
  /** GA4 の測定ID（G-XXXX）。config.json 経由でフロントに渡す */
  gaId?: string;
  /** 撮影採点を有効にする（Anthropic の APIキーを Secrets Manager に置いてから） */
  photoGrading?: boolean;
  anthropicSecretName?: string;
  /** 月の予算（USD）。超えそうになったら alertEmail に通知（既定 30） */
  monthlyBudgetUsd?: number;
}

/** ログの保管期間（約3か月） */
const LOG_RETENTION = logs.RetentionDays.THREE_MONTHS;

/**
 * 低コスト構成（小規模ならほぼ無料枠内）
 *   CloudFront ─┬─ S3（SPA 静的ファイル）
 *               └─ /api/* → API Gateway HTTP API（JWT 認証）→ Lambda（arm64）→ DynamoDB（オンデマンド）
 *   認証: Cognito User Pool（Lite プラン）+ Hosted UI（Google / メール）
 *   監視: Lambda / API のエラー → CloudWatch アラーム → SNS → メール
 *
 * CloudFront は AWS 管理のキャッシュ／オリジンリクエスト／レスポンスヘッダーポリシーだけを使う。
 * こうしておくと、デプロイ後にコンソールから定額の Free プラン（WAF・IP レート制限込み、月額 $0）に
 * 加入できる（Free / Pro プランはカスタムポリシー不可）。CSP は index.html の meta タグで指定する。
 */
export class MoshiLabStack extends Stack {
  constructor(scope: Construct, id: string, props: MoshiLabProps) {
    super(scope, id, props);

    // ---------- データ ----------
    const table = new dynamodb.TableV2(this, "Table", {
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: "ttl", // 回数制限のカウンタを自動で消す
      // 誤操作・障害に備えて35日分の任意時点に復元できるようにする
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN, // 受験記録を誤って消さない
    });

    // ---------- フロント配信 ----------
    const siteBucket = new s3.Bucket(this, "Site", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ---------- API ----------
    const bundling = {
      format: OutputFormat.ESM,
      minify: true,
      target: "node26",
      externalModules: ["@aws-sdk/*"], // ランタイム同梱の SDK v3 を使う
      banner: "import{createRequire}from'module';const require=createRequire(import.meta.url);",
    };
    let photoWorker: NodejsFunction | undefined;
    const fn = new NodejsFunction(this, "Api", {
      entry: path.join(root, "api/src/lambda.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_26_X, // Node.js 26（Active LTS、Lambda のサポートは 2029年4月まで）
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(10),
      environment: { TABLE_NAME: table.tableName },
      logGroup: new logs.LogGroup(this, "ApiLogs", { retention: LOG_RETENTION, removalPolicy: RemovalPolicy.DESTROY }),
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      bundling,
      depsLockFilePath: path.join(root, "package-lock.json"),
      projectRoot: root,
    });
    table.grantReadWriteData(fn);

    // ---------- 撮影採点（任意） ----------
    // 画像は S3 に一時保存（1日で自動削除）→ 読み取り用 Lambda（最長2分）が Claude で読み取り、結果を DynamoDB へ
    if (props.photoGrading) {
      const photoBucket = new s3.Bucket(this, "PhotoUploads", {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        encryption: s3.BucketEncryption.S3_MANAGED,
        lifecycleRules: [{ expiration: Duration.days(1) }],
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      });
      const anthropicSecret = secretsmanager.Secret.fromSecretNameV2(this, "AnthropicKey", props.anthropicSecretName ?? "moshi-lab/anthropic");
      const worker = new NodejsFunction(this, "PhotoReader", {
        entry: path.join(root, "api/src/photo-worker.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_26_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 1024,
        timeout: Duration.minutes(2),
        retryAttempts: 0, // 失敗したら利用者に撮り直してもらう（同じ画像で二重に課金しない）
        environment: { TABLE_NAME: table.tableName, PHOTO_BUCKET: photoBucket.bucketName, ANTHROPIC_SECRET: anthropicSecret.secretName },
        logGroup: new logs.LogGroup(this, "PhotoReaderLogs", { retention: LOG_RETENTION, removalPolicy: RemovalPolicy.DESTROY }),
        loggingFormat: lambda.LoggingFormat.JSON,
        applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
        bundling,
        depsLockFilePath: path.join(root, "package-lock.json"),
        projectRoot: root,
      });
      table.grantReadWriteData(worker);
      photoBucket.grantRead(worker);
      photoBucket.grantDelete(worker);
      anthropicSecret.grantRead(worker);
      photoBucket.grantPut(fn);
      worker.grantInvoke(fn);
      fn.addEnvironment("PHOTO_BUCKET", photoBucket.bucketName);
      fn.addEnvironment("PHOTO_WORKER", worker.functionName);
      photoWorker = worker;
    }

    const httpApi = new apigw.HttpApi(this, "HttpApi", {});

    // ---------- CloudFront ----------
    const apiOrigin = new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`);
    // API: キャッシュしない（CachingDisabled）＋ Host 以外の全ヘッダを転送（AllViewerExceptHostHeader）。
    // Authorization ヘッダはこの管理ポリシーで転送される（キャッシュしないので認可済みレスポンスの共有も起きない）。
    // 静的ファイルのセキュリティヘッダは管理ポリシー SECURITY_HEADERS（HSTS・nosniff・X-Frame-Options 等）。

    // SPA ルーティング: 拡張子のないパスは index.html を返す（/api/* には適用しない）
    const spaRewrite = new cloudfront.Function(this, "SpaRewrite", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(
        "function handler(event){var r=event.request;if(r.uri.indexOf('.')===-1){r.uri='/index.html';}return r;}",
      ),
    });

    const siteOrigin = origins.S3BucketOrigin.withOriginAccessControl(siteBucket);
    const distribution = new cloudfront.Distribution(this, "Cdn", {
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200, // 日本を含み、最も高い地域を除外
      defaultBehavior: {
        origin: siteOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        functionAssociations: [{ function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      additionalBehaviors: {
        "/api/*": {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
        "/config.json": {
          origin: siteOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
      },
    });
    const siteUrl = `https://${distribution.distributionDomainName}`;

    // ---------- 認証 ----------
    const userPool = new cognito.UserPool(this, "Users", {
      featurePlan: cognito.FeaturePlan.LITE,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      // メールアドレスの変更は、新しいアドレスの確認コードが入力されるまで元のアドレスのまま（打ち間違いでログインできなくなるのを防ぐ）
      keepOriginal: { email: true },
      passwordPolicy: { minLength: 8, requireSymbols: false },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const providers = [cognito.UserPoolClientIdentityProvider.COGNITO];
    let google: cognito.UserPoolIdentityProviderGoogle | undefined;
    if (props.googleClientId) {
      google = new cognito.UserPoolIdentityProviderGoogle(this, "Google", {
        userPool,
        clientId: props.googleClientId,
        clientSecretValue: SecretValue.secretsManager(props.googleSecretName ?? "moshi-lab/google-oauth", { jsonField: "clientSecret" }),
        scopes: ["openid", "email", "profile"],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          emailVerified: cognito.ProviderAttribute.GOOGLE_EMAIL_VERIFIED,
          fullname: cognito.ProviderAttribute.GOOGLE_NAME,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
        },
      });
      providers.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
    }

    const domainPrefix = props.domainPrefix ?? `moshi-lab-${this.account}`;
    const domain = userPool.addDomain("Domain", {
      cognitoDomain: { domainPrefix },
      managedLoginVersion: cognito.ManagedLoginVersion.CLASSIC_HOSTED_UI,
    });

    const client = userPool.addClient("Web", {
      generateSecret: false, // SPA なので公開クライアント + PKCE
      supportedIdentityProviders: providers,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        // COGNITO_ADMIN: 本人が自分のメールアドレス・パスワードを変更するため（自分の属性の読み書きだけ）
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE, cognito.OAuthScope.COGNITO_ADMIN],
        callbackUrls: [`${siteUrl}/callback`, "http://localhost:5173/callback"],
        logoutUrls: [`${siteUrl}/`, "http://localhost:5173/"],
      },
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
    });
    if (google) client.node.addDependency(google);
    // 退会時に API がアカウントを削除できるようにする
    fn.addEnvironment("USER_POOL_ID", userPool.userPoolId);
    userPool.grant(fn, "cognito-idp:AdminDeleteUser");

    // 運営者のグループ。管理画面（/admin）と /api/admin/* はこのグループの人だけが使える。
    // 自分のユーザーを追加: aws cognito-idp admin-add-user-to-group --user-pool-id <UserPoolId> --username <ユーザー名> --group-name admin
    new cognito.CfnUserPoolGroup(this, "AdminGroup", { userPoolId: userPool.userPoolId, groupName: "admin", description: "模試ラボの運営者" });

    // ---------- ルート ----------
    // 登録なしで使えるルート（JWT 認証なし）。HTTP API は具体的なルートを優先するので、
    // 残りの /api/{proxy+}（JWT 認証付き）より先に当たる。
    const authorizer = new HttpJwtAuthorizer("Jwt", `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`, {
      jwtAudience: [client.userPoolClientId],
    });
    const integration = new HttpLambdaIntegration("ApiInt", fn);
    httpApi.addRoutes({ path: "/api/health", methods: [apigw.HttpMethod.GET], integration });
    httpApi.addRoutes({ path: "/api/exams", methods: [apigw.HttpMethod.GET], integration });
    httpApi.addRoutes({ path: "/api/exams/{proxy+}", methods: [apigw.HttpMethod.GET], integration });
    httpApi.addRoutes({ path: "/api/guest/attempts", methods: [apigw.HttpMethod.POST], integration });
    httpApi.addRoutes({ path: "/api/feedback", methods: [apigw.HttpMethod.POST], integration });
    httpApi.addRoutes({ path: "/api/{proxy+}", methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration, authorizer });

    // 濫用対策のスロットリング（デフォルトステージ）
    const stage = httpApi.defaultStage!.node.defaultChild as apigw.CfnStage;
    stage.defaultRouteSettings = { throttlingBurstLimit: 50, throttlingRateLimit: 20 };
    // アクセスログ（不審なアクセスの調査用。IP・UA・ステータスを記録し約3か月保管）
    const accessLogs = new logs.LogGroup(this, "ApiAccessLogs", { retention: LOG_RETENTION, removalPolicy: RemovalPolicy.DESTROY });
    stage.accessLogSettings = {
      destinationArn: accessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        time: "$context.requestTime",
        ip: "$context.identity.sourceIp",
        ua: "$context.identity.userAgent",
        method: "$context.httpMethod",
        path: "$context.path",
        status: "$context.status",
        latency: "$context.responseLatency",
        sub: "$context.authorizer.claims.sub",
        error: "$context.error.message",
      }),
    };

    // ---------- 監視・エラー通知 ----------
    const alarmTopic = new sns.Topic(this, "Alarms", { displayName: "模試ラボ アラート" });
    if (props.alertEmail) alarmTopic.addSubscription(new subs.EmailSubscription(props.alertEmail));
    const notify = new cwActions.SnsAction(alarmTopic);
    const fiveMin = Duration.minutes(5);
    const alarms: [string, cloudwatch.IMetric, number, string][] = [
      ["ApiErrors", fn.metricErrors({ period: fiveMin, statistic: "Sum" }), 1, "Lambda（API）で未処理の例外が発生しました"],
      ["ApiThrottles", fn.metricThrottles({ period: fiveMin, statistic: "Sum" }), 1, "Lambda（API）がスロットリングされました"],
      ["Api5xx", httpApi.metricServerError({ period: fiveMin, statistic: "Sum" }), 1, "API が 5xx を返しました"],
      ["Api4xxSpike", httpApi.metricClientError({ period: fiveMin, statistic: "Sum" }), 300, "API の 4xx が急増しています（ボット・不正アクセスの可能性）"],
    ];
    // アプリが握りつぶした例外（500 を返したもの）もログから拾う
    const appErrors = new logs.MetricFilter(this, "AppErrorFilter", {
      logGroup: fn.logGroup,
      metricNamespace: "MoshiLab",
      metricName: "AppErrors",
      filterPattern: logs.FilterPattern.stringValue("$.level", "=", "ERROR"),
      metricValue: "1",
      defaultValue: 0,
    });
    alarms.push(["AppErrors", appErrors.metric({ period: fiveMin, statistic: "Sum" }), 1, "アプリケーションのエラーログが出力されました"]);
    if (photoWorker) alarms.push(["PhotoReaderErrors", photoWorker.metricErrors({ period: fiveMin, statistic: "Sum" }), 1, "撮影採点の読み取りで未処理の例外が発生しました"]);
    for (const [id, metric, threshold, description] of alarms) {
      const alarm = new cloudwatch.Alarm(this, id, {
        metric,
        threshold,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: description,
      });
      alarm.addAlarmAction(notify);
    }

    // ---------- 費用の監視（AWS Budgets） ----------
    if (props.alertEmail) {
      new budgets.CfnBudget(this, "MonthlyBudget", {
        budget: {
          budgetName: "moshi-lab-monthly",
          budgetType: "COST",
          timeUnit: "MONTHLY",
          budgetLimit: { amount: props.monthlyBudgetUsd ?? 30, unit: "USD" },
        },
        notificationsWithSubscribers: [80, 100].map((threshold) => ({
          notification: { notificationType: threshold === 100 ? "FORECASTED" : "ACTUAL", comparisonOperator: "GREATER_THAN", threshold, thresholdType: "PERCENTAGE" },
          subscribers: [{ subscriptionType: "EMAIL", address: props.alertEmail! }],
        })),
      });
    }

    // ---------- フロントのデプロイ ----------
    new s3deploy.BucketDeployment(this, "DeploySite", {
      destinationBucket: siteBucket,
      sources: [
        s3deploy.Source.asset(path.join(root, "web/dist")),
        s3deploy.Source.jsonData("config.json", {
          authMode: "cognito",
          cognitoDomain: domain.baseUrl(),
          clientId: client.userPoolClientId,
          region: this.region,
          googleEnabled: !!google,
          ...(props.gaId ? { gaId: props.gaId } : {}),
          photoGrading: !!props.photoGrading,
        }),
      ],
      distribution,
      distributionPaths: ["/*"],
      memoryLimit: 512,
    });

    new CfnOutput(this, "SiteUrl", { value: siteUrl });
    new CfnOutput(this, "CognitoDomain", { value: domain.baseUrl() });
    new CfnOutput(this, "GoogleRedirectUri", { value: `${domain.baseUrl()}/oauth2/idpresponse`, description: "Google Cloud Console の「承認済みのリダイレクト URI」に登録する" });
    new CfnOutput(this, "UserPoolClientId", { value: client.userPoolClientId });
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId, description: "運営者を admin グループに追加するときに使う" });
    new CfnOutput(this, "TableName", { value: table.tableName });
    new CfnOutput(this, "AlarmTopicArn", {
      value: alarmTopic.topicArn,
      description: props.alertEmail ? "通知先メールに届く確認メールのリンクを開いて購読を有効にしてください" : "-c alertEmail=... を付けて再デプロイすると、エラー時にメールが届きます",
    });
  }
}
