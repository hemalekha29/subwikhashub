import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import OrderTimeline, { STATUS_LABELS } from '../../components/OrderTimeline/OrderTimeline';
import toast from 'react-hot-toast';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      toast.error('Enter both your Order ID and phone number');
      return;
    }
    setLoading(true);
    setOrder(null);
    setNotFound(false);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const match = snap.docs
        .map(d => d.data())
        .find(o => o.orderId === orderId.trim() && o.customer?.phone === phone.trim());
      if (!match) setNotFound(true);
      else setOrder(match);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Helmet>
        <title>Track Your Order | Subwikha's Hub</title>
        <meta name="description" content="Track the status of your Subwikha's Hub order using your Order ID and phone number." />
      </Helmet>

      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <span className="section-label">Order Status</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', margin: '8px 0' }}>Track Your Order</h1>
        <p style={{ opacity: 0.75 }}>Enter your Order ID and the phone number used at checkout</p>
      </div>

      <form onSubmit={handleTrack} style={{ maxWidth: 420, margin: '0 auto 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder="Order ID (e.g. order_ABC123)"
          style={{ background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '12px 14px' }}
        />
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="10-digit phone number"
          style={{ background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '12px 14px' }}
        />
        <button type="submit" className="btn-gold" disabled={loading}>
          {loading ? 'Searching…' : 'Track Order'}
        </button>
      </form>

      {notFound && (
        <p style={{ textAlign: 'center', color: '#f87171' }}>
          We couldn't find a matching order. Double-check your Order ID and phone number.
        </p>
      )}

      {order && (
        <div style={{ maxWidth: 520, margin: '0 auto', background: 'var(--black-card)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: 28 }}>
          <p style={{ marginBottom: 20, textAlign: 'center' }}>
            Status: <strong style={{ color: 'var(--gold)' }}>{STATUS_LABELS[order.status] || order.status}</strong>
          </p>
          <OrderTimeline status={order.status} />
        </div>
      )}
    </div>
  );
}
