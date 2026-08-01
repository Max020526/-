import { AccessGate } from "@/components/shared/access-gate";
import { AppShell } from "@/components/shared/app-shell";
const ROLES = ["employee", "admin"] as const;
export default function CatalogLayout({ children }: { children: React.ReactNode }) { return <AccessGate roles={ROLES}><AppShell portal="warehouse" title="商品查询">{children}</AppShell></AccessGate>; }
