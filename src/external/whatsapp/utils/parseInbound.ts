import { IUazapMessageData, IInboundMessage } from "../interfaces/IWhatsApp";

const AUDIO_TYPES = ["audio", "ptt", "myaudio", "voice", "audiomessage"];

function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

function stripJid(jid: string): string {
  return (jid || "")
    .replace("@s.whatsapp.net", "")
    .replace("@c.us", "")
    .replace("@lid", "")
    .replace("@g.us", "");
}

/** Normaliza o timestamp para ms, aceitando entrada em segundos ou milissegundos. */
function normalizeTimestamp(ts?: number): Date {
  if (!ts || ts <= 0) return new Date();
  // < 1e12 → está em segundos (timestamps em ms atuais são ~1.7e12)
  return new Date(ts < 1e12 ? ts * 1000 : ts);
}

/**
 * Extrai os dados de uma mensagem recebida do Uazapi, tolerando tanto o
 * formato plano (Uazapi v2: data.id, data.chatid, data.messageType, data.text)
 * quanto o formato aninhado estilo Baileys (data.key, data.message.audioMessage).
 */
export function parseInbound(data: IUazapMessageData): IInboundMessage {
  const key = data.key ?? {};
  const msg = data.message ?? {};

  const chatidRaw = data.chatid || key.remoteJid || data.sender || "";
  const phone     = onlyDigits(stripJid(chatidRaw));

  const rawType   = (data.messageType || data.type || "").toLowerCase();
  const isAudio   =
    AUDIO_TYPES.some((t) => rawType.includes(t)) || !!msg.audioMessage;

  const text = (
    data.text ||
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    ""
  ).trim();

  const mimetype =
    data.mimetype ||
    msg.audioMessage?.mimetype ||
    "audio/ogg";

  // Ids candidatos para dedupe e para o endpoint /message/download.
  // O Uazapi expõe o id interno em `id` e o id do provedor em `messageid`.
  const downloadId    = data.id || data.messageid || key.id || undefined;
  const altDownloadId =
    [data.messageid, key.id, data.id].find((v) => v && v !== downloadId) || undefined;
  const messageId     = data.id || data.messageid || key.id || undefined;

  return {
    messageId,
    downloadId,
    altDownloadId,
    phone,
    chatid: chatidRaw,
    senderName: data.senderName || data.pushName,
    fromMe: data.fromMe ?? key.fromMe ?? false,
    wasSentByApi: data.wasSentByApi ?? false,
    isGroup: data.isGroup ?? !!chatidRaw.includes("@g.us"),
    isAudio,
    text,
    mimetype: mimetype.split(";")[0].trim(),
    sentAt: normalizeTimestamp(data.messageTimestamp),
  };
}
