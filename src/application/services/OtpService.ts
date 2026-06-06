import { OtpToken } from "../../data/Infra.Documents/OtpToken";
import { UazapService } from "../../external/whatsapp/services/UazapService";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;

export class OtpService {
  private uazap: UazapService;

  constructor() {
    this.uazap = new UazapService();
  }

  async sendOtp(phoneNumber: string, userSlug: string): Promise<void> {
    await OtpToken.deleteMany({ phoneNumber, verified: false });

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OtpToken.create({ phoneNumber, userSlug, code, expiresAt, attempts: 0 });

    const message =
      `🔐 *Amigos da Vanderleia*\n\n` +
      `Seu código de verificação é: *${code}*\n\n` +
      `Válido por ${OTP_EXPIRY_MINUTES} minutos. Não compartilhe este código.`;

    await this.uazap.sendText(phoneNumber, message);
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const token = await OtpToken.findOne({
      phoneNumber,
      verified: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!token) throw new Error("Código expirado ou não encontrado. Solicite um novo.");

    if (token.attempts >= MAX_ATTEMPTS) {
      await OtpToken.deleteOne({ _id: token._id });
      throw new Error("Número de tentativas excedido. Solicite um novo código.");
    }

    if (token.code !== code) {
      token.attempts += 1;
      await token.save();
      const remaining = MAX_ATTEMPTS - token.attempts;
      throw new Error(`Código incorreto. ${remaining} tentativa(s) restante(s).`);
    }

    token.verified = true;
    await token.save();
    return true;
  }

  private generateCode(): string {
    return Math.floor(100_000 + Math.random() * 900_000).toString();
  }
}
