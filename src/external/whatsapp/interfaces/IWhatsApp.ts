export type MessageDirection = "inbound" | "outbound";
export type MessageType = "text" | "image" | "audio" | "document" | "unknown";
export type ConversationStatus = "pending_otp" | "active" | "closed";

export interface IMessage {
  conversationId: string;
  messageId?: string;
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
  EventType: string;
  BaseUrl: string;
  instanceName: string;
  chat: {
    phone: string;
    name?: string;
    wa_chatid: string;
    wa_isGroup?: boolean;
  };
  message: {
    text: string;
    content?: string;
    fromMe: boolean;
    wasSentByApi: boolean;
    isGroup: boolean;
    messageTimestamp: number;
    messageid: string;
    type?: string;
    messageType?: string;
    mediaType?: string;
    mimetype?: string;
    mediaBase64?: string;
    mediaUrl?: string;
    sender_pn?: string;
  };
}
