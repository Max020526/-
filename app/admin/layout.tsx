import { AppShell } from "@/components/shared/app-shell";
export default function AdminLayout({children}:{children:React.ReactNode}) { return <AppShell portal="admin" title="管理端">{children}</AppShell>; }
