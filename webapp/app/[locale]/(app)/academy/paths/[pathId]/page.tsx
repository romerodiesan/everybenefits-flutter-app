import { PathDetail } from "@/components/academy/path-detail";

export default async function PathDetailPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const { pathId } = await params;
  return <PathDetail pathId={pathId} />;
}
