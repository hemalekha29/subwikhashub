import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import styles from './ProductCard.module.css';

function CardShareBtn({ product, e }) {
  const handleShare = async (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const url = `${window.location.origin}/product/${product.id}`;
    if (navigator.share) {
      navigator.share({ title: product.name, text: product.tagline, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };
  return (
    <button className={styles.shareBtn} onClick={handleShare} aria-label="Share product">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    </button>
  );
}

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50 });
  const cardRef = useRef(null);
  const { dispatch } = useCart();

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const nx = (cx / rect.width - 0.5) * 2;
    const ny = (cy / rect.height - 0.5) * 2;
    setTilt({ x: ny * -10, y: nx * 10 });
    setShine({ x: (cx / rect.width) * 100, y: (cy / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setImgIdx(0);
    setTilt({ x: 0, y: 0 });
    setShine({ x: 50, y: 50 });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'ADD_ITEM', payload: product });
    toast.custom((t) => (
      <div className={`${styles.toast} ${t.visible ? styles.toastIn : styles.toastOut}`}>
        <span className={styles.toastCheck}>✓</span>
        <span><strong>{product.name}</strong> added to cart</span>
      </div>
    ), { duration: 2500 });
  };

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <Link
      ref={cardRef}
      to={`/product/${product.id}`}
      className={styles.card}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? 'translateY(-6px)' : ''}`,
        transition: hovered ? 'transform 0.1s ease, box-shadow 0.3s ease, border-color 0.3s ease' : 'transform 0.5s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}
      onMouseEnter={() => { setHovered(true); setImgIdx(1); }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.imgWrap}>
        {product.images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={product.name}
            className={`${styles.img} ${imgIdx === i ? styles.imgVisible : ''}`}
          />
        ))}

        {/* Shine layer */}
        <div
          className={`${styles.shine} ${hovered ? styles.shineVisible : ''}`}
          style={{ background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.12) 0%, transparent 60%)` }}
        />

        <div className={styles.badges}>
          {product.badge && <span className={styles.badge}>{product.badge}</span>}
          {discount > 0 && <span className={styles.discount}>−{discount}%</span>}
        </div>

        <CardShareBtn product={product} />

        <div className={`${styles.overlay} ${hovered ? styles.overlayVisible : ''}`}>
          <button className={`btn-gold ${styles.addBtn}`} onClick={handleAddToCart}>
            Add to Cart
          </button>
        </div>
      </div>

      <div className={styles.info}>
        <p className={styles.tagline}>{product.tagline}</p>
        <h3 className={styles.name}>{product.name}</h3>
        <div className={styles.meta}>
          <div className={styles.stars}>
            {'★'.repeat(Math.floor(product.rating))}
            <span className={styles.ratingNum}>{product.rating} ({product.reviews})</span>
          </div>
          <div className={styles.priceRow}>
            {product.originalPrice && (
              <span className={styles.origPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</span>
            )}
            <span className={styles.price}>₹{product.price.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
