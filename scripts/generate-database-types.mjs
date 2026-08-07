import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const projectRef = (process.env.STAGING_SUPABASE_PROJECT_REF || "").trim();
if (!/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error("缺少有效的 STAGING_SUPABASE_PROJECT_REF；数据库类型只能从 Staging 生成。");
  process.exit(1);
}

if (projectRef === (process.env.PRODUCTION_SUPABASE_PROJECT_REF || "").trim()) {
  console.error("安全错误：Staging 与 Production project ref 相同，已停止类型生成。");
  process.exit(1);
}

const result = spawnSync(
  "supabase",
  ["gen", "types", "typescript", "--project-id", projectRef, "--schema", "public"],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);

if (result.status !== 0) {
  console.error(result.stderr || "Supabase 类型生成失败。请先运行 supabase login。");
  process.exit(result.status || 1);
}

if (!result.stdout.includes("export type Database")) {
  console.error("Supabase CLI 返回内容不完整，未覆盖现有类型文件。");
  process.exit(1);
}

const output = resolve("packages/types/src/database.types.ts");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, result.stdout, "utf8");
console.log(`已从 Staging 生成数据库类型：${output}`);
