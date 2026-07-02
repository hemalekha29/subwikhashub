import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export default function UgcGallery() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getDocs(collection(db, 'gallery'))
      .then(snap => {
        const approved = snap.docs
          .map(d => d.data())
          .filter(d => d.approved);
        setItems(approved);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <section style={{ padding: '60px 24px', textAlign: 'center' }}>
      <span className="section-label">From Our Customers</span>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', margin: '8px 0 32px' }}>Real Gifts, Real Smiles</h2>
      <div
        style={{
          display: 'flex', gap: 16, overflowX: 'auto', padding: '4px 4px 12px',
          maxWidth: 1100, margin: '0 auto', scrollSnapType: 'x mandatory',
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 220px', scrollSnapAlign: 'start', background: 'var(--black-card)',
              border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, overflow: 'hidden', textAlign: 'left',
            }}
          >
            <img src={item.imageUrl} alt={item.caption || 'Customer gift'} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
            <div style={{ padding: '10px 14px' }}>
              {item.caption && <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--white)' }}>{item.caption}</p>}
              {item.customerName && <p style={{ fontSize: '0.72rem', margin: '4px 0 0', color: 'var(--gold)' }}>— {item.customerName}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
