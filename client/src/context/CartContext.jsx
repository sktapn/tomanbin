import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { formatPrice } from '../utils';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const KEY = 'tomanbin:cart';

/**
 * O carrinho guarda também de quem ele é ("owner").
 * - Visitante monta o carrinho e faz login: o carrinho passa a ser dele.
 * - Clicou em "Sair": o carrinho é esvaziado.
 * - Outra pessoa entra no mesmo aparelho: não vê o carrinho da anterior.
 */
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return { owner: null, items: saved }; // formato antigo
    return { owner: saved?.owner || null, items: Array.isArray(saved?.items) ? saved.items : [] };
  } catch {
    return { owner: null, items: [] };
  }
}

const newId = () => `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Converte o carrinho no formato que a API espera (sem preço: o servidor calcula) */
export const toOrderItems = (items) =>
  items.map((i) =>
    i.custom
      ? { custom: { optionId: i.custom.optionId, imageUrl: i.custom.imageUrl, notes: i.custom.notes || '' }, quantity: i.quantity }
      : { product: i._id, quantity: i.quantity }
  );

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(load);
  const { items } = cart;
  const setItems = useCallback((fn) => setCart((c) => ({ ...c, items: typeof fn === 'function' ? fn(c.items) : fn })), []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {
      /* armazenamento indisponível */
    }
  }, [cart]);

  // Dono do carrinho acompanha quem está logado
  useEffect(() => {
    if (!user) return;
    setCart((c) => {
      if (!c.owner) return { ...c, owner: user._id }; // visitante entrou: adota o carrinho
      if (c.owner !== user._id) return { owner: user._id, items: [] }; // outra conta: começa vazio
      return c;
    });
  }, [user]);

  // Clicou em "Sair": esvazia
  useEffect(() => {
    const onSignOut = () => setCart({ owner: null, items: [] });
    window.addEventListener('tomanbin:signed-out', onSignOut);
    return () => window.removeEventListener('tomanbin:signed-out', onSignOut);
  }, []);

  const add = (product, quantity = 1) =>
    setItems((prev) => {
      const found = prev.find((i) => i._id === product._id);
      if (found) {
        return prev.map((i) =>
          i._id === product._id ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) } : i
        );
      }
      return [
        ...prev,
        {
          _id: product._id,
          name: product.name,
          price: product.price,
          image: product.images?.[0],
          stock: product.stock,
          quantity: Math.min(quantity, product.stock),
        },
      ];
    });

  /** Produto personalizado: cada arte é um item separado (feito sob encomenda, sem estoque) */
  const addCustom = ({ option, imageUrl, notes, quantity }) =>
    setItems((prev) => [
      ...prev,
      {
        _id: newId(),
        name: `${option.label} personalizado (${option.detail})`,
        price: option.price,
        image: imageUrl,
        stock: 99,
        quantity,
        custom: { optionId: option.id, imageUrl, notes: notes || '' },
      },
    ]);

  const setQuantity = (id, quantity) =>
    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i))
    );

  /**
   * Confere o carrinho com a loja: preço, estoque e se o produto ainda existe.
   * Assim o cliente nunca vê um preço no carrinho e paga outro no Pix.
   * Devolve a lista de avisos do que mudou.
   */
  const sync = useCallback(async () => {
    const current = load().items;
    if (!current.length) return [];
    const hasCustom = current.some((i) => i.custom);
    const [customCfg, ...results] = await Promise.all([
      hasCustom ? api.get('/custom').then(({ data }) => data).catch(() => undefined) : null,
      ...current.map((i) =>
        i.custom
          ? null
          : api
              .get(`/products/${i._id}`)
              .then(({ data }) => data)
              .catch((err) => ([400, 404].includes(err.response?.status) ? null : undefined))
      ),
    ]);
    const notes = [];
    const next = [];
    current.forEach((item, idx) => {
      if (item.custom) {
        if (customCfg === undefined) return next.push(item); // sem conexão: mantém
        const opt = customCfg?.enabled ? customCfg.options.find((o) => o.id === item.custom.optionId) : null;
        if (!opt) {
          notes.push(`"${item.name}" não está mais disponível e saiu do carrinho.`);
          return;
        }
        if (opt.price !== item.price) notes.push(`O preço de "${item.name}" mudou de ${formatPrice(item.price)} para ${formatPrice(opt.price)}.`);
        return next.push({ ...item, price: opt.price, name: `${opt.label} personalizado (${opt.detail})` });
      }
      const p = results[idx];
      if (p === undefined) return next.push(item); // sem conexão: mantém como está
      if (p === null || !p.active || p.stock === 0) {
        notes.push(`"${item.name}" ${p && p.stock === 0 ? 'esgotou' : 'não está mais disponível'} e saiu do carrinho.`);
        return;
      }
      if (p.price !== item.price) notes.push(`O preço de "${p.name}" mudou de ${formatPrice(item.price)} para ${formatPrice(p.price)}.`);
      const quantity = Math.min(item.quantity, p.stock);
      if (quantity < item.quantity) notes.push(`Só restam ${p.stock} de "${p.name}": ajustamos a quantidade.`);
      next.push({ ...item, name: p.name, price: p.price, image: p.images?.[0], stock: p.stock, quantity });
    });
    setItems(next);
    return notes;
  }, [setItems]);

  const remove = (id) => setItems((prev) => prev.filter((i) => i._id !== id));
  const clear = () => setItems([]);

  const { count, total } = useMemo(
    () => ({
      count: items.reduce((s, i) => s + i.quantity, 0),
      total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, add, addCustom, setQuantity, remove, clear, count, total, sync }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
