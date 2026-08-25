import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAllProducts } from '../../hooks/useAllProducts';
import { useProductSalesCount } from '../../hooks/useProductSales';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/ProductCard/ProductCard';
import ShareStrip from '../../components/ShareStrip/ShareStrip';
import PlayNudge from '../../components/PlayNudge/PlayNudge';
import { isOutOfStock, stockRemaining } from '../../lib/stock';
import { trackEvent, toGaItem } from '../../lib/analytics';
import toast from 'react-hot-toast';
import styles from './ProductDetail.module.css';

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, dispatch } = useCart();
  const products = useAllProducts();
  const product = products.find(p => p.slug === slug) ?? products.find(p => p.id === Number(slug));
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  // Defaults to the first price tier so the price shown here always matches the base
  // `price` a customer just saw on the Shop grid card / ProductCard — previously this
  // defaulted to index 1 ("Medium", ₹499), so clicking through from a ₹299 card landed
  // on a page already showing ₹499, which read as a bait-and-switch.
  const [selectedVariant, setSelectedVariant] = useState(
    () => product?.priceVariants?.[0] ?? null
  );
  const [selectedOption, setSelectedOption] = useState(null);
  const [customValues, setCustomValues] = useState({});
  const salesCount = useProductSalesCount(product?.name);

  useEffect(() => {
    if (!product) return;
    trackEvent('view_item', { currency: 'INR', value: product.price, items: [toGaItem(product)] });
  }, [product?.slug]);

  const activePrice = selectedVariant ? selectedVariant.price : product?.price;

  const selectableVariants = product?.variants?.filter(v => v.length < 50 && !/send|dm|instagram|via|checkout/i.test(v)) ?? [];
  const variantNote = product?.variants?.find(v => /send|dm|instagram|via|checkout/i.test(v)) ?? null;

  if (!product) {
    return (
      <div className={`page-container ${styles.notFound}`}>
        <h2>Gift not found</h2>
        <Link to="/shop" className="btn-gold">Back to Shop</Link>
      </div>
    );
  }

  const related = products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
  const discount = product.originalPrice ? Math.round((1 - activePrice / product.originalPrice) * 100) : 0;

  const filledCustomization = (product.customOptions ?? []).reduce((acc, opt) => {
    const v = customValues[opt.key];
    if (v && String(v).trim()) acc[opt.label] = v;
    return acc;
  }, {});
  const hasCustomization = Object.keys(filledCustomization).length > 0;

  let cartPayload = selectedVariant
    ? { ...product, price: selectedVariant.price, variant: selectedVariant.label, id: `${product.id}_${selectedVariant.label}` }
    : product;

  if (hasCustomization) {
    const suffix = hashStr(JSON.stringify(filledCustomization));
    cartPayload = { ...cartPayload, customization: filledCustomization, id: `${cartPayload.id}_c${suffix}` };
  }

  const cartItem = items.find(i => i.id === cartPayload.id);
  const inCart = !!cartItem;
  const outOfStock = isOutOfStock(product);
  const remaining = stockRemaining(product);
  const atStockLimit = remaining !== null && inCart && cartItem.qty >= remaining;

  const handleAddToCart = () => {
    if (outOfStock) return;
    for (let i = 0; i < qty; i++) {
      dispatch({ type: 'ADD_ITEM', payload: cartPayload });
    }
    trackEvent('add_to_cart', { currency: 'INR', value: activePrice * qty, items: [toGaItem(cartPayload, { quantity: qty })] });
    toast.custom((t) => (
      <div style={{
        background: 'var(--black-soft)', border: '1px solid var(--gold-dark)',
        color: 'var(--white)', padding: '14px 20px', display: 'flex',
        alignItems: 'center', gap: '12px', fontSize: '0.85rem'
      }}>
        <span style={{ color: 'var(--gold)' }}>✓</span>
        {qty}× {product.name}{selectedVariant ? ` (${selectedVariant.label})` : ''} added to cart
      </div>
    ), { duration: 2500 });
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    if (!inCart) {
      for (let i = 0; i < qty; i++) {
        dispatch({ type: 'ADD_ITEM', payload: cartPayload });
      }
      trackEvent('add_to_cart', { currency: 'INR', value: activePrice * qty, items: [toGaItem(cartPayload, { quantity: qty })] });
    }
    navigate('/checkout');
  };

  const handleIncrease = () => {
    if (remaining !== null && cartItem.qty >= remaining) {
      toast.error(`Only ${remaining} left in stock`);
      return;
    }
    dispatch({ type: 'UPDATE_QTY', payload: { id: cartPayload.id, qty: cartItem.qty + 1 } });
  };

  const handleDecrease = () => {
    if (cartItem.qty === 1) {
      dispatch({ type: 'REMOVE_ITEM', payload: cartPayload.id });
    } else {
      dispatch({ type: 'UPDATE_QTY', payload: { id: cartPayload.id, qty: cartItem.qty - 1 } });
    }
  };

  const handleRemove = () => {
    dispatch({ type: 'REMOVE_ITEM', payload: cartPayload.id });
    toast('Removed from cart', { icon: null, style: { background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' } });
  };

  const BASE = 'https://subwikhahub.vercel.app';
  const pageTitle = `${product.name} | Subwikha's Hub`;
  const pageDesc = product.description?.substring(0, 160) ?? `Buy ${product.name} from Subwikha's Hub – handcrafted with love.`;
  const pageImg = `${BASE}${product.images[0]}`;
  const pageUrl = `${BASE}/product/${product.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map(img => `${BASE}${img}`),
    description: product.description,
    brand: { "@type": "Brand", name: "Subwikha's Hub" },
    offers: {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "INR",
      price: String(activePrice),
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Subwikha's Hub" },
    },
  };

  // Matches the visible breadcrumb (Home > Shop > product) below — gives Google enough
  // to show a breadcrumb trail in search results instead of the raw URL.
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${BASE}/shop` },
      { "@type": "ListItem", position: 3, name: product.name, item: pageUrl },
    ],
  };

  return (
    <div className={`page-container ${styles.detail}`}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content={pageImg} />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="800" />
        <meta property="og:url" content={pageUrl} />
        <meta property="product:price:amount" content={String(activePrice)} />
        <meta property="product:price:currency" content="INR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={pageImg} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/shop">Shop</Link>
        <span>›</span>
        <span>{product.name}</span>
      </div>

      <PlayNudge />

      {/* Main */}
      <div className={styles.main}>
        {/* Images */}
        <div className={styles.images}>
          <div className={styles.mainImg}>
            <img src={product.images[activeImg]} alt={product.name} loading="lazy" />
            {product.badge && <span className={styles.badge}>{product.badge}</span>}
            {discount > 0 && <span className={styles.discountTag}>−{discount}% OFF</span>}
          </div>
          <div className={styles.thumbs}>
            {product.images.map((img, i) => (
              <button
                key={i}
                className={`${styles.thumb} ${activeImg === i ? styles.thumbActive : ''}`}
                onClick={() => setActiveImg(i)}
              >
                <img src={img} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className={styles.info}>
          <p className={styles.tagline}>{product.tagline}</p>
          <h1 className={styles.name}>{product.name}</h1>

          {salesCount > 0 && (
            <div className={styles.ratingRow}>
              <span style={{ color: '#f5a623', fontSize: '0.8rem' }}>
                🔥 {salesCount} sold this month
              </span>
            </div>
          )}

          <div className={styles.priceBlock}>
            <span className={styles.price}>₹{activePrice.toLocaleString('en-IN')}</span>
            {product.originalPrice && (
              <>
                <span className={styles.origPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</span>
                <span className={styles.savings}>Save ₹{(product.originalPrice - activePrice).toLocaleString('en-IN')}</span>
              </>
            )}
          </div>

          {selectableVariants.length > 0 && (
            <div className={styles.optionSection}>
              <h4 className={styles.optionTitle}>
                Choose Option
                {selectedOption && <span className={styles.variantSelected}>: {selectedOption}</span>}
              </h4>
              <div className={styles.optionChips}>
                {selectableVariants.map(v => (
                  <button
                    key={v}
                    className={`${styles.optionChip} ${selectedOption === v ? styles.optionChipActive : ''}`}
                    onClick={() => {
                      setSelectedOption(v);
                      const idx = selectableVariants.indexOf(v);
                      if (idx < product.images.length) setActiveImg(idx);
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variantNote && (
            <div className={styles.variantNote}>
              <span className={styles.variantNoteIcon}>📩</span>
              <span>{variantNote}</span>
            </div>
          )}

          <p className={styles.description}>{product.description}</p>

          {product.priceVariants && (
            <div className={styles.variantSection}>
              <h4 className={styles.variantTitle}>
                Choose Size
                {selectedVariant && <span className={styles.variantSelected}>: {selectedVariant.label}</span>}
              </h4>
              <div className={styles.variantGrid}>
                {product.priceVariants.map(v => (
                  <button
                    key={v.label}
                    className={`${styles.variantBtn} ${selectedVariant?.label === v.label ? styles.variantBtnActive : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    <span className={styles.variantLabel}>{v.label}</span>
                    <span className={styles.variantPrice}>₹{v.price}</span>
                    <span className={styles.variantDesc}>{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.customOptions?.length > 0 && (
            <div className={styles.optionSection}>
              <h4 className={styles.optionTitle}>Personalize This Gift</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {product.customOptions.map(opt => (
                  <div key={opt.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--gold)', letterSpacing: '0.03em' }}>{opt.label}</label>
                    {opt.type === 'select' ? (
                      <select
                        value={customValues[opt.key] || ''}
                        onChange={e => setCustomValues(v => ({ ...v, [opt.key]: e.target.value }))}
                        style={{ background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '10px 12px', fontSize: '0.85rem' }}
                      >
                        <option value="">Select...</option>
                        {opt.choices.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={customValues[opt.key] || ''}
                        onChange={e => setCustomValues(v => ({ ...v, [opt.key]: e.target.value }))}
                        placeholder={`Enter ${opt.label.toLowerCase()}`}
                        style={{ background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '10px 12px', fontSize: '0.85rem' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.includes}>
            <h4 className={styles.includesTitle}>What's Included</h4>
            <ul className={styles.includesList}>
              {product.includes.map((item, i) => (
                <li key={i}>
                  <span className={styles.includeCheck}>✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.delivery}>
            <span className={styles.deliveryIcon}>⏱</span>
            <span>Estimated delivery: <strong>{product.deliveryDays} business days</strong></span>
          </div>

          {/* Quantity — only show when not yet in cart */}
          {!inCart && !outOfStock && (
            <div className={styles.qtyRow}>
              <span className={styles.qtyLabel}>Quantity</span>
              <div className={styles.qtyControl}>
                <button className={styles.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span className={styles.qtyNum}>{qty}</span>
                <button
                  className={styles.qtyBtn}
                  onClick={() => setQty(q => remaining !== null && q >= remaining ? q : q + 1)}
                >+</button>
              </div>
              {remaining !== null && remaining <= 5 && (
                <span style={{ color: '#f5a623', fontSize: '0.78rem', marginLeft: 10 }}>Only {remaining} left</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            {outOfStock ? (
              <button className={`btn-gold ${styles.buyBtn}`} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Out of Stock
              </button>
            ) : (
              <button className={`btn-gold ${styles.buyBtn}`} onClick={handleBuyNow}>
                Buy Now
              </button>
            )}

            {inCart ? (
              <div className={styles.cartInlineControls}>
                <div className={styles.cartQtyPill}>
                  <button className={styles.cartQtyBtn} onClick={handleDecrease}>−</button>
                  <span className={styles.cartQtyNum}>{cartItem.qty}</span>
                  <button className={styles.cartQtyBtn} onClick={handleIncrease} disabled={atStockLimit} style={atStockLimit ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>+</button>
                </div>
                <button className={styles.removeCartBtn} onClick={handleRemove}>
                  🗑 Remove
                </button>
              </div>
            ) : !outOfStock && (
              <button className={`btn-outline ${styles.cartBtn}`} onClick={handleAddToCart}>
                Add to Cart
              </button>
            )}
          </div>

          {/* Share */}
          <ShareStrip product={product} />

          {/* Trust Badges */}
          <div className={styles.trust}>
            <div className={styles.trustItem}>
              <span>🔒</span>
              <span>Secure Razorpay Checkout</span>
            </div>
            <div className={styles.trustItem}>
              <span>✦</span>
              <span>Luxury Gift Packaging</span>
            </div>
            <div className={styles.trustItem}>
              <span>✦</span>
              <span>No returns on custom orders</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className={styles.related}>
          <div className={styles.relatedHead}>
            <span className="section-label">You May Also Love</span>
            <h2 className={styles.relatedTitle}>Related Gifts</h2>
            <div className="divider" />
          </div>
          <div className={styles.relatedGrid}>
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
