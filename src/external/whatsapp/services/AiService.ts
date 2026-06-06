import Anthropic from "@anthropic-ai/sdk";
import { Message } from "../../../data/Infra.Documents/Message";
import { Types } from "mongoose";

const CONTEXT_WINDOW = 20;

const SYSTEM_PROMPT = `Você é um assistente virtual da plataforma *Amigos da Vanderleia*.
Seu papel é acolher, orientar e responder dúvidas dos membros da comunidade com simpatia e objetividade.
Responda sempre em português brasileiro, de forma amigável e breve (máximo 3 parágrafos).
Não invente informações. Se não souber algo, diga que vai buscar a informação.`;

export class AiService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não definida");
    this.client = new Anthropic({ apiKey });
  }

  async generateReply(
    conversationId: Types.ObjectId,
    userMessage: string
  ): Promise<string> {
    const history = await Message.find({ conversationId })
      .sort({ sentAt: -1 })
      .limit(CONTEXT_WINDOW)
      .lean();

    const messages: Anthropic.MessageParam[] = history
      .reverse()
      .map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
      }));

    messages.push({ role: "user", content: userMessage });

    const response = await this.client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    });

    const block = response.content[0];
    if (block.type !== "text") throw new Error("Resposta inesperada da IA");
    return block.text;
  }
}
