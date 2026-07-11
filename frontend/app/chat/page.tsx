"use client";
// /chat — shows the conversation list sidebar + empty state

import ConversationList from "@/components/chat/ConversationList";
import EmberMark from "@/components/ui/Embermark";

export default function ChatPage() {
  return (
    <>
      <ConversationList />
      {/* Empty state shown on desktop when no conversation is selected */}
      <main className="hidden flex-1 flex-col items-center justify-center gap-4 bg-[var(--bg)] md:flex">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-tertiary)]">
          <EmberMark className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="font-[family-name:var(--font-display)] text-lg italic text-[var(--text-primary)]">
            Your messages
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Select a conversation or start a new one
          </p>
        </div>
      </main>
    </>
  );
}