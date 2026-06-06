import axios, { AxiosInstance } from "axios";

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
      timeout: 10_000,
    });
  }

  async sendText(phoneNumber: string, text: string): Promise<void> {
    await this.client.post("/send/text", {
      number: this.normalizePhone(phoneNumber),
      text,
    });
  }

  // Baixa a mídia de uma mensagem pelo endpoint oficial do Uazapi.
  // Doc: POST /message/download  body { id, return_base64, generate_mp3 }
  async downloadMedia(messageId: string): Promise<Buffer> {
    const response = await this.client.post("/message/download", {
      id:            messageId,
      return_base64: true,
      generate_mp3:  true,
      return_link:   false,
    });

    const base64: string | undefined = response.data?.base64Data;
    if (!base64) throw new Error("Uazapi não retornou base64Data no download da mídia");

    // pode vir como data URI (data:audio/mpeg;base64,xxx) — limpa o prefixo
    const clean = base64.includes(",") ? base64.split(",").pop()! : base64;
    return Buffer.from(clean, "base64");
  }

  async downloadMediaFromUrl(url: string): Promise<Buffer> {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 15_000 });
    return Buffer.from(response.data);
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  }
}
