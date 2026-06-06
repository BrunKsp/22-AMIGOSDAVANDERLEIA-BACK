import axios from "axios";
import { Message } from "../../../data/Infra.Documents/Message";
import { Types } from "mongoose";
import { TransactionCategory, TransactionType } from "../../../data/Infra.Documents/Transaction";

const CONTEXT_WINDOW = 20;

const SYSTEM_PROMPT = `Você é a *Vanderleia*, assistente financeira virtual especializada em agronegócio.
Você ajuda pequenos produtores rurais a controlarem suas finanças de forma simples e prática pelo WhatsApp.

Suas responsabilidades:
- Registrar e consultar gastos com insumos (sementes, fertilizantes, defensivos, combustível, mão de obra)
- Registrar receitas de vendas de produtos (soja, milho, arroz, café, boi, leite, etc.)
- Mostrar resumos financeiros por período ou por cultura plantada
- Informar sobre preços de commodities (soja, milho, arroz, café, boi gordo)
- Alertar sobre previsão do tempo e eventos climáticos relevantes para o campo
- Sugerir fornecedores de insumos conforme o nicho do produtor

Regras:
- Responda sempre em português brasileiro informal e acolhedor, como uma vizinha de confiança do campo
- Seja breve e objetiva (máximo 3 parágrafos)
- Use emojis com moderação para deixar a conversa mais leve
- Nunca invente informações. Se não souber algo, diga que vai buscar
- Quando o produtor registrar um gasto ou receita, SEMPRE chame a função registrar_transacao com os dados extraídos
- Após registrar, confirme o registro de forma clara e amigável na sua resposta de texto`;

const TRANSACTION_TOOL = {
  type: "function" as const,
  function: {
    name: "registrar_transacao",
    description:
      "Registra um gasto (despesa) ou receita do produtor rural no sistema financeiro. " +
      "Chame esta função sempre que o usuário mencionar um valor gasto ou recebido.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["despesa", "receita"],
          description: "Se é um gasto (despesa) ou uma entrada de dinheiro (receita)",
        },
        description: {
          type: "string",
          description: "Descrição curta do que foi comprado, vendido ou gasto",
        },
        value: {
          type: "number",
          description: "Valor em reais (somente o número, sem R$)",
        },
        category: {
          type: "string",
          enum: ["insumos", "maquinario", "mao_de_obra", "combustivel", "arrendamento", "receitas", "outros"],
          description:
            "Categoria: insumos (sementes/fertilizantes/defensivos), maquinario, mao_de_obra, combustivel, arrendamento, receitas (vendas), outros",
        },
        date: {
          type: "string",
          description: "Data da transação no formato YYYY-MM-DD. Use a data de hoje se não informada.",
        },
      },
      required: ["type", "description", "value", "category", "date"],
    },
  },
};

export interface ExtractedTransaction {
  type: TransactionType;
  description: string;
  value: number;
  category: TransactionCategory;
  date: Date;
  rawMessage: string;
}

export interface AiReplyResult {
  reply: string;
  transaction?: ExtractedTransaction;
}

export class AiService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY não definida");
    this.apiKey = apiKey;
  }

  async generateReply(
    conversationId: Types.ObjectId,
    userMessage: string,
    userSlug?: string
  ): Promise<AiReplyResult> {
    const history = await Message.find({ conversationId })
      .sort({ sentAt: -1 })
      .limit(CONTEXT_WINDOW)
      .lean();

    const messages: { role: string; content: string }[] = history
      .reverse()
      .map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
      }));

    messages.push({ role: "user", content: userMessage });

    const today = new Date().toISOString().split("T")[0];
    const systemWithDate = `${SYSTEM_PROMPT}\n\nData de hoje: ${today}`;

    const firstResponse = await this.callOpenAI([
      { role: "system", content: systemWithDate },
      ...messages,
    ]);

    const choice = firstResponse.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments) as {
        type: TransactionType;
        description: string;
        value: number;
        category: TransactionCategory;
        date: string;
      };

      const transaction: ExtractedTransaction = {
        type: args.type,
        description: args.description,
        value: args.value,
        category: args.category,
        date: new Date(args.date),
        rawMessage: userMessage,
      };

      // Segunda chamada para obter a resposta de texto após o tool call
      const secondResponse = await this.callOpenAI([
        { role: "system", content: systemWithDate },
        ...messages,
        {
          role: "assistant",
          content: choice.message.content ?? null,
          tool_calls: choice.message.tool_calls,
        } as any,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: true, registered: args }),
        } as any,
      ]);

      const reply = secondResponse.choices[0].message.content ?? "Registrado! ✅";
      return { reply, transaction };
    }

    return { reply: choice.message.content ?? "Recebi sua mensagem! Como posso ajudar? 🌾" };
  }

  private async callOpenAI(messages: any[]) {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages,
        tools: [TRANSACTION_TOOL],
        tool_choice: "auto",
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  }
}
