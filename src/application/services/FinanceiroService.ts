import { Transaction, TransactionCategory, TransactionOrigin, TransactionType } from "../../data/Infra.Documents/Transaction";
import { CreateTransactionDto } from "../dtos/CreateTransactionDto";

export class FinanceiroService {

  async criar(userSlug: string, dto: CreateTransactionDto): Promise<object> {
    return Transaction.create({
      userSlug,
      type: dto.type,
      description: dto.description,
      value: dto.value,
      date: new Date(dto.date),
      category: dto.category ?? "outros",
      origin: dto.origin ?? "web",
    });
  }

  async criarViaWhatsApp(params: {
    userSlug: string;
    type: TransactionType;
    description: string;
    value: number;
    date: Date;
    category: TransactionCategory;
    rawMessage: string;
  }): Promise<object> {
    return Transaction.create({ ...params, origin: "whatsapp" as TransactionOrigin });
  }

  async listar(
    userSlug: string,
    filtros: { tipo?: string; categoria?: string; busca?: string; mes?: string }
  ): Promise<object[]> {
    const query: Record<string, unknown> = { userSlug };

    if (filtros.tipo === "despesa" || filtros.tipo === "receita") {
      query.type = filtros.tipo;
    }
    if (filtros.categoria) {
      query.category = filtros.categoria;
    }
    if (filtros.busca) {
      query.description = { $regex: filtros.busca, $options: "i" };
    }
    if (filtros.mes) {
      const [ano, mes] = filtros.mes.split("-").map(Number);
      query.date = {
        $gte: new Date(ano, mes - 1, 1),
        $lt:  new Date(ano, mes, 1),
      };
    }

    return Transaction.find(query).sort({ date: -1 }).lean();
  }

  async deletar(userSlug: string, id: string): Promise<boolean> {
    const result = await Transaction.deleteOne({ _id: id, userSlug });
    return result.deletedCount > 0;
  }

  async dashboard(userSlug: string, mes?: string): Promise<object> {
    const now = new Date();
    const ano  = mes ? Number(mes.split("-")[0]) : now.getFullYear();
    const mesN = mes ? Number(mes.split("-")[1]) : now.getMonth() + 1;

    const inicioMes = new Date(ano, mesN - 1, 1);
    const fimMes    = new Date(ano, mesN, 1);

    const [transacoesMes, todasTransacoes] = await Promise.all([
      Transaction.find({ userSlug, date: { $gte: inicioMes, $lt: fimMes } }).lean(),
      Transaction.find({ userSlug }).lean(),
    ]);

    const entradasMes  = transacoesMes.filter(t => t.type === "receita").reduce((s, t) => s + t.value, 0);
    const saidasMes    = transacoesMes.filter(t => t.type === "despesa").reduce((s, t) => s + t.value, 0);
    const saldoAtual   = todasTransacoes.reduce((s, t) => t.type === "receita" ? s + t.value : s - t.value, 0);

    // gastos por categoria no mês
    const gastosPorCategoria: Record<string, number> = {};
    transacoesMes.filter(t => t.type === "despesa").forEach(t => {
      gastosPorCategoria[t.category] = (gastosPorCategoria[t.category] ?? 0) + t.value;
    });

    // evolução mensal — últimos 6 meses
    const evolucao = await this.evolucaoMensal(userSlug, ano, mesN);

    // últimas 10 movimentações
    const ultimas = await Transaction.find({ userSlug }).sort({ date: -1 }).limit(10).lean();

    return {
      saldoAtual,
      entradasMes,
      saidasMes,
      resultado: entradasMes - saidasMes,
      gastosPorCategoria,
      evolucao,
      ultimasMovimentacoes: ultimas,
    };
  }

  private async evolucaoMensal(userSlug: string, anoAtual: number, mesAtual: number) {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      let m = mesAtual - i;
      let a = anoAtual;
      if (m <= 0) { m += 12; a -= 1; }
      meses.push({ ano: a, mes: m });
    }

    return Promise.all(
      meses.map(async ({ ano, mes }) => {
        const inicio = new Date(ano, mes - 1, 1);
        const fim    = new Date(ano, mes, 1);
        const docs   = await Transaction.find({ userSlug, date: { $gte: inicio, $lt: fim } }).lean();
        const receitas  = docs.filter(t => t.type === "receita").reduce((s, t) => s + t.value, 0);
        const despesas  = docs.filter(t => t.type === "despesa").reduce((s, t) => s + t.value, 0);
        return { mes: `${ano}-${String(mes).padStart(2, "0")}`, receitas, despesas };
      })
    );
  }
}
