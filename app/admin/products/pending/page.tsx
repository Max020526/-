import { redirect } from "next/navigation";

export default function PendingProductsCompatibilityPage() {
  redirect("/admin/products?queue=enriching");
}
