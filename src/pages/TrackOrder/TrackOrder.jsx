import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import OrderTimeline, { STATUS_LABELS } from '../../components/OrderTimeline/OrderTimeline';
import { isValidPhone } from '../../lib/validators';
import toast from 'react-hot-toast';
import styles from './TrackOrder.module.css';

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
    if (!isValidPhone(phone)) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    setOrder(null);
    setNotFound(false);
    try {
      // Looked up server-side (api/track-order.js) via the trusted Admin SDK — the
      // browser never fetches other customers' orders to find this one.
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.found) setNotFound(true);
      else setOrder(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`page-container ${styles.page}`}>
      <Helmet>
        <title>Track Your Order | Subwikha's Hub</title>
        <meta name="description" content="Track the status of your Subwikha's Hub order using your Order ID and phone number." />
      </Helmet>

      <div className={styles.header}>
        <span className={styles.heroIcon}>📦</span>
        <span className="section-label">Order Status</span>
        <h1 className={styles.title}>Track Your Order</h1>
        <p className={styles.subtitle}>Enter your Order ID and the phone number used at checkout</p>
      </div>

      <form onSubmit={handleTrack} className={styles.form}>
        <input
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          placeholder="Order ID (e.g. order_ABC123)"
          className={styles.input}
        />
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="10-digit phone number"
          className={styles.input}
        />
        <button type="submit" className={`btn-gold ${styles.submitBtn}`} disabled={loading}>
          {loading ? <span className={styles.spinner} /> : 'Track Order'}
        </button>
      </form>

      {notFound && (
        <p className={styles.notFound}>
          We couldn't find a matching order. Double-check your Order ID and phone number.
        </p>
      )}

      {order && (
        <div className={styles.resultCard}>
          <p className={styles.statusText}>
            Status: <strong className={styles.statusValue}>{STATUS_LABELS[order.status] || order.status}</strong>
          </p>
          <OrderTimeline status={order.status} />
        </div>
      )}

      <div className={styles.helpNote}>
        Can't find your order? <Link to="/contact" className={styles.helpLink}>Contact us</Link> and we'll help you out.
      </div>
    </div>
  );
}
