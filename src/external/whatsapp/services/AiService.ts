import axios from "axios";
import { Message } from "../../../data/Infra.Documents/Message";
import { Transaction, TransactionCategory, TransactionType } from "../../../data/Infra.Documents/Transaction";
import { Types } from "mongoose";

const CONTEXT_WINDOW = 30;

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.1-chat-latest";

const SYSTEM_PROMPT = `Você é a *Vanderleia*, a assistente de inteligência artificial do *Guiar* — uma plataforma de gestão para o produtor rural que une o WhatsApp (onde você atende) a uma plataforma web, reunindo financeiro, estoque, fiscal e decisões do campo em um só lugar.

# O que VOCÊ faz aqui no WhatsApp:
- Registra despesas e receitas que o produtor te conta por texto ou áudio — você lança automaticamente no sistema (ferramenta registrar_transacao).
- Consulta e resume gastos, receitas, saldo e histórico por período (ferramenta consultar_transacoes).
- Busca informações atuais na internet quando precisarem: previsão do tempo/clima da cidade do produtor, preço de commodities (soja, milho, trigo, boi, leite...), cotações e fornecedores de insumos (ferramenta buscar_na_web). Nunca invente esses dados — busque.
- Tira dúvidas e orienta sobre o Guiar.

# O Guiar por inteiro (conheça para explicar quando perguntarem):
- WhatsApp com IA (você): lançar despesas/receitas, consultar o financeiro e buscar clima e preços, tudo conversando.
- Plataforma web: relatórios, gráficos e indicadores que transformam os números em decisões claras.
- Integração com a SEFAZ: receitas e despesas entram automaticamente e a nota fiscal é emitida pela plataforma.
- Controle de estoque de insumos em tempo real (entradas e saídas).
- Alertas automáticos de clima (geada, tempestade) e acompanhamento da variação de preços.
- IA de compras: encontra produtos e fornecedores na internet.

# Honestidade (regra inviolável):
- O que você resolve aqui no zap: registrar/consultar o financeiro e buscar informação na web (clima, preços, fornecedores). Faça.
- O que fica na *plataforma web do Guiar*: relatórios completos, emissão de nota fiscal/SEFAZ, controle de estoque e os alertas automáticos de clima. Para esses, oriente o produtor a acessar a plataforma — não diga que você fez aqui.
- NUNCA afirme ter feito algo que não fez, nem invente valores, datas, preços ou previsões. Se não souber e não der pra buscar, diga com simplicidade.

# Memória:
- Você LEMBRA da conversa recente (tem as últimas mensagens deste produtor no contexto). Dê continuidade natural e NUNCA diga que "não guarda conversas" — isso é falso.
- Responda SOMENTE o que foi perguntado. NÃO repita o resumo financeiro (saldo, despesas, receitas) se o produtor não pediu de novo — só mostre números quando ele pedir.
- Se o produtor pedir para ser chamado por outro nome/apelido, use a ferramenta definir_apelido para salvar de verdade (vale pras próximas conversas). Não prometa lembrar de algo sem salvar.

# Seu jeito de falar:
- Converse como uma pessoa real no WhatsApp: simpática, próxima e direta, em português brasileiro do dia a dia. Acolhedora sem exagero — NADA de forçar sotaque, gírias ou caricatura de roça.
- Frases soltas e naturais, sem listas, tópicos ou cara de menu. Sem markdown (o WhatsApp não entende ** ou #); se precisar destacar algo, use um único asterisco, ex.: *adubo*.
- Breve por padrão: 1 a 3 frases. Só se estenda se pedirem detalhe ou um resumo completo.
- Varie as palavras, não repita frases prontas. No máximo 1 emoji, e nem sempre.
- Use o primeiro nome do produtor de vez em quando, com naturalidade.
- Valores em reais no formato R$ 1.234,56.

# Ferramentas:
- Valor gasto ou recebido → registrar_transacao (uma vez por item) e confirme em uma frase ("Anotado! Despesa de R$ 500,00 em adubo. ✅").
- Pergunta sobre quanto gastou/recebeu, saldo, resumo ou histórico → consultar_transacoes e responda enxuto.
- Clima, preço de mercado, cotação ou fornecedor → buscar_na_web e responda com o que encontrou, curto e direto.`;

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
  {
    type: "function" as const,
    function: {
      name: "buscar_na_web",
      description:
        "Busca informações atualizadas na internet em tempo real. Use SEMPRE que o produtor " +
        "pedir: previsão do tempo / clima de uma cidade, preço atual de commodities (soja, milho, " +
        "trigo, boi gordo, leite, etc.), cotação, fornecedores/onde comprar insumos, ou qualquer " +
        "informação atual que você não tenha como saber sozinha. Nunca invente esses dados — busque.",
      parameters: {
        type: "object",
        properties: {
          consulta: {
            type: "string",
            description:
              "O que buscar, em linguagem natural e específica. Inclua cidade/UF quando for clima " +
              "(ex: 'previsão do tempo para Passo Fundo RS nos próximos 3 dias') ou o produto quando for preço " +
              "(ex: 'preço da saca de soja hoje no Rio Grande do Sul').",
          },
        },
        required: ["consulta"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "definir_apelido",
      description:
        "Salva de forma permanente como o produtor quer ser chamado. Chame quando ele pedir para ser " +
        "chamado por outro nome/apelido (ex: 'me chama de Vinícius', 'pode me chamar de seu João'). " +
        "Depois de salvar, esse nome passa a valer em todas as conversas futuras.",
      parameters: {
        type: "object",
        properties: {
          apelido: {
            type: "string",
            description: "Como o produtor quer ser chamado, só o nome/apelido.",
          },
        },
        required: ["apelido"],
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
  preferredName?: string;
}

/**
 * Limpa formatação que o WhatsApp não renderiza (evita asteriscos e markdown
 * aparecendo literais). O WhatsApp usa *um* asterisco para negrito; markdown usa
 * dois. Aqui convertemos **x** -> *x* e removemos títulos e marcadores de lista.
 */
function formatForWhatsApp(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(/\*\*(.+?)\*\*/g, "*$1*")  // **negrito** (markdown) -> *negrito* (WhatsApp)
    .replace(/\*\*/g, "")                // sobras de asteriscos duplos
    .replace(/^#{1,6}\s+/gm, "")        // títulos markdown (###)
    .replace(/^\s*[-•]\s+/gm, "")       // marcadores de lista ( - / • )
    .replace(/^\s*\*\s+/gm, "")         // marcadores de lista com asterisco ( * item )
    .replace(/\n{3,}/g, "\n\n")         // colapsa linhas em branco em excesso
    .trim();
  return cleaned || undefined;
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
    // Ordena por createdAt (hora real de inserção no banco), NÃO por sentAt.
    // sentAt vem do messageTimestamp do provedor e pode chegar corrompido (datas
    // no ano ~58000); isso jogava todas as mensagens inbound para o topo e expulsava
    // as respostas da IA da janela de contexto — a IA não via o próprio histórico e
    // cumprimentava a cada mensagem. createdAt intercala inbound/outbound corretamente.
    const history = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
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

    const agora = new Date();
    const isoHoje = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
    const dataHora = agora.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "full",
      timeStyle: "short",
    });
    const firstName = userName?.trim().split(/\s+/)[0];
    const nameLine = firstName
      ? `\n\nO produtor com quem você está falando se chama *${firstName}*. Use o primeiro nome dele de forma natural — nunca chame por outro nome.`
      : "";
    const systemWithContext =
      `${SYSTEM_PROMPT}${nameLine}` +
      `\n\nData de hoje (use nas transações): ${isoHoje}.` +
      `\nAgora, por extenso (horário de Brasília): ${dataHora}. Você sabe a data e a hora atuais — responda se perguntarem.`;
    const systemMsg = { role: "system", content: systemWithContext };

    const firstResponse = await this.callOpenAI([systemMsg, ...messages]);
    const choice = firstResponse.choices[0];

    if (choice.finish_reason !== "tool_calls" || !choice.message.tool_calls?.length) {
      return { reply: formatForWhatsApp(choice.message.content) ?? "Recebi sua mensagem! Como posso ajudar? 🌾" };
    }

    // Processa TODOS os tool_calls retornados (OpenAI exige resposta para cada um)
    let transaction: ExtractedTransaction | undefined;
    let preferredName: string | undefined;
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
      } else if (toolName === "buscar_na_web") {
        const resultado = await this.searchWeb(args.consulta);
        toolResult = { consulta: args.consulta, resultado };

      } else if (toolName === "definir_apelido") {
        preferredName = String(args.apelido ?? "").trim().slice(0, 60);
        toolResult = preferredName
          ? { success: true, apelido: preferredName }
          : { error: "Apelido inválido." };

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

    const reply = formatForWhatsApp(secondResponse.choices[0].message.content) ?? "Pronto! ✅";
    return { reply, transaction, preferredName };
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

  /**
   * Busca informações atualizadas na internet usando a busca web nativa da OpenAI
   * (Responses API + ferramenta web_search). Retorna um resumo em texto que é
   * devolvido ao modelo principal como resultado da ferramenta buscar_na_web.
   */
  private async searchWeb(consulta: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/responses",
        {
          model: process.env.OPENAI_SEARCH_MODEL ?? "gpt-5.1",
          tools: [{ type: "web_search" }],
          input:
            `Busque na internet e responda de forma objetiva, em português, com os dados mais ` +
            `atuais que encontrar (inclua datas/valores quando houver): ${consulta}`,
        },
        {
          headers: {
            Authorization:  `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30_000,
        }
      );

      const data = response.data;
      // A Responses API pode expor o texto consolidado em output_text...
      if (typeof data.output_text === "string" && data.output_text.trim()) {
        return data.output_text.trim();
      }
      // ...ou dentro dos itens de output (type message -> output_text)
      const texts: string[] = [];
      for (const item of data.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content ?? []) {
            if (c.type === "output_text" && c.text) texts.push(c.text);
          }
        }
      }
      return texts.join("\n").trim() || "Não encontrei informações no momento.";
    } catch (err: any) {
      console.error("[web] Erro na busca web:", err.response?.data ?? err.message);
      return "Não consegui buscar essa informação agora.";
    }
  }
}
