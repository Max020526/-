import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return <main className="portal-page" style={{ display: "grid", placeItems: "center" }}>
    <div className="notice"><LoaderCircle className="animate-spin" size={16}/>正在加载 NEXORA 工作区…</div>
  </main>;
}
