import { redirect } from "next/navigation";

export default function LegacyTodayInboundPage() {
  redirect("/warehouse/receipts");
}
