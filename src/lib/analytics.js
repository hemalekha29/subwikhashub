// Thin wrapper around GA4's gtag (loaded in index.html) — every call is guarded so
// nothing throws if analytics hasn't loaded yet (ad blockers, slow network, GA4 script
// still in flight) or during local dev. See index.html for the gtag() bootstrap.
export function trackEvent(name, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  } catch {
    // analytics must never break the actual page
  }
}

// Standard GA4 Ecommerce "item" shape — https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
export function toGaItem(product, extra = {}) {
  return {
    item_id: product.slug || String(product.id),
    item_name: product.name,
    item_category: product.category,
    price: product.price,
    quantity: product.qty || 1,
    ...extra,
  };
}
