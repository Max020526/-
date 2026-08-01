import test from "node:test";
import assert from "node:assert/strict";
import { friendlyError } from "../lib/errors/friendly-error.ts";

test("database errors are converted to understandable Chinese", () => {
  assert.equal(friendlyError({ message: "duplicate key value violates unique constraint", code: "23505" }), "相同的款号、SKU 或业务标识已经存在，请检查后重试。");
  assert.equal(friendlyError(new Error("permission denied for table inventory")), "当前账号没有执行此操作的权限。");
  assert.equal(friendlyError({ message: "invalid input syntax for type uuid", code: "22P02" }), "提交的数据格式无效，请刷新页面后重试。");
  assert.equal(friendlyError(new Error("deadlock detected")), "系统正忙于处理同一业务，请稍后重试。");
  assert.equal(friendlyError(new Error("internal database detail: relation secret"), "入库失败，库存未发生变化。"), "入库失败，库存未发生变化。");
});
