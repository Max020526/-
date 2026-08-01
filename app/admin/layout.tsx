import { AppShell } from "@/components/shared/app-shell";
import { AccessGate } from "@/components/shared/access-gate";
const ROLES = ["admin"] as const;
export default function AdminLayout({children}:{children:React.ReactNode}) { return <AccessGate roles={ROLES}><AppShell portal="admin" title="管理端">{children}</AppShell></AccessGate>; }
