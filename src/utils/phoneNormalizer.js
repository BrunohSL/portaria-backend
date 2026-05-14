// Normaliza telefones brasileiros pra E.164 (+55...).
// Aceita formatos comuns: "19993216314", "(19) 99321-6314", "+5519993216314", etc.
// Lança erro se o número não tem dígitos suficientes pra ser um telefone BR válido.

function normalizeBR(raw) {
  if (!raw) throw new Error('Telefone vazio');
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) throw new Error('Telefone sem dígitos');

  // Já está em E.164 com 55 (12 ou 13 dígitos)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Sem código país, com DDD (10 ou 11 dígitos: DDD + 8|9 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  throw new Error(`Telefone não reconhecido como BR válido: ${raw}`);
}

module.exports = { normalizeBR };
