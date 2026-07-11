"use client";
import type { Message } from "@/types";

interface Props {
  message: Message;
  isMine: boolean;
  showSender: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isMine, showSender }: Props) {
  if (message.is_deleted) {
    return (
      <div className={`my-0.5 flex ${isMine ? "justify-end" : "justify-start"}`}>
        <span className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs italic text-[var(--text-tertiary)]">
          This message was deleted
        </span>
      </div>
    );
  }

  return (
    <div className={`my-0.5 flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      {showSender && (
        <span className="mb-1 pl-1 text-xs font-medium text-[var(--accent)]">
          {message.sender?.display_name}
        </span>
      )}
      <div
        className={`group relative max-w-[75%] break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMine
          ? "rounded-br-md bg-[var(--accent)] text-white"
          : "rounded-bl-md bg-[var(--surface)] text-[var(--text-primary)]"
          }`}
      >
        {message.content}
        <span
          className={`mt-0.5 block text-right font-[family-name:var(--font-mono)] text-[10px] ${isMine ? "text-white/70" : "text-[var(--text-tertiary)]"
            }`}
        >
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}