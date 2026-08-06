export const APP_ENVIRONMENTS = ["local", "preview", "staging", "production"] as const;
export const APP_SURFACES = ["admin", "operations", "storefront", "wholesale"] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export type AppSurface = (typeof APP_SURFACES)[number];

export type EnvironmentConfiguration = {
  appEnv: AppEnvironment;
  appSurface: AppSurface;
  appName: string;
  siteUrl: string;
  supabaseUrl: string;
};

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

export function validateEnvironmentConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): EnvironmentConfiguration {
  const appEnv = (env.NEXT_PUBLIC_APP_ENV || "").trim().toLowerCase();
  const appSurface = (env.NEXT_PUBLIC_APP_SURFACE || "").trim().toLowerCase();
  const appName = (env.NEXT_PUBLIC_APP_NAME || "").trim();
  const siteUrl = (env.NEXT_PUBLIC_SITE_URL || "").trim();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();

  if (!includes(APP_ENVIRONMENTS, appEnv)) throw new Error("NEXORA 环境配置无效：NEXT_PUBLIC_APP_ENV 不合法。");
  if (!includes(APP_SURFACES, appSurface)) throw new Error("NEXORA 环境配置无效：NEXT_PUBLIC_APP_SURFACE 不合法。");
  if (!appName || !siteUrl || !supabaseUrl) throw new Error("NEXORA 环境配置无效：缺少应用名称、站点 URL 或 Supabase URL。");

  return { appEnv, appSurface, appName, siteUrl, supabaseUrl };
}

export function readEnvironmentConfiguration(): EnvironmentConfiguration | null {
  try {
    return validateEnvironmentConfiguration();
  } catch {
    return null;
  }
}

export function environmentLabel(environment: AppEnvironment) {
  if (environment === "staging") return "STAGING 测试环境 — 当前数据不会进入正式系统";
  if (environment === "preview") return "PREVIEW 预览环境 — 仅供代码审查与验收";
  if (environment === "local") return "LOCAL 本地开发环境";
  return "";
}
