"use client";
import { useSocket } from "@/context/SocketContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Smile } from "lucide-react";
import dynamic from "next/dynamic";
import { playSentTick, unlockAudio } from "@/lib/sound";

// Lazy-load emoji picker — it's heavy (~200kb)
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
import type { Theme } from "emoji-picker-react";

interface Props {
  conversationId: string;
}

export default function MessageInput({ conversationId }: Props) {
  const { sendMessage, sendTyping } = useSocket();
  const [content, setContent] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [content]);

  // Typing indicators — debounced, stops after 2s of no input
  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(false);
    }, 2000);
  }, [sendTyping]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    playSentTick();
    setContent("");
    // Stop typing indicator immediately on send
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    sendTyping(false);
    inputRef.current?.focus();
  }, [content, sendMessage, sendTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-emoji-zone]")) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  return (
    <div className="relative border-t border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3">
      {/* Emoji picker popover */}
      {showEmoji && (
        <div
          data-emoji-zone
          className="absolute bottom-20 right-4 z-50 overflow-hidden rounded-2xl shadow-2xl"
        >
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              setContent((prev) => prev + emojiData.emoji);
              inputRef.current?.focus();
            }}
            theme={"dark" as Theme}
            height={380}
            width={320}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji button */}
        <button
          data-emoji-zone
          onClick={() => setShowEmoji((v) => !v)}
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition ${showEmoji
            ? "bg-[var(--accent)] text-white"
            : "text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Text area */}
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
            unlockAudio();
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            const el = e.currentTarget;
            setTimeout(() => {
              el.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 250);
          }}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          maxLength={4000}
          className="flex-1 resize-none overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:cursor-not-allowed disabled:opacity-40"
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-1.5 text-right font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-tertiary)]">
        {content.length}/4000
      </p>
    </div>
  );
}