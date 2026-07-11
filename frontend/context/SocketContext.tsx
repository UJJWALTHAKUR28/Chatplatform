"use client";

import { createChatSocket, type ChatSocket } from "@/lib/wsClient";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/tokenStorage";
import type { Message, WSFrame } from "@/types";
import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Auto-clear typing indicator after this many ms with no update (matches server TYPING_TTL + buffer)
const TYPING_TIMEOUT_MS = 6000;

interface TypingUser {
  user_id: string;
  display_name: string;
}

interface OnlineUsers {
  [user_id: string]: boolean;
}

interface SocketContextValue {
  isConnected: boolean;
  typingUsers: TypingUser[];
  onlineUsers: OnlineUsers;
  sendMessage: (content: string) => void;
  sendTyping: (isTyping: boolean) => void;
  markRead: () => void;
  onNewMessage: (handler: (msg: Message) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
  conversationId: string;
}

/**
 * Silently refresh the JWT access token before opening the WebSocket.
 * Always tries the refresh endpoint if a refresh token exists.
 * Falls back to existing access token on 5xx / network errors.
 * Only returns null when there are genuinely no tokens at all.
 */
async function getFreshToken(): Promise<string | null> {
  const access = getAccessToken();
  const refresh = getRefreshToken();

  // No tokens at all — cannot authenticate
  if (!access && !refresh) return null;
  // No refresh token — use the current access token as-is
  if (!refresh) return access;

  try {
    const res = await axios.post(`${API_URL}/token/refresh/`, { refresh });
    const { access: newAccess, refresh: newRefresh } = res.data;
    setTokens(newAccess, newRefresh ?? refresh);
    return newAccess;
  } catch (err) {
    // On genuine auth failure (401/403), the refresh token is dead — give up
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 401 || status === 403) {
      return null;
    }
    // On 5xx / network errors, fall back to existing access token
    // (it may still be valid; WS auth will reject it if not)
    return access;
  }
}

export function SocketProvider({ children, conversationId }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({});
  const socketRef = useRef<ChatSocket | null>(null);
  // Stable set of message listeners — never re-created, always the same reference
  const messageHandlers = useRef<Set<(msg: Message) => void>>(new Set());
  // Per-user timers to auto-clear stuck typing indicators
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Helper: clear a single user from the typing list (also clears their timer)
  const clearTypingUser = useCallback((user_id: string) => {
    setTypingUsers((prev) => prev.filter((u) => u.user_id !== user_id));
    const timer = typingTimers.current.get(user_id);
    if (timer) {
      clearTimeout(timer);
      typingTimers.current.delete(user_id);
    }
  }, []);

  // Helper: set/refresh a typing user and their auto-clear timer
  const setTypingUser = useCallback(
    (user_id: string, display_name: string) => {
      // Reset auto-expire timer
      const existing = typingTimers.current.get(user_id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => clearTypingUser(user_id), TYPING_TIMEOUT_MS);
      typingTimers.current.set(user_id, timer);

      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.user_id !== user_id);
        return [...filtered, { user_id, display_name }];
      });
    },
    [clearTypingUser]
  );

  useEffect(() => {
    if (!conversationId) return;

    let isMounted = true;
    let socket: ChatSocket | null = null;

    async function initSocket() {
      // Retry up to 5 times if token isn't available yet (e.g. Railway cold-start
      // causing the bootstrap refresh call to take several seconds)
      let token: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        token = await getFreshToken();
        if (token) break;
        if (!isMounted) return;
        // Wait 3s before retrying
        await new Promise((res) => setTimeout(res, 3000));
      }
      if (!token || !isMounted) return;

      socket = createChatSocket(conversationId, token, {
        onOpen: () => {
          if (isMounted) setIsConnected(true);
        },
        onClose: (code) => {
          if (isMounted) {
            setIsConnected(false);
            // Clear all typing states on disconnect (they'll re-sync on reconnect)
            setTypingUsers([]);
            typingTimers.current.forEach((t) => clearTimeout(t));
            typingTimers.current.clear();
          }
          // Auth errors — force re-login
          if (code === 4001 || code === 4003) {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("auth:logout"));
            }
          }
        },
        onMessage: (frame: WSFrame) => {
          if (!isMounted) return;

          switch (frame.type) {
            case "message.new":
              // Deliver to all registered MessageThread subscribers
              messageHandlers.current.forEach((h) => h(frame.message));
              break;

            case "typing":
              if (frame.is_typing) {
                setTypingUser(frame.user_id, frame.display_name);
              } else {
                clearTypingUser(frame.user_id);
              }
              break;

            case "presence":
              setOnlineUsers((prev) => ({
                ...prev,
                [frame.user_id]: frame.is_online,
              }));
              break;

            case "connection_established":
              // Server confirmed WS is ready — nothing extra needed
              break;

            default:
              break;
          }
        },
      });

      if (isMounted) {
        socketRef.current = socket;
      } else {
        socket.close();
      }
    }

    initSocket();

    return () => {
      isMounted = false;
      socket?.close();
      if (socketRef.current && socketRef.current !== socket) {
        socketRef.current.close();
      }
      socketRef.current = null;
      setIsConnected(false);
      setTypingUsers([]);
      typingTimers.current.forEach((t) => clearTimeout(t));
      typingTimers.current.clear();
    };
  }, [conversationId, setTypingUser, clearTypingUser]);

  const sendMessage = useCallback((content: string) => {
    socketRef.current?.send({ type: "message.send", content });
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.send({ type: "typing", is_typing: isTyping });
  }, []);

  const markRead = useCallback(() => {
    socketRef.current?.send({ type: "mark_read" });
  }, []);

  const onNewMessage = useCallback((handler: (msg: Message) => void) => {
    messageHandlers.current.add(handler);
    return () => {
      messageHandlers.current.delete(handler);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        typingUsers,
        onlineUsers,
        sendMessage,
        sendTyping,
        markRead,
        onNewMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside <SocketProvider>");
  return ctx;
}
