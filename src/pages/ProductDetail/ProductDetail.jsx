import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { products } from '../../data/products';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/ProductCard/ProductCard';
import ShareStrip from '../../components/ShareStrip/ShareStrip';
import toast from 'react-hot-toast';
import styles from './ProductDetail.module.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const product = products.find(p => p.id === Number(id));
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(
    () => product?.priceVariants?.[1] ?? null
  );
  const [selectedOption, setSelectedOption] = useState(null);

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

  const cartPayload = selectedVariant
    ? { ...product, price: selectedVariant.price, variant: selectedVariant.label, id: `${product.id}_${selectedVariant.label}` }
    : product;

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      dispatch({ type: 'ADD_ITEM', payload: cartPayload });
    }
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
    for (let i = 0; i < qty; i++) {
      dispatch({ type: 'ADD_ITEM', payload: cartPayload });
    }
    navigate('/checkout');
  };

  const BASE = 'https://subwikhashub.vercel.app';
  const pageTitle = `${product.name} | Subwikha's Hub`;
  const pageDesc = product.description?.substring(0, 160) ?? `Buy ${product.name} from Subwikha's Hub – handcrafted with love.`;
  const pageImg = `${BASE}${product.images[0]}`;
  const pageUrl = `${BASE}/product/${product.id}`;

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
      </Helmet>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/shop">Shop</Link>
        <span>›</span>
        <span>{product.name}</span>
      </div>

      {/* Main */}
      <div className={styles.main}>
        {/* Images */}
        <div className={styles.images}>
          <div className={styles.mainImg}>
            <img src={product.images[activeImg]} alt={product.name} />
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
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className={styles.info}>
          <p className={styles.tagline}>{product.tagline}</p>
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.ratingRow}>
            <span className={styles.stars}>{'★'.repeat(Math.floor(product.rating))}</span>
            <span className={styles.ratingText}>{product.rating} · {product.reviews} reviews</span>
          </div>

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

          {/* Quantity */}
          <div className={styles.qtyRow}>
            <span className={styles.qtyLabel}>Quantity</span>
            <div className={styles.qtyControl}>
              <button className={styles.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span className={styles.qtyNum}>{qty}</span>
              <button className={styles.qtyBtn} onClick={() => setQty(q => q + 1)}>+</button>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button className={`btn-gold ${styles.buyBtn}`} onClick={handleBuyNow}>
              Buy Now
            </button>
            <button className={`btn-outline ${styles.cartBtn}`} onClick={handleAddToCart}>
              Add to Cart
            </button>
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
