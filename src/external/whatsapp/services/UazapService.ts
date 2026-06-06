import axios, { AxiosInstance } from "axios";

export interface DownloadedMedia {
  buffer: Buffer;
  mimetype: string;
  /** Texto transcrito, presente apenas quando a transcrição nativa do Uazapi é usada. */
  transcription?: string;
}

export class UazapService {
  private client: AxiosInstance;

  constructor() {
    const baseUrl = process.env.UAZAP_BASE_URL;
    const token   = process.env.UAZAP_TOKEN;

    if (!baseUrl || !token) throw new Error("UAZAP_BASE_URL e UAZAP_TOKEN são obrigatórios");

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        token: token,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    });
  }

  async sendText(phoneNumber: string, text: string): Promise<void> {
    await this.client.post("/send/text", {
      number: this.normalizePhone(phoneNumber),
      text,
    });
  }

  /**
   * Baixa a mídia de uma mensagem usando o endpoint oficial do Uazapi.
   * Retorna o áudio convertido em MP3 (ideal para o Whisper), em base64.
   *
   * Doc: POST /message/download  body { id, return_base64, generate_mp3 }
   */
  async downloadMedia(messageId: string): Promise<DownloadedMedia> {
    const response = await this.client.post("/message/download", {
      id:            messageId,
      return_base64: true,
      generate_mp3:  true,
      return_link:   false,
    });

    const data = response.data ?? {};
    const base64: string | undefined = data.base64Data;
    if (!base64) {
      throw new Error("Uazapi não retornou base64Data no download da mídia");
    }

    // O base64 pode vir como data URI (data:audio/mpeg;base64,xxxx) — limpa o prefixo.
    const clean = base64.includes(",") ? base64.split(",").pop()! : base64;

    return {
      buffer:   Buffer.from(clean, "base64"),
      mimetype: (data.mimetype || "audio/mpeg").split(";")[0].trim(),
    };
  }

  /**
   * Transcrição nativa do Uazapi (Whisper integrado). Um único call: o Uazapi
   * baixa, descriptografa e transcreve o áudio do WhatsApp.
   *
   * Doc: POST /message/download  body { id, transcribe, openai_apikey }
   */
  async transcribeAudio(messageId: string, openaiApiKey?: string): Promise<string> {
    const response = await this.client.post("/message/download", {
      id:            messageId,
      transcribe:    true,
      generate_mp3:  true,
      return_base64: false,
      return_link:   false,
      ...(openaiApiKey ? { openai_apikey: openaiApiKey } : {}),
    });

    return (response.data?.transcription || "").trim();
  }

  async downloadMediaFromUrl(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 30_000 });
    return Buffer.from(response.data);
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  }
}
