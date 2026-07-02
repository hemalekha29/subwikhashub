import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const STORAGE_KEY = 'subwikha_wishlist';
const CHANGE_EVENT = 'subwikha-wishlist-changed';

function readWishlist() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function useWishlist() {
  const [ids, setIds] = useState(readWishlist);

  useEffect(() => {
    const sync = () => setIds(readWishlist());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const isWishlisted = useCallback((id) => ids.includes(id), [ids]);

  const toggle = useCallback((product) => {
    const current = readWishlist();
    const already = current.includes(product.id);
    const next = already ? current.filter(id => id !== product.id) : [...current, product.id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIds(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    if (!already) {
      addDoc(collection(db, 'wishlistEvents'), {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        createdAt: serverTimestamp(),
      }).catch(() => {});
    }
    return !already;
  }, []);

  return { ids, isWishlisted, toggle };
}
