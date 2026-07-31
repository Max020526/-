import { Inbox } from "lucide-react";
export function EmptyState({ title="暂无数据", description="连接 Supabase 后，业务数据会显示在这里。" }: { title?:string; description?:string }) { return <div className="empty"><div><div className="empty-icon"><Inbox size={21}/></div><b>{title}</b><span>{description}</span></div></div>; }
