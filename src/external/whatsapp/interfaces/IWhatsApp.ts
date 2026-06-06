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

/**
 * Payload do webhook do Uazapi (evento "messages").
 *
 * O Uazapi entrega o objeto da mensagem dentro de `data` em formato PLANO
 * (id, chatid, messageType, text...). Mantemos também os campos do formato
 * aninhado estilo Baileys (key/message) como opcionais para tolerância, já que
 * dependendo da versão/configuração da instância o shape pode variar.
 */
export interface IUazapWebhookPayload {
  event?: string;
  instance?: string;
  data: IUazapMessageData;
}

export interface IUazapMessageData {
  // ── Formato plano (Uazapi v2) ───────────────────────────────
  id?: string;               // id interno do Uazapi (r + hex)
  messageid?: string;        // id original no provedor (WhatsApp)
  chatid?: string;           // ex: 5511999999999@s.whatsapp.net
  sender?: string;
  senderName?: string;
  pushName?: string;
  fromMe?: boolean;
  wasSentByApi?: boolean;
  isGroup?: boolean;
  messageType?: string;      // text | audio | ptt | image | ...
  type?: string;             // alias eventual de messageType
  messageTimestamp?: number; // em ms (formato plano) ou s (estilo baileys)
  text?: string;
  content?: unknown;
  mimetype?: string;
  fileURL?: string;

  // ── Formato aninhado (estilo Baileys) ───────────────────────
  key?: {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    audioMessage?: {
      url?: string;
      mimetype?: string;
      seconds?: number;
      ptt?: boolean;
    };
  };
}

/** Dados normalizados de uma mensagem recebida, independentes do shape do payload. */
export interface IInboundMessage {
  messageId?: string;     // id usado para dedupe e download
  downloadId?: string;    // id preferido para o endpoint /message/download
  altDownloadId?: string; // id alternativo, caso o primeiro falhe
  phone: string;          // somente dígitos (ex: 5511999999999)
  chatid: string;         // jid completo para responder
  senderName?: string;
  fromMe: boolean;
  wasSentByApi: boolean;
  isGroup: boolean;
  isAudio: boolean;
  text: string;
  mimetype: string;
  sentAt: Date;
}
