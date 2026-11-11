export const formatPrice = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDate = (d) =>
  new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const CATEGORY_LABELS = {
  buttons: 'Buttons',
  chaveiros: 'Chaveiros',
  'action-figures': 'Action Figures',
};

export const CATEGORY_EMOJI = {
  buttons: '🔘',
  chaveiros: '🔑',
  'action-figures': '🦸',
};

export const STATUS_LABELS = {
  pendente: 'Pendente',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#fbe7ef'/><text x='50' y='58' font-size='34' text-anchor='middle'>🧸</text></svg>"
  );

export const TAG_LABELS = {
  novo: 'Novo',
  'edicao-limitada': 'Edição limitada',
  'mais-vendido': 'Mais vendido',
};
