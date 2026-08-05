import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const allowedBranch = /^(feature|fix|ui|chore)\/[a-z0-9][a-z0-9-]*$/;
const branch = (process.env.GITHUB_HEAD_REF || execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" })).trim();
const base = (process.env.GITHUB_BASE_REF || "main").trim();
const failures = [];

if (!allowedBranch.test(branch)) {
  failures.push(`分支名 ${branch || "<empty>"} 不符合 feature|fix|ui|chore/小写短横线名称。`);
}

let changedFiles = [];
try {
  changedFiles = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", `origin/${base}...HEAD`], { encoding: "utf8" })
    .split("\n").map((value) => value.trim()).filter(Boolean);
  if (!process.env.GITHUB_ACTIONS) {
    const localFiles = [
      execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR"], { encoding: "utf8" }),
      execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], { encoding: "utf8" }),
      execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { encoding: "utf8" }),
    ].flatMap((output) => output.split("\n").map((value) => value.trim()).filter(Boolean));
    changedFiles = [...new Set([...changedFiles, ...localFiles])];
  }
} catch (error) {
  failures.push(`无法读取相对 ${base} 的变更文件：${error instanceof Error ? error.message : String(error)}`);
}

for (const file of changedFiles) {
  if ((file === ".env" || file.includes("/.env") || /^\.env\./.test(file)) && !file.endsWith(".env.example") && file !== ".env.example") {
    failures.push(`禁止提交环境文件：${file}`);
  }
}

const secretPatterns = [
  { label: "Supabase secret key", pattern: /sb_secret_(?!REPLACE_ME|never_public)[A-Za-z0-9_-]{16,}/i },
  { label: "service role JWT assignment", pattern: /service[_-]?role[^\n:=]{0,30}[:=]\s*["']?eyJ[A-Za-z0-9._-]{20,}/i },
  { label: "database URL with password", pattern: /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/i },
  { label: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

for (const file of changedFiles) {
  if (!existsSync(file)) continue;
  let contents;
  try { contents = readFileSync(file, "utf8"); }
  catch { continue; }
  for (const { label, pattern } of secretPatterns) {
    if (pattern.test(contents)) failures.push(`${file} 疑似包含 ${label}。`);
  }
}

if (process.env.GITHUB_EVENT_PATH && existsSync(process.env.GITHUB_EVENT_PATH)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const body = event.pull_request?.body || "";
  for (const heading of ["修改摘要", "修改文件", "数据库影响", "环境变量", "测试步骤", "已知问题", "Deploy Preview", "回滚方法", "合并门禁"]) {
    if (!body.includes(`## ${heading}`)) failures.push(`Pull Request 描述缺少“${heading}”部分。`);
  }
  for (const migration of changedFiles.filter((file) => /^supabase\/migrations\/.*\.sql$/.test(file))) {
    const filename = migration.split("/").at(-1);
    if (filename && !body.includes(filename)) failures.push(`数据库影响中必须列出 Migration：${filename}`);
  }
}

if (failures.length) {
  console.error(`NEXORA PR 门禁失败：\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`NEXORA PR 门禁通过：${branch}，共检查 ${changedFiles.length} 个变更文件。`);
