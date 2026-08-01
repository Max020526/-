import { redirect } from "next/navigation";
import { RETAIL_STOREFRONT_URL } from "@/lib/workspaces";

export default function LegacyShopEntry() {
  redirect(RETAIL_STOREFRONT_URL);
}
