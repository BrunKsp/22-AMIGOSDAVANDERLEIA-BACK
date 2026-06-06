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
        apikey: token,
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

  async downloadMedia(messageKey: { remoteJid: string; fromMe: boolean; id: string }): Promise<Buffer> {
    const response = await this.client.post(
      "/message/download",
      { key: messageKey },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(response.data);
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  }
}
