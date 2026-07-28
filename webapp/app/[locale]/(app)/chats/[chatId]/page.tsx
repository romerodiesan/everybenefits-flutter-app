"use client";

import { use } from "react";
import { ChatsHome, ConversationPane } from "@/components/chats/chats-home";

export default function ChatConversationPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = use(params);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="hidden min-h-0 flex-1 lg:flex lg:flex-col">
        <ChatsHome selectedId={chatId} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <ConversationPane chatId={chatId} />
      </div>
    </div>
  );
}
