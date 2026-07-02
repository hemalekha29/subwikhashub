import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAllProducts } from '../../hooks/useAllProducts';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

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

  const toggle = (id) => {
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
    <div className="page-container">
      <Helmet>
        <title>Build a Hamper | Subwikha's Hub</title>
        <meta name="description" content="Build your own custom gift hamper — pick 2 to 4 handcrafted gifts and get 10% off the bundle." />
      </Helmet>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <span className="section-label">Mix &amp; Match</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', margin: '8px 0' }}>Build a Hamper</h1>
        <p style={{ opacity: 0.75, maxWidth: 560, margin: '0 auto' }}>
          Pick {MIN_ITEMS}–{MAX_ITEMS} handcrafted gifts and combine them into one beautiful hamper —
          get <strong style={{ color: 'var(--gold)' }}>{BUNDLE_DISCOUNT * 100}% off</strong> the bundle automatically.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 140,
        }}
      >
        {products.map(p => {
          const isSelected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              style={{
                position: 'relative',
                textAlign: 'left',
                background: 'var(--black-card)',
                border: `1px solid ${isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: 130, objectFit: 'cover', opacity: isSelected ? 0.6 : 1 }} />
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--white)' }}>{p.name}</p>
                <p style={{ fontSize: '0.85rem', margin: '4px 0 0', color: 'var(--gold)' }}>₹{p.price}</p>
              </div>
              {isSelected && (
                <span style={{
                  position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--gold)', color: '#111', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700,
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sticky summary bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.97)', borderTop: '1px solid rgba(201,168,76,0.3)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
          {selected.length} of {MAX_ITEMS} gifts selected
        </span>
        {selected.length > 0 && (
          <span style={{ fontSize: '0.85rem' }}>
            Subtotal: <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>₹{subtotal}</span>{' '}
            <strong style={{ color: 'var(--gold)' }}>₹{bundlePrice}</strong>{' '}
            <span style={{ color: '#4ade80' }}>(save ₹{savings})</span>
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
        <Link to="/shop" style={{ fontSize: '0.8rem', opacity: 0.7 }}>Back to Shop</Link>
      </div>
    </div>
  );
}
