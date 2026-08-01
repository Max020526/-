import { AppShell } from "@/components/shared/app-shell";
import { AccessGate } from "@/components/shared/access-gate";
import { WAREHOUSE_ROLES } from "@/lib/auth/roles";
export default function WarehouseLayout({children}:{children:React.ReactNode}) { return <AccessGate roles={WAREHOUSE_ROLES}><AppShell portal="warehouse" title="仓库与门店端">{children}</AppShell></AccessGate>; }
