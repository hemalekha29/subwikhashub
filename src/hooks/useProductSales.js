import { useState, useEffect } from 'react';

let cachedCounts = null;
let cachedPromise = null;

function fetchCountsOnce() {
  if (cachedCounts) return Promise.resolve(cachedCounts);
  if (!cachedPromise) {
    cachedPromise = fetch('/api/product-sales')
      .then(res => res.json())
      .then(data => {
        cachedCounts = data.counts || {};
        return cachedCounts;
      })
      .catch(() => {
        cachedCounts = {};
        return cachedCounts;
      });
  }
  return cachedPromise;
}

// Real count of units sold in the last 30 days, matched by product name — computed
// server-side by api/product-sales.js (see that file for why: this used to read the raw
// `orders` collection directly from the browser, which broke once Firestore rules were
// locked down to admin-only).
export function useProductSalesCount(productName) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCountsOnce().then(counts => {
      if (cancelled) return;
      setCount(counts[productName] || 0);
    });
    return () => { cancelled = true; };
  }, [productName]);

  return count;
}
