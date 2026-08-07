import { environmentLabel, readEnvironmentConfiguration } from "@/packages/config/src/environment";

export function EnvironmentBanner() {
  const config = readEnvironmentConfiguration();
  if (!config || config.appEnv === "production") return null;

  return (
    <div className={`environment-banner environment-banner-${config.appEnv}`} role="status">
      <strong>{environmentLabel(config.appEnv)}</strong>
      <span>{config.appName}</span>
    </div>
  );
}
