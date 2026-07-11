"use client";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import type { Conversation, Message, PaginatedResponse } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Home, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { avatarGradient } from "@/lib/avatarColors";
import SignalMeter from "../ui/Signalmeter";
import SoundToggle from "../ui/SoundToggle";
import { playIncomingChime } from "@/lib/sound";

interface Props {
  conversationId: string;
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.slice(0, 2).toUpperCase();
  const [from, to] = avatarGradient(name);
  const sz = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${sz}`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {initials}
    </div>
  );
}

export default function MessageThread({ conversationId }: Props) {
  const { user } = useAuth();
  const { isConnected, typingUsers, onlineUsers, onNewMessage, markRead } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Load conversation meta
  useEffect(() => {
    apiClient
      .get<Conversation>(`/chat/conversations/${conversationId}/`)
      .then((r) => setConversation(r.data))
      .catch(() => { });
  }, [conversationId]);

  // Load initial messages
  useEffect(() => {
    setInitialLoading(true);
    setMessages([]);
    apiClient
      .get<PaginatedResponse<Message>>(`/chat/conversations/${conversationId}/messages/`)
      .then((r) => {
        // Backend returns newest-first; reverse for display (oldest at top)
        setMessages([...r.data.results].reverse());
        setNextCursor(r.data.next);
      })
      .catch(() => { })
      .finally(() => setInitialLoading(false));
  }, [conversationId]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (!initialLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [initialLoading, messages.length]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (!initialLoading) markRead();
  }, [initialLoading, markRead]);

  // Subscribe to real-time new messages
  useEffect(() => {
    return onNewMessage((msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.sender?.id !== user?.id) playIncomingChime();
      markRead();
    });
  }, [onNewMessage, markRead, user?.id]);

  // Load older messages on scroll to top
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = new URL(nextCursor);
      const cursor = url.searchParams.get("cursor") ?? "";
      const r = await apiClient.get<PaginatedResponse<Message>>(
        `/chat/conversations/${conversationId}/messages/?cursor=${cursor}`
      );
      setMessages((prev) => [...[...r.data.results].reverse(), ...prev]);
      setNextCursor(r.data.next);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, conversationId]);

  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!user) return null;

  const otherUser = conversation?.participants.find((p) => p.id !== user.id);
  const otherName = otherUser?.display_name ?? "Unknown";
  const isOtherOnline = otherUser ? (onlineUsers[otherUser.id] ?? false) : false;
  const isTyping = typingUsers.length > 0;

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-raised)] px-4 py-3">
        <Link
          href="/chat"
          title="Back to chats"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg py-1 pr-2 text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)] md:hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
          <span className="hidden text-sm font-medium md:inline">Back</span>
        </Link>
        {otherUser && <Avatar name={otherName} size="md" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{otherName}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {isTyping ? (
              <>
                <SignalMeter size="xs" bars={3} color="var(--accent)" />
                <span className="text-xs text-[var(--accent)]">typing…</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  {isOtherOnline && (
                    <span className="presence-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-bright)]" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${isOtherOnline ? "bg-[var(--accent-bright)]" : "bg-[var(--text-tertiary)]"
                      }`}
                  />
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {isOtherOnline ? "Online" : "Offline"}
                </span>
              </>
            )}
          </div>
        </div>
        <Link
          href="/"
          title="Home"
          className="flex-shrink-0 text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
        >
          <Home className="h-4 w-4" />
        </Link>
        <SoundToggle />
        {/* WS connection indicator */}
        <div title={isConnected ? "Connected" : "Reconnecting…"}>
          {isConnected ? (
            <Wifi className="h-4 w-4 text-[var(--accent-bright)]" />
          ) : (
            <WifiOff className="h-4 w-4 animate-pulse text-[var(--danger)]" />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {/* Sentinel for infinite scroll upward */}
        <div ref={topRef} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-2">
            <SignalMeter size="sm" color="var(--accent)" />
          </div>
        )}

        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <SignalMeter size="md" color="var(--accent)" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <p className="text-2xl">👋</p>
            <p className="text-sm text-[var(--text-secondary)]">Say hello to {otherName}!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender?.id === user.id;
            const prevMsg = messages[idx - 1];
            const showSender = !isMine && msg.sender?.id !== prevMsg?.sender?.id;
            return (
              <MessageBubble key={msg.id} message={msg} isMine={isMine} showSender={showSender} />
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isTyping && (
          <div className="flex items-center gap-2 pl-2 pt-1">
            <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-4 py-2.5">
              <SignalMeter size="xs" color="var(--text-secondary)" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput conversationId={conversationId} />
    </div>
  );
}