import { ConversationSkeleton } from "@/components/ui/skeleton";

export default function ChatConversationLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ConversationSkeleton />
    </div>
  );
}
