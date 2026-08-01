import { redirect } from "next/navigation";
import { RETAIL_STOREFRONT_URL } from "@/lib/workspaces";

export default function LegacyCartPage() {
  redirect(RETAIL_STOREFRONT_URL);
}
