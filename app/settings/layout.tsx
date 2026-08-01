import { AccessGate } from "@/components/shared/access-gate";
import { AppShell } from "@/components/shared/app-shell";
import type { InternalRole } from "@/lib/auth/roles";

const ROLES: readonly InternalRole[] = ["owner", "system_admin"];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate roles={ROLES}><AppShell portal="admin" title="系统设置">{children}</AppShell></AccessGate>;
}
