import { AppShell } from "@/components/shared/app-shell";
import { AccessGate } from "@/components/shared/access-gate";
import { ADMIN_ROLES } from "@/lib/auth/roles";
export default function AdminLayout({children}:{children:React.ReactNode}) { return <AccessGate roles={ADMIN_ROLES}><AppShell portal="admin" title="内部管理端">{children}</AppShell></AccessGate>; }
