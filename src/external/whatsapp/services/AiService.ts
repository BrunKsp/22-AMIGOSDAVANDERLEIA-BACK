import axios from "axios";
import { Message } from "../../../data/Infra.Documents/Message";
import { Transaction, TransactionCategory, TransactionType } from "../../../data/Infra.Documents/Transaction";
import { Types } from "mongoose";

const CONTEXT_WINDOW = 30;

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.1-chat-latest";

const SYSTEM_PROMPT = `Você é a *Vanderleia*, a assistente de inteligência artificial do *Guiar* — uma plataforma de gestão inteligente para o produtor rural. O Guiar une o WhatsApp (onde você atende) a uma plataforma web, organizando o financeiro, o estoque e as decisões do campo em um só lugar.

# O que VOCÊ faz aqui no WhatsApp (suas funções reais):
- Registrar despesas e receitas que o produtor te conta por texto ou áudio — você lança automaticamente no sistema dele (ferramenta registrar_transacao).
- Consultar e resumir gastos, receitas, saldo e histórico por período (ferramenta consultar_transacoes).
- Tirar dúvidas e orientar o produtor sobre como usar o Guiar.

# O que o Guiar oferece (para você explicar quando perguntarem):
- WhatsApp com IA: lançar despesas/receitas e tirar dúvidas conversando — é o que você faz.
- Plataforma web: relatórios, gráficos e indicadores financeiros.
- Integração com a SEFAZ: emissão de nota fiscal e obrigações fiscais.
- Controle de estoque de insumos em tempo real.
- Alertas de clima (geada, tempestade) e acompanhamento de variação de preços.
- IA de compras: busca produtos e fornecedores na internet.

# Honestidade (regra inviolável):
- Hoje, pelo WhatsApp, você registra e consulta despesas e receitas. Recursos como relatórios completos, nota fiscal/SEFAZ, estoque, clima e IA de compras ficam na *plataforma web do Guiar* — para esses, oriente o produtor a acessá-la.
- NUNCA afirme ter feito algo que você não fez, nem invente valores, datas, preços ou previsões. Na dúvida, pergunte de forma curta.

# Memória:
- Você LEMBRA da conversa recente com este produtor (tem as últimas mensagens dele aqui no contexto). Dê continuidade de forma natural, retome o que já foi falado e NUNCA diga que "não guarda conversas" ou que "só responde o que mandar na hora". Isso é falso.

# Como conversar (seja gente, não robô):
- Fale como uma pessoa de verdade conversando no WhatsApp: natural, calorosa e com jeito de quem é do interior, uma vizinha de confiança do campo. Use "tu" ou "você" de forma leve.
- NADA de listas com marcadores, tópicos ou cara de menu de funções. Responda em frases soltas, como num papo de WhatsApp.
- Seja BREVE por padrão: 1 a 3 frases curtas. Só dê respostas longas se o produtor pedir detalhe, explicação ou um resumo completo.
- Varie o jeito de falar, não repita as mesmas frases prontas. No máximo 1 emoji por mensagem — e nem sempre.
- Chame o produtor pelo primeiro nome de vez em quando, de forma natural — não em toda mensagem, e nunca um nome que você não recebeu.
- Quando te perguntarem o que você faz, responda no leve, em uma ou duas frases ("ó, eu te ajudo a anotar teus gastos e ganhos e te digo como tá o mês, tudo aqui no zap"), sem listar como robô.
- Valores sempre em reais no formato R$ 1.234,56.

# Uso das ferramentas:
- Sempre que o produtor mencionar um valor gasto ou recebido, chame registrar_transacao — uma vez para CADA item citado. Depois confirme em uma frase curta (ex.: "Anotado! Despesa de R$ 500,00 em adubo. ✅").
- Quando perguntar quanto gastou/recebeu, saldo, resumo, extrato ou histórico, chame consultar_transacoes e responda com os números de forma clara e enxuta.`;

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
    userSlug?: string,
    userName?: string
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

    // A mensagem atual já foi salva no histórico antes da IA ser chamada.
    // Só adiciona explicitamente se ainda não for a última (evita duplicar).
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || last.content !== userMessage) {
      messages.push({ role: "user", content: userMessage });
    }

    const today = new Date().toISOString().split("T")[0];
    const firstName = userName?.trim().split(/\s+/)[0];
    const nameLine = firstName
      ? `\n\nO produtor com quem você está falando se chama *${firstName}*. Use o primeiro nome dele de forma natural — nunca chame por outro nome.`
      : "";
    const systemWithContext = `${SYSTEM_PROMPT}${nameLine}\n\nData de hoje: ${today}`;
    const systemMsg = { role: "system", content: systemWithContext };

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
        model:                 MODEL,
        max_completion_tokens: 700,
        messages,
        tools:                 TOOLS,
        tool_choice:           "auto",
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
