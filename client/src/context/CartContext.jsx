import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'tomanbin:cart';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* armazenamento indisponível */
    }
  }, [items]);

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

  const setQuantity = (id, quantity) =>
    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i))
    );

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
    <CartContext.Provider value={{ items, add, setQuantity, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
