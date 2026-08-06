import { access, readFile } from "node:fs/promises";

const files = ["src/index.html", "src/styles.css", "src/app.js", "public/manifest.webmanifest", "public/icon.svg"];
await Promise.all(files.map((file) => access(new URL(`../${file}`, import.meta.url))));
const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
if (/service[_-]?role|sb_secret_/i.test(app)) throw new Error("商城前端不能包含服务器端密钥。");
if (!app.includes("rpc_get_storefront_catalog") || !app.includes("rpc_create_storefront_order")) {
  throw new Error("商城必须使用受控目录和结账 RPC。");
}
console.log("商城源码检查通过。");
