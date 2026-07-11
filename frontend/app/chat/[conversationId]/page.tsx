"use client";
// /chat/[conversationId] — the active conversation thread

import ConversationList from "@/components/chat/ConversationList";
import MessageThread from "@/components/chat/MessageThread";
import { SocketProvider } from "@/context/SocketContext";
import { use } from "react";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: Props) {
  const { conversationId } = use(params);

  return (
    <>
      {/* Sidebar — hidden on mobile when a conversation is open */}
      <div className="hidden w-80 flex-shrink-0 flex-col border-r border-[var(--border)] md:flex lg:w-96">
        <ConversationList activeId={conversationId} />
      </div>

      {/* Message thread — full width on mobile */}
      <main className="flex min-w-0 flex-1 flex-col">
        <SocketProvider conversationId={conversationId}>
          <MessageThread conversationId={conversationId} />
        </SocketProvider>
      </main>
    </>
  );
}