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
    <>
      <div className="hidden h-full lg:block">
        <ChatsHome selectedId={chatId} />
      </div>
      <div className="flex h-full min-h-0 flex-col lg:hidden">
        <ConversationPane chatId={chatId} />
      </div>
    </>
  );
}
