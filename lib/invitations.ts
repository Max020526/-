import { createHash, randomBytes } from "node:crypto";

export const INVITATION_ERRORS: Record<string, string> = {
  TOKEN_MISSING: "邀请链接缺少 token，请联系管理员重新发送邀请。",
  INVITATION_NOT_FOUND: "邀请不存在，请联系管理员重新发送邀请。",
  INVITATION_EXPIRED: "邀请已经过期，请联系管理员延长有效期或重新发送邀请。",
  INVITATION_USED: "邀请已被使用，请直接登录或联系管理员。",
  INVITATION_REVOKED: "邀请已被撤销，请联系管理员重新发送邀请。",
  INVITATION_INVALID: "邀请链接无效，请联系管理员重新发送邀请。",
  EMAIL_MISMATCH: "邮箱与邀请不一致。",
  ACCOUNT_EXISTS: "该邮箱已注册，请直接登录或联系管理员。",
  ROLE_INVALID: "邀请中的岗位已失效，请联系管理员重新发送邀请。",
  WAREHOUSE_INVALID: "邀请中的仓库已失效，请联系管理员重新发送邀请。",
  PROFILE_FAILED: "创建员工资料失败。",
  ROLE_FAILED: "角色绑定失败。",
  WAREHOUSE_FAILED: "仓库绑定失败。",
};

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationState(invitation: { status: string; expires_at: string; used_at: string | null }) {
  if (invitation.status === "revoked") return "INVITATION_REVOKED";
  if (invitation.status === "accepted" || invitation.used_at) return "INVITATION_USED";
  if (invitation.status === "expired" || new Date(invitation.expires_at).getTime() <= Date.now()) return "INVITATION_EXPIRED";
  if (invitation.status !== "pending") return "INVITATION_INVALID";
  return null;
}

export function publicInvitationError(code: string) {
  return INVITATION_ERRORS[code] ?? "账号创建失败，请稍后重试或联系管理员。";
}
