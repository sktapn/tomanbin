/**
 * Busca endereço pelo CEP.
 * Usa o ViaCEP (gratuito, sem chave) e, se ele falhar, a BrasilAPI como reserva.
 * Retorna { street, neighborhood, city, state } ou lança erro.
 */
export async function lookupCep(cep) {
  const digits = String(cep).replace(/\D/g, '');
  if (digits.length !== 8) throw new Error('CEP deve ter 8 números');

  const withTimeout = (url) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
  };

  // 1) ViaCEP
  try {
    const res = await withTimeout(`https://viacep.com.br/ws/${digits}/json/`);
    if (res.ok) {
      const d = await res.json();
      if (d.erro) throw new Error('CEP não encontrado');
      return { street: d.logradouro || '', neighborhood: d.bairro || '', city: d.localidade || '', state: d.uf || '' };
    }
  } catch (err) {
    if (err.message === 'CEP não encontrado') throw err;
    /* ViaCEP fora do ar: tenta a reserva */
  }

  // 2) BrasilAPI (reserva)
  const res = await withTimeout(`https://brasilapi.com.br/api/cep/v1/${digits}`);
  if (res.status === 404) throw new Error('CEP não encontrado');
  if (!res.ok) throw new Error('Não foi possível buscar o CEP agora');
  const d = await res.json();
  return { street: d.street || '', neighborhood: d.neighborhood || '', city: d.city || '', state: d.state || '' };
}

export const maskCep = (v) =>
  String(v)
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
