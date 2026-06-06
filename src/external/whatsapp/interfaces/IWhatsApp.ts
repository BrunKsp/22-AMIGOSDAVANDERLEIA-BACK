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
  event: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    messageTimestamp?: number;
    messageType?: string;
    message: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      audioMessage?: {
        url: string;
        mimetype: string;
        seconds?: number;
        ptt?: boolean;
        mediaKey?: string;
        fileEncSha256?: string;
        fileSha256?: string;
        fileLength?: string | number;
      };
    };
  };
}
