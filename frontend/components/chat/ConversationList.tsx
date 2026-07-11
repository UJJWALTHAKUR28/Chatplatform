"use client";
import apiClient from "@/lib/apiClient";
import type { Conversation, User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Home, LogOut, Search, X, Check, Users, UserCircle } from "lucide-react";
import Link from "next/link";
import { avatarGradient } from '@/lib/avatarColors';
import SignalMeter from "../ui/Signalmeter";
import ThemeToggle from "../ui/Themetoggle";
import EmberMark from "../ui/Embermark";

interface Props {
  activeId?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function getOtherParticipant(conv: Conversation, me: User): User | null {
  return conv.participants.find((p) => p.id !== me.id) ?? null;
}

function Avatar({ name }: { name: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  const [from, to] = avatarGradient(name);
  return (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {initials}
    </div>
  );
}

export default function ConversationList({ activeId }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get("/chat/conversations/");
      // Backend returns a plain array (pagination_class = None on this endpoint).
      // Guard against accidental paginated shape {results:[]} just in case.
      const data = res.data;
      const list: Conversation[] = Array.isArray(data) ? data : (data?.results ?? []);
      setConversations(list);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll every 10s to catch new conversations started from other devices
  useEffect(() => {
    const t = setInterval(fetchConversations, 10_000);
    return () => clearInterval(t);
  }, [fetchConversations]);

  // User search debounce
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get<User[]>(
          `/auth/users/search/?q=${encodeURIComponent(searchQuery)}`
        );
        setSearchResults(res.data);
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [searchQuery]);

  const startConversation = async (participantId: string) => {
    try {
      const res = await apiClient.post<Conversation>("/chat/conversations/", {
        participant_ids: [participantId],
      });
      setShowNew(false);
      setSearchQuery("");
      router.push(`/chat/${res.data.id}`);
      fetchConversations();
    } catch {
      /* ignore */
    }
  };

  if (!user) return null;

  return (
    <aside className="flex h-full w-full flex-col border-r border-[var(--border)] bg-[var(--bg-raised)] md:w-80 md:flex-shrink-0 lg:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
        <Link href="/chat" title="Home" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
            <EmberMark className="h-4 w-4" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-base italic text-[var(--text-primary)]">
            Ember
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            title="Home"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Home className="h-4 w-4" />
          </Link>
          <ThemeToggle className="mr-1" />
          <button
            onClick={() => setShowNew((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            title="New conversation"
          >
            {showNew ? <X className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </button>
          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-tertiary)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Me */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <Avatar name={user.display_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {user.display_name}
          </p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">{user.email}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="presence-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-bright)]" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-bright)]" />
          </span>
          <Link
            href="/profile"
            title="Edit profile"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]"
          >
            <UserCircle className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* New conversation search */}
      {showNew && (
        <div className="space-y-2 border-b border-[var(--border)] px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </div>
          {searching && (
            <p className="flex items-center gap-2 pl-1 text-xs text-[var(--text-tertiary)]">
              <SignalMeter size="xs" bars={3} />
              Searching…
            </p>
          )}
          {searchResults.length > 0 && (
            <ul className="space-y-1">
              {searchResults.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => startConversation(u.id)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--surface-hover)]"
                  >
                    <Avatar name={u.display_name} />
                    <span className="text-sm text-[var(--text-primary)]">{u.display_name}</span>
                    <Check className="ml-auto h-4 w-4 text-[var(--accent)] opacity-0 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="pl-1 text-xs text-[var(--text-tertiary)]">No users found.</p>
          )}
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <SignalMeter size="md" color="var(--accent)" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Users className="h-8 w-8 text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-tertiary)]">
              No conversations yet.
              <br />
              Search for someone to start chatting.
            </p>
          </div>
        ) : (
          <ul className="py-2">
            {conversations.map((conv) => {
              const other = getOtherParticipant(conv, user);
              const name = other?.display_name ?? "Group";
              const isActive = conv.id === activeId;
              const lastMsg = conv.last_message;
              return (
                <li key={conv.id}>
                  <Link
                    href={`/chat/${conv.id}`}
                    className={`flex items-center gap-3 border-r-2 px-4 py-3 transition ${isActive
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-transparent hover:bg-[var(--surface-hover)]"
                      }`}
                  >
                    <div className="relative">
                      <Avatar name={name} />
                      {conv.unread_count > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] font-[family-name:var(--font-mono)] text-[10px] font-bold text-white">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {name}
                        </span>
                        <span className="flex-shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-[var(--text-tertiary)]">
                          {lastMsg ? timeAgo(lastMsg.created_at) : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                        {lastMsg ? (lastMsg.is_deleted ? "Message deleted" : lastMsg.content) : "No messages yet"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}