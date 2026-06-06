import { EstoqueItem } from "../../data/Infra.Documents/EstoqueItem";
import { EstoqueMovimentacao } from "../../data/Infra.Documents/EstoqueMovimentacao";
import { CreateEstoqueItemDto } from "../dtos/CreateEstoqueItemDto";
import { UpdateEstoqueItemDto } from "../dtos/UpdateEstoqueItemDto";
import { MovimentarEstoqueDto } from "../dtos/MovimentarEstoqueDto";

export class EstoqueService {

  async listar(userSlug: string, categoria?: string) {
    const query: Record<string, unknown> = { userSlug };
    if (categoria) query.categoria = categoria;

    const items = await EstoqueItem.find(query).sort({ nome: 1 }).lean();
    return items.map(item => ({
      ...item,
      emAlerta: item.quantidade <= item.estoqueMinimo,
    }));
  }

  async buscarPorId(userSlug: string, id: string) {
    const item = await EstoqueItem.findOne({ _id: id, userSlug }).lean();
    if (!item) throw new Error("Item não encontrado");
    return { ...item, emAlerta: item.quantidade <= item.estoqueMinimo };
  }

  async criar(userSlug: string, dto: CreateEstoqueItemDto) {
    return EstoqueItem.create({ ...dto, userSlug });
  }

  async atualizar(userSlug: string, id: string, dto: UpdateEstoqueItemDto) {
    // só campos permitidos do DTO entram no $set (userSlug nunca é alterável aqui)
    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) update[k] = v;
    }

    const item = await EstoqueItem.findOneAndUpdate(
      { _id: id, userSlug },
      { $set: update },
      { returnDocument: "after" }
    ).lean();
    if (!item) throw new Error("Item não encontrado");
    return { ...item, emAlerta: item.quantidade <= item.estoqueMinimo };
  }

  async deletar(userSlug: string, id: string) {
    const result = await EstoqueItem.deleteOne({ _id: id, userSlug });
    if (result.deletedCount === 0) throw new Error("Item não encontrado");
    await EstoqueMovimentacao.deleteMany({ itemId: id, userSlug });
  }

  async movimentar(userSlug: string, id: string, dto: MovimentarEstoqueDto) {
    const delta = dto.tipo === "entrada" ? dto.quantidade : -dto.quantidade;

    // Atualização ATÔMICA: o filtro garante que a saída só ocorre se houver
    // saldo suficiente, evitando estoque negativo e lost update em concorrência.
    const filtro: Record<string, unknown> = { _id: id, userSlug };
    if (dto.tipo === "saida") filtro.quantidade = { $gte: dto.quantidade };

    const item = await EstoqueItem.findOneAndUpdate(
      filtro,
      { $inc: { quantidade: delta } },
      { returnDocument: "after" }
    );

    if (!item) {
      const existe = await EstoqueItem.findOne({ _id: id, userSlug }).lean();
      if (!existe) throw new Error("Item não encontrado");
      throw new Error(`Quantidade insuficiente em estoque (disponível: ${existe.quantidade} ${existe.unidade})`);
    }

    await EstoqueMovimentacao.create({
      itemId:     item._id,
      userSlug,
      tipo:       dto.tipo,
      quantidade: dto.quantidade,
      motivo:     dto.motivo,
      origem:     "web",
      data:       new Date(),
    });

    return { ...item.toObject(), emAlerta: item.quantidade <= item.estoqueMinimo };
  }

  async alertas(userSlug: string) {
    const items = await EstoqueItem.find({ userSlug }).lean();
    return items
      .filter(item => item.quantidade <= item.estoqueMinimo)
      .map(item => ({ ...item, emAlerta: true }));
  }

  async movimentacoes(userSlug: string, itemId?: string, limite = 50) {
    const query: Record<string, unknown> = { userSlug };
    if (itemId) query.itemId = itemId;

    return EstoqueMovimentacao.find(query)
      .sort({ data: -1 })
      .limit(limite)
      .populate("itemId", "nome unidade categoria")
      .lean();
  }

  async resumo(userSlug: string) {
    const items = await EstoqueItem.find({ userSlug }).lean();
    const totalItens = items.length;
    const emAlerta   = items.filter(i => i.quantidade <= i.estoqueMinimo).length;

    const porCategoria: Record<string, number> = {};
    items.forEach(i => {
      porCategoria[i.categoria] = (porCategoria[i.categoria] ?? 0) + 1;
    });

    return { totalItens, emAlerta, porCategoria };
  }
}
