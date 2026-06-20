import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import styles from './ProductCard.module.css';

function getWishlist() {
  try { return JSON.parse(localStorage.getItem('subwikha_wishlist') || '[]'); }
  catch { return []; }
}

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const [wishlisted, setWishlisted] = useState(() => getWishlist().includes(product.id));
  const cardRef = useRef(null);
  const { items, dispatch } = useCart();

  const cartItem = items.find(i => i.id === product.id);
  const inCart = !!cartItem;

  const handleMouseMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setTilt({ x: ny * -8, y: nx * 8 });
    setShine({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const handleMouseLeave = () => {
    setHovered(false); setImgIdx(0);
    setTilt({ x: 0, y: 0 }); setShine({ x: 50, y: 50 });
  };

  const toggleWishlist = (e) => {
    e.preventDefault(); e.stopPropagation();
    const list = getWishlist();
    const next = wishlisted ? list.filter(id => id !== product.id) : [...list, product.id];
    localStorage.setItem('subwikha_wishlist', JSON.stringify(next));
    setWishlisted(!wishlisted);
    toast(wishlisted ? 'Removed from wishlist' : '❤️ Saved to wishlist', { duration: 1800, icon: null, style: { background: 'var(--black-card)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', fontSize: '0.82rem' } });
  };

  const handleShare = async (e) => {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}/product/${product.slug}`;
    if (navigator.share) navigator.share({ title: product.name, text: product.tagline, url });
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!', { style: { background: 'var(--black-card)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)' } }); }
  };

  const handleAddToCart = (e) => {
    e.preventDefault(); e.stopPropagation();
    dispatch({ type: 'ADD_ITEM', payload: product });
    toast.custom(t => (
      <div className={`${styles.toast} ${t.visible ? styles.toastIn : styles.toastOut}`}>
        <span className={styles.toastCheck}>✓</span>
        <span><strong>{product.name}</strong> added to cart</span>
      </div>
    ), { duration: 2500 });
  };

  const increaseQty = (e) => {
    e.preventDefault(); e.stopPropagation();
    dispatch({ type: 'UPDATE_QTY', payload: { id: product.id, qty: cartItem.qty + 1 } });
  };

  const decreaseQty = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (cartItem.qty === 1) {
      dispatch({ type: 'REMOVE_ITEM', payload: product.id });
    } else {
      dispatch({ type: 'UPDATE_QTY', payload: { id: product.id, qty: cartItem.qty - 1 } });
    }
  };

  const removeFromCart = (e) => {
    e.preventDefault(); e.stopPropagation();
    dispatch({ type: 'REMOVE_ITEM', payload: product.id });
    toast('Removed from cart', { icon: null, style: { background: 'var(--black-card)', color: 'var(--white)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem' } });
  };

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <Link
      ref={cardRef}
      to={`/product/${product.slug}`}
      className={styles.card}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? 'translateY(-4px)' : ''}`,
        transition: hovered
          ? 'transform 0.08s ease, box-shadow 0.3s ease'
          : 'transform 0.5s ease, box-shadow 0.3s ease',
      }}
      onMouseEnter={() => { setHovered(true); if (product.images.length > 1) setImgIdx(1); }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image */}
      <div className={styles.imgWrap}>
        {product.images.map((src, i) => (
          <img
            key={i} src={src} alt={product.name}
            loading="lazy"
            className={`${styles.img} ${imgIdx === i ? styles.imgVisible : ''}`}
          />
        ))}

        {/* Shine */}
        <div
          className={`${styles.shine} ${hovered ? styles.shineOn : ''}`}
          style={{ background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.1) 0%, transparent 55%)` }}
        />

        {/* Top badges */}
        <div className={styles.topLeft}>
          {product.badge && <span className={styles.badge}>{product.badge}</span>}
          {discount > 0 && <span className={styles.discBadge}>−{discount}%</span>}
        </div>

        {/* Top right actions */}
        <div className={styles.topRight}>
          <button className={`${styles.iconBtn} ${wishlisted ? styles.wishlisted : ''}`} onClick={toggleWishlist} aria-label="Wishlist">
            <HeartIcon filled={wishlisted} />
          </button>
          <button className={styles.iconBtn} onClick={handleShare} aria-label="Share">
            <ShareIcon />
          </button>
        </div>

        {/* Image dots */}
        {product.images.length > 1 && (
          <div className={styles.imgDots}>
            {product.images.map((_, i) => (
              <span key={i} className={`${styles.imgDot} ${imgIdx === i ? styles.imgDotActive : ''}`} />
            ))}
          </div>
        )}

        {/* Quick add overlay */}
        {!inCart && (
          <div className={`${styles.quickOverlay} ${hovered ? styles.quickVisible : ''}`}>
            <button className={styles.quickBtn} onClick={handleAddToCart}>
              <CartPlusIcon />
              Quick Add
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <p className={styles.tagline}>{product.tagline}</p>
        <h3 className={styles.name}>{product.name}</h3>

        <div className={styles.ratingRow}>
          <span className={styles.stars}>{'★'.repeat(Math.floor(product.rating))}</span>
          <span className={styles.ratingNum}>{product.rating}</span>
          <span className={styles.reviewCnt}>({product.reviews} reviews)</span>
        </div>

        <div className={styles.priceRow}>
          <span className={styles.price}>₹{product.price.toLocaleString('en-IN')}</span>
          {product.originalPrice && (
            <span className={styles.origPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</span>
          )}
          {discount > 0 && <span className={styles.saveBadge}>Save {discount}%</span>}
        </div>

        <div className={styles.pills}>
          <span className={styles.pill}>
            <TruckIcon />
            {product.deliveryDays} days
          </span>
          {product.customizable && <span className={styles.pill}><EditIcon /> Custom</span>}
        </div>

        {inCart ? (
          <div className={styles.cartControls}>
            <div className={styles.qtyPill}>
              <button className={styles.qtyBtn} onClick={decreaseQty}>−</button>
              <span className={styles.qtyNum}>{cartItem.qty}</span>
              <button className={styles.qtyBtn} onClick={increaseQty}>+</button>
            </div>
            <button className={styles.removeBtn} onClick={removeFromCart} aria-label="Remove from cart">
              <TrashIcon />
              Remove
            </button>
          </div>
        ) : (
          <button className={styles.addBtn} onClick={handleAddToCart}>
            Add to Cart
          </button>
        )}
      </div>
    </Link>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

function CartPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13"/>
      <path d="M16 8h4l3 5v4h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
