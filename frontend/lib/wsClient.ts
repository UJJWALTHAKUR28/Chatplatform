// WebSocket client factory with auto-reconnect and heartbeat.
//
// Usage:
//   const ws = createChatSocket(conversationId, accessToken, handlers);
//   ws.send({ type: "message.send", content: "Hello 👋" });
//   ws.close();

import type { WSFrame } from "@/types";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

// Custom close codes from the server that should NOT trigger reconnect
const NO_RECONNECT_CODES = new Set([4001, 4003]);

export interface ChatSocketHandlers {
  onMessage: (msg: WSFrame) => void;
  onOpen?: () => void;
  onClose?: (code?: number) => void;
  onError?: (e: Event) => void;
}

export interface ChatSocket {
  send: (data: object) => void;
  close: () => void;
}

export function createChatSocket(
  conversationId: string,
  accessToken: string,
  handlers: ChatSocketHandlers
): ChatSocket {
  let ws: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000; // start at 1s, exponential back-off up to 30s
  let closed = false; // set to true when close() is called explicitly

  function connect() {
    const url = `${WS_BASE}/chat/${conversationId}/?token=${accessToken}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectDelay = 1000; // reset back-off on successful connect
      handlers.onOpen?.();

      // Send heartbeat every 30s to keep presence alive in Redis
      heartbeatTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const frame: WSFrame = JSON.parse(event.data);
        handlers.onMessage(frame);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = (e) => {
      handlers.onError?.(e);
    };

    ws.onclose = (event) => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      handlers.onClose?.(event.code);

      // Don't reconnect for auth/forbidden codes or explicit close
      if (closed || NO_RECONNECT_CODES.has(event.code)) {
        return;
      }

      // Auto-reconnect with exponential back-off
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
        connect();
      }, reconnectDelay);
    };
  }

  connect();

  return {
    send(data: object) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    },
    close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      ws?.close();
    },
  };
}
