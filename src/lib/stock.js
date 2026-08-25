// Shared stock-check logic for every add-to-cart entry point (ProductCard, ProductDetail,
// HamperBuilder, Wishlist). This is a UX guard only — it stops a customer from filling in
// the whole checkout form before finding out an item is unavailable. The actual
// enforcement that can't be bypassed lives server-side in api/create-order.js, which
// re-checks stock against Firestore right before payment and is the real backstop.
//
// `inStock` is a manual admin toggle; `stock` is an optional numeric count. Either one
// saying "none left" is enough to treat the product as unavailable.
export function isOutOfStock(product) {
  if (!product) return true;
  if (product.inStock === false) return true;
  if (typeof product.stock === 'number' && product.stock <= 0) return true;
  return false;
}

// Returns a number if this product tracks numeric stock, otherwise null (made-to-order /
// unlimited items have no `stock` field at all — see AdminProducts.jsx).
export function stockRemaining(product) {
  return typeof product?.stock === 'number' ? product.stock : null;
}
