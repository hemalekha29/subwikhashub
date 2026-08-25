import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAllProducts } from '../../hooks/useAllProducts';
import { useCart } from '../../context/CartContext';
import { isOutOfStock } from '../../lib/stock';
import toast from 'react-hot-toast';
import styles from './HamperBuilder.module.css';

const MIN_ITEMS = 2;
const MAX_ITEMS = 4;
const BUNDLE_DISCOUNT = 0.1;

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export default function HamperBuilder() {
  const products = useAllProducts();
  const { dispatch } = useCart();
  const [selectedIds, setSelectedIds] = useState([]);

  const selected = products.filter(p => selectedIds.includes(p.id));
  const subtotal = selected.reduce((sum, p) => sum + p.price, 0);
  const bundlePrice = Math.round(subtotal * (1 - BUNDLE_DISCOUNT));
  const savings = subtotal - bundlePrice;

  const toggle = (id, outOfStock) => {
    if (outOfStock) return;
    setSelectedIds(ids => {
      if (ids.includes(id)) return ids.filter(i => i !== id);
      if (ids.length >= MAX_ITEMS) {
        toast.error(`You can pick up to ${MAX_ITEMS} gifts per hamper`);
        return ids;
      }
      return [...ids, id];
    });
  };

  const addHamperToCart = () => {
    if (selected.length < MIN_ITEMS) {
      toast.error(`Pick at least ${MIN_ITEMS} gifts to build a hamper`);
      return;
    }
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: `bundle_${makeId()}`,
        isBundle: true,
        name: `Custom Hamper (${selected.length} gifts)`,
        tagline: 'Your hand-picked gift hamper',
        price: bundlePrice,
        images: [selected[0].images[0]],
        components: selected.map(p => ({ productId: p.id, slug: p.slug, name: p.name, qty: 1, price: p.price })),
      },
    });
    toast.success('Hamper added to cart!');
    setSelectedIds([]);
  };

  return (
    <div className={`page-container ${styles.page}`}>
      <Helmet>
        <title>Build a Hamper | Subwikha's Hub</title>
        <meta name="description" content="Build your own custom gift hamper — pick 2 to 4 handcrafted gifts and get 10% off the bundle." />
        <link rel="canonical" href="https://subwikhahub.vercel.app/hamper" />
        <meta property="og:title" content="Build a Hamper | Subwikha's Hub" />
        <meta property="og:description" content="Build your own custom gift hamper — pick 2 to 4 handcrafted gifts and get 10% off the bundle." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/hamper" />
      </Helmet>

      <div className={styles.header}>
        <span className="section-label">Mix &amp; Match</span>
        <h1 className={styles.title}>Build a Hamper</h1>
        <p className={styles.subtitle}>
          Pick {MIN_ITEMS}–{MAX_ITEMS} handcrafted gifts and combine them into one beautiful hamper —
          get <strong style={{ color: 'var(--gold)' }}>{BUNDLE_DISCOUNT * 100}% off</strong> the bundle automatically.
        </p>
      </div>

      <div className={styles.grid}>
        {products.map(p => {
          const isSelected = selectedIds.includes(p.id);
          const outOfStock = isOutOfStock(p);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id, outOfStock)}
              disabled={outOfStock}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
              style={outOfStock ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            >
              <img src={p.images[0]} alt={p.name} className={`${styles.cardImg} ${isSelected ? styles.cardImgSelected : ''}`} />
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>{p.name}</p>
                <p className={styles.cardPrice}>{outOfStock ? 'Out of Stock' : `₹${p.price}`}</p>
              </div>
              {isSelected && <span className={styles.checkBadge}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Sticky summary bar */}
      <div className={styles.stickyBar}>
        <span className={styles.stickyCount}>
          {selected.length} of {MAX_ITEMS} gifts selected
        </span>
        {selected.length > 0 && (
          <span className={styles.stickySummary}>
            Subtotal: <span className={styles.stickyOrig}>₹{subtotal}</span>{' '}
            <strong className={styles.stickyPrice}>₹{bundlePrice}</strong>{' '}
            <span className={styles.stickySavings}>(save ₹{savings})</span>
          </span>
        )}
        <button
          className="btn-gold"
          disabled={selected.length < MIN_ITEMS}
          onClick={addHamperToCart}
          style={{ opacity: selected.length < MIN_ITEMS ? 0.5 : 1 }}
        >
          Add Hamper to Cart
        </button>
        <Link to="/shop" className={styles.backLink}>Back to Shop</Link>
      </div>
    </div>
  );
}
