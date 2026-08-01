"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => { const update = () => setOnline(navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  if (online) return null;
  return <div className="network-status" role="status"><WifiOff size={14}/>当前离线，已填写内容请暂时不要关闭页面，联网后再提交。</div>;
}
