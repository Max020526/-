import type { Authorization } from "@/lib/auth/permissions";

export function PermissionDiagnostics({ authorization, failedPermission }: { authorization: Authorization | null; failedPermission: string | null }) {
  if (process.env.NODE_ENV !== "development") return null;

  return <details className="notice" style={{ marginTop: 16 }}>
    <summary>权限诊断（仅开发环境）</summary>
    <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 11, marginTop: 10 }}>
      {JSON.stringify({
        currentUserId: authorization?.currentUserId ?? null,
        role: authorization?.role ?? null,
        permissions: authorization?.permissions ?? [],
        warehouseIds: authorization?.warehouseIds ?? [],
        failedPermission,
      }, null, 2)}
    </pre>
  </details>;
}
