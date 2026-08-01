import { AccessGate } from "@/components/shared/access-gate";
import { AppShell } from "@/components/shared/app-shell";
import { WAREHOUSE_ROLES } from "@/lib/auth/roles";
export default function InventoryLayout({ children }: { children: React.ReactNode }) { return <AccessGate roles={WAREHOUSE_ROLES}><AppShell portal="warehouse" title="库存管理">{children}</AppShell></AccessGate>; }
