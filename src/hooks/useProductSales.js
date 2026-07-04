import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

let cachedOrders = null;
let cachedPromise = null;

function fetchOrdersOnce() {
  if (cachedOrders) return Promise.resolve(cachedOrders);
  if (!cachedPromise) {
    cachedPromise = getDocs(collection(db, 'orders'))
      .then(snap => {
        cachedOrders = snap.docs.map(d => d.data());
        return cachedOrders;
      })
      .catch(() => {
        cachedOrders = [];
        return cachedOrders;
      });
  }
  return cachedPromise;
}

// Real count of units sold in the last 30 days, matched by product name against order line items.
export function useProductSalesCount(productName) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchOrdersOnce().then(orders => {
      if (cancelled) return;
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let total = 0;
      orders.forEach(o => {
        const created = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : null;
        if (created && created < cutoff) return;
        (o.items || []).forEach(item => {
          if (item.name === productName) total += item.qty || 1;
        });
      });
      setCount(total);
    });
    return () => { cancelled = true; };
  }, [productName]);

  return count;
}
