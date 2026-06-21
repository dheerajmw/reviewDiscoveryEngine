import QuotesPageClient from "@/components/repository/QuotesPageClient";

export default async function QuotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuotesPageClient runId={id} />;
}
