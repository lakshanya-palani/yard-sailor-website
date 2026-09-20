import { useAuth } from './useAuth';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { rpc } from '../lib/commerce';

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [count, setCount] = useState(0);
  const currentUser = useRef(null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const user = currentUser.current;
    const version = ++request.current;
    if (!user) { setCount(0); return; }
    const { count: total, error } = await supabase.from('cart_items').select('product_id', { count: 'exact', head: true }).eq('user_id', user);
    if (version === request.current && user === currentUser.current) setCount(error ? 0 : total || 0);
  }, []);
  useEffect(() => {
    let active = true;
    let initialized = false;
    const update = session => {
      if (!active) return;
      const id = session?.user?.id || null;
      if (initialized && currentUser.current === id) return;
      initialized = true;
      if (currentUser.current !== id) setCount(0);
      currentUser.current = id;
      // Keep queries outside the auth callback's lock.
      setTimeout(() => { if (active) refresh(); }, 0);
    };
    update(userId ? { user: { id: userId } } : null);
    const refreshVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const poll = setInterval(refreshVisible, 15000);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      active = false; currentUser.current = null; clearInterval(poll);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [refresh, userId]);
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`cart-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${userId}` }, refresh).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refresh]);
  const add = async productId => {
    const inserted = await rpc('add_product_to_cart', { p_product_id: productId });
    void refresh().catch(() => {});
    return inserted;
  };
  const remove = async productId => {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', currentUser.current).eq('product_id', productId);
    if (error) throw error;
    void refresh().catch(() => {});
  };
  return <CartContext.Provider value={{ userId, count, add, remove, refresh }}>{children}</CartContext.Provider>;
}
// This hook is consumed only inside CartProvider.
// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
