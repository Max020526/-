import { ReturnsCenter } from "@/components/returns/returns-center";

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="page"><ReturnsCenter returnId={id} /></main>;
}
