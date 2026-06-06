import axios from "axios";
import { Message } from "../../../data/Infra.Documents/Message";
import { Types } from "mongoose";

const CONTEXT_WINDOW = 20;

const SYSTEM_PROMPT = `Você é a *Vanderleia*, assistente financeira virtual especializada em agronegócio.
Você ajuda pequenos produtores rurais a controlarem suas finanças de forma simples e prática pelo WhatsApp.

Suas responsabilidades:
- Registrar e consultar gastos com insumos (sementes, fertilizantes, defensivos, combustível, mão de obra)
- Mostrar resumos financeiros por período ou por cultura plantada
- Informar sobre preços de commodities (soja, milho, arroz, café, boi gordo)
- Alertar sobre previsão do tempo e eventos climáticos relevantes para o campo
- Sugerir fornecedores de insumos conforme o nicho do produtor

Regras:
- Responda sempre em português brasileiro informal e acolhedor, como uma vizinha de confiança do campo
- Seja breve e objetiva (máximo 3 parágrafos)
- Use emojis com moderação para deixar a conversa mais leve
- Nunca invente informações. Se não souber algo, diga que vai buscar
- Quando o produtor registrar um gasto, confirme o registro de forma clara e amigável`;

export class AiService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY não definida");
    this.apiKey = apiKey;
  }

  async generateReply(
    conversationId: Types.ObjectId,
    userMessage: string
  ): Promise<string> {
    const history = await Message.find({ conversationId })
      .sort({ sentAt: -1 })
      .limit(CONTEXT_WINDOW)
      .lean();

    const messages = history
      .reverse()
      .map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
      }));

    messages.push({ role: "user", content: userMessage });

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content as string;
  }
}
