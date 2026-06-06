/**
 * Normaliza um telefone brasileiro para uma forma canônica única,
 * usada como chave de busca/armazenamento de conversas.
 *
 * Resolve as duas variações que quebram o pareamento de conversas:
 *  - presença/ausência do código do país (55)
 *  - presença/ausência do nono dígito em celulares (9XXXX vs XXXX)
 *
 * Saída: 55 + DDD(2) + número de 8 dígitos  ->  ex: 555596870313
 */
export function normalizePhone(phone: string): string {
  let digits = (phone ?? "").replace(/\D/g, "");

  // Remove o código do país (55) quando presente, para isolar DDD + número
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  const ddd = digits.slice(0, 2);
  let local = digits.slice(2);

  // Celular no formato novo (9 dígitos iniciando com 9): remove o nono dígito
  if (local.length === 9 && local.startsWith("9")) {
    local = local.slice(1);
  }

  return `55${ddd}${local}`;
}
