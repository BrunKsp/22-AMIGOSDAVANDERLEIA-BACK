import axios, { AxiosInstance } from "axios";

interface SendTextPayload {
  number: string;
  text: string;
}

export class UazapService {
  private client: AxiosInstance;
  private instance: string;

  constructor() {
    const baseUrl  = process.env.UAZAP_BASE_URL;
    const token    = process.env.UAZAP_TOKEN;
    this.instance  = process.env.UAZAP_INSTANCE ?? "";

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
    const payload: SendTextPayload = {
      number: this.normalizePhone(phoneNumber),
      text,
    };

    await this.client.post(`/message/sendText/${this.instance}`, payload);
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  }
}
