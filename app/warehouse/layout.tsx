import { AppShell } from "@/components/shared/app-shell";
export default function WarehouseLayout({children}:{children:React.ReactNode}) { return <AppShell portal="warehouse" title="入库端">{children}</AppShell>; }
