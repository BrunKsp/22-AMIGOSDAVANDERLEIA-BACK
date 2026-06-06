export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "image" | "audio" | "document" | "unknown";
export type ConversationStatus = "pending_otp" | "active" | "closed";

export interface IMessage {
  conversationId: string;
  phoneNumber: string;
  userSlug?: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  rawPayload?: Record<string, unknown>;
  sentAt: Date;
}

export interface IConversation {
  phoneNumber: string;
  userSlug?: string;
  status: ConversationStatus;
  lastMessageAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IOtpToken {
  phoneNumber: string;
  userSlug: string;
  code: string;
  attempts: number;
  expiresAt: Date;
  verified: boolean;
}

export interface IUazapWebhookPayload {
  event: string;
  instance: string;
  data: {
    from: string;
    body: string;
    timestamp: number;
    type?: string;
    mimetype?: string;
    pushName?: string;
  };
}
