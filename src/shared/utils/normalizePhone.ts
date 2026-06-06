export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Números brasileiros com até 11 dígitos não têm DDI — adiciona 55
  return digits.length <= 11 ? `55${digits}` : digits;
}
