import { redirect } from "next/navigation";
import { RETAIL_STOREFRONT_URL } from "@/lib/workspaces";

export default function LegacyOrdersPage() {
  redirect(RETAIL_STOREFRONT_URL);
}
