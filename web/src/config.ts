export interface AppConfig {
  /** cognito: 本番（Cognito Hosted UI + Google） / local: 開発用ダミーログイン */
  authMode: "cognito" | "local";
  cognitoDomain?: string; // 例: https://moshi-lab.auth.ap-northeast-1.amazoncognito.com
  clientId?: string;
  googleEnabled?: boolean;
}

let config: AppConfig = { authMode: "local" };

/** デプロイ時に CDK が /config.json を配置する。無ければローカル開発モード */
export async function loadConfig(): Promise<AppConfig> {
  try {
    const r = await fetch("/config.json", { cache: "no-store" });
    if (r.ok && r.headers.get("content-type")?.includes("json")) config = await r.json();
  } catch {
    /* ローカル */
  }
  return config;
}

export const getConfig = () => config;
