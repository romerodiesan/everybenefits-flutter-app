import { ThreadDetail } from "@/components/forums/forums-home";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <ThreadDetail threadId={threadId} />;
}
