import RunDashboardLoader from "@/components/repository/RunDashboardLoader";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RunDashboardLoader runId={id} />;
}
