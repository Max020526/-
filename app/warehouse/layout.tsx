import { AppShell } from "@/components/shared/app-shell";
import { AccessGate } from "@/components/shared/access-gate";
const ROLES = ["WAREHOUSE_STAFF"];
export default function WarehouseLayout({children}:{children:React.ReactNode}) { return <AccessGate roles={ROLES}><AppShell portal="warehouse" title="入库端">{children}</AppShell></AccessGate>; }
