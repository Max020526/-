import { AccessGate } from "@/components/shared/access-gate";
import { AppShell } from "@/components/shared/app-shell";

const ROLES = ["employee", "admin"] as const;

export default function InboundLayout({ children }: { children: React.ReactNode }) {
  return <AccessGate roles={ROLES}><AppShell portal="warehouse" title="快速入库">{children}</AppShell></AccessGate>;
}
