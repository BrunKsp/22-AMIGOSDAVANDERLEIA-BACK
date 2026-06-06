import axios from "axios";
import { Message } from "../../../data/Infra.Documents/Message";
import { Transaction, TransactionCategory, TransactionType } from "../../../data/Infra.Documents/Transaction";
import { Types } from "mongoose";

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
- Quando o produtor registrar um gasto ou receita, SEMPRE chame registrar_transacao
- Quando o produtor perguntar sobre gastos, resumo, quanto gastou ou recebeu, SEMPRE chame consultar_transacoes
- Após registrar ou consultar, responda de forma clara e amigável`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "registrar_transacao",
      description:
        "Registra um gasto (despesa) ou receita do produtor rural. " +
        "Chame sempre que o usuário mencionar um valor gasto ou recebido.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["despesa", "receita"],
            description: "Se é um gasto (despesa) ou entrada de dinheiro (receita)",
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
            description: "Data no formato YYYY-MM-DD. Use a data de hoje se não informada.",
          },
        },
        required: ["type", "description", "value", "category", "date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_transacoes",
      description:
        "Consulta o histórico de gastos e receitas do produtor. " +
        "Chame quando o usuário perguntar sobre quanto gastou, quanto recebeu, resumo do mês, extrato, balanço ou histórico financeiro.",
      parameters: {
        type: "object",
        properties: {
          mes: {
            type: "string",
            description: "Mês no formato YYYY-MM (ex: 2026-06). Use o mês atual se não informado.",
          },
          type: {
            type: "string",
            enum: ["despesa", "receita", "todos"],
            description: "Filtrar por tipo. Use 'todos' para ver tudo.",
          },
        },
        required: ["mes", "type"],
      },
    },
  },
];

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

    const messages: any[] = history
      .reverse()
      .map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content,
      }));

    messages.push({ role: "user", content: userMessage });

    const today = new Date().toISOString().split("T")[0];
    const systemWithDate = `${SYSTEM_PROMPT}\n\nData de hoje: ${today}`;
    const systemMsg = { role: "system", content: systemWithDate };

    const firstResponse = await this.callOpenAI([systemMsg, ...messages]);
    const choice = firstResponse.choices[0];

    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
      return { reply: choice.message.content ?? "Recebi sua mensagem! Como posso ajudar? 🌾" };
    }

    // Processa TODOS os tool_calls retornados (OpenAI exige resposta para cada um)
    let transaction: ExtractedTransaction | undefined;
    const toolResponses: any[] = [];

    for (const toolCall of choice.message.tool_calls) {
      const toolName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      let toolResult: object;

      if (toolName === "registrar_transacao") {
        transaction = {
          type:        args.type,
          description: args.description,
          value:       args.value,
          category:    args.category,
          date:        new Date(args.date),
          rawMessage:  userMessage,
        };
        toolResult = { success: true, registered: args };

      } else if (toolName === "consultar_transacoes" && userSlug) {
        const [ano, mesNum] = (args.mes as string).split("-").map(Number);
        const inicio = new Date(ano, mesNum - 1, 1);
        const fim    = new Date(ano, mesNum, 1);

        const filtro: any = { userSlug, date: { $gte: inicio, $lt: fim } };
        if (args.type !== "todos") filtro.type = args.type;

        const transacoes = await Transaction.find(filtro).sort({ date: 1 }).lean();

        const totalDespesas = transacoes
          .filter((t) => t.type === "despesa")
          .reduce((s, t) => s + t.value, 0);
        const totalReceitas = transacoes
          .filter((t) => t.type === "receita")
          .reduce((s, t) => s + t.value, 0);

        const porCategoria: Record<string, number> = {};
        for (const t of transacoes) {
          porCategoria[t.category] = (porCategoria[t.category] ?? 0) + t.value;
        }

        toolResult = {
          mes:             args.mes,
          totalDespesas,
          totalReceitas,
          saldo:           totalReceitas - totalDespesas,
          porCategoria,
          quantidadeTotal: transacoes.length,
          itens: transacoes.map((t) => ({
            data:      t.date.toISOString().split("T")[0],
            tipo:      t.type,
            descricao: t.description,
            valor:     t.value,
            categoria: t.category,
          })),
        };
      } else {
        toolResult = { error: "Não foi possível processar." };
      }

      toolResponses.push({
        role:         "tool",
        tool_call_id: toolCall.id,
        content:      JSON.stringify(toolResult),
      });
    }

    // Segunda chamada: IA recebe os resultados de todos os tools e gera a resposta final
    const secondResponse = await this.callOpenAI([
      systemMsg,
      ...messages,
      {
        role:       "assistant",
        content:    choice.message.content ?? null,
        tool_calls: choice.message.tool_calls,
      },
      ...toolResponses,
    ]);

    const reply = secondResponse.choices[0].message.content ?? "Pronto! ✅";
    return { reply, transaction };
  }

  private async callOpenAI(messages: any[]) {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model:      "gpt-4o-mini",
        max_tokens: 600,
        messages,
        tools:      TOOLS,
        tool_choice: "auto",
      },
      {
        headers: {
          Authorization:  `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  }
}
