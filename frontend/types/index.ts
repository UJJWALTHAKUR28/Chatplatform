// Shared TypeScript interfaces for the chat application.
// Matches exactly the serializer output shapes from the Django backend.

export interface User {
  id: string;
  display_name: string;
  email?: string; // only present on /auth/me/ response
  date_joined?: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender: User;
  content: string;
  created_at: string;
  is_deleted: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  last_message: Message | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

// WebSocket frame shapes (server → client)
export type WSFrame =
  | { type: "connection_established"; conversation_id: string; user_id: string }
  | { type: "message.new"; message: Message }
  | { type: "typing"; user_id: string; display_name: string; is_typing: boolean }
  | { type: "presence"; user_id: string; display_name: string; is_online: boolean }
  | { type: "error"; code: string; message: string };

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}
