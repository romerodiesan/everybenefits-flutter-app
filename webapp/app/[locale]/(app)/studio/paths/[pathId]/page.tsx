import { StudioPathEditor } from "@/components/studio/studio-path-editor";

export default async function StudioPathPage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const { pathId } = await params;
  return <StudioPathEditor pathId={pathId} />;
}
