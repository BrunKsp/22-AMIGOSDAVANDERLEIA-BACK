import { EstoqueItem } from "../../data/Infra.Documents/EstoqueItem";
import { EstoqueMovimentacao } from "../../data/Infra.Documents/EstoqueMovimentacao";
import { CreateEstoqueItemDto } from "../dtos/CreateEstoqueItemDto";
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

  async atualizar(userSlug: string, id: string, dto: Partial<CreateEstoqueItemDto>) {
    const item = await EstoqueItem.findOneAndUpdate(
      { _id: id, userSlug },
      { $set: dto },
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
    const item = await EstoqueItem.findOne({ _id: id, userSlug });
    if (!item) throw new Error("Item não encontrado");

    if (dto.tipo === "saida" && item.quantidade < dto.quantidade) {
      throw new Error(`Quantidade insuficiente em estoque (disponível: ${item.quantidade} ${item.unidade})`);
    }

    const delta = dto.tipo === "entrada" ? dto.quantidade : -dto.quantidade;
    item.quantidade = Math.max(0, item.quantidade + delta);
    await item.save();

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
