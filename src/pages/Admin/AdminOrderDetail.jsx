import { useState, useEffect, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import styles from './AdminOrderDetail.module.css';

function isAdminAuthed() {
  return sessionStorage.getItem('subwikha_admin') === '1';
}

const STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
const STATUS_LABELS = { paid: 'New Order', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const STATUS_COLORS = { paid: '#c9a84c', processing: '#6c8ebf', shipped: '#f5a623', delivered: '#4ade80', cancelled: '#ef4444' };

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAdminAuthed()) { navigate('/admin/login'); return; }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (snap.exists()) {
        const data = { firestoreId: snap.id, ...snap.data() };
        setOrder(data);
        setNewStatus(data.status || 'paid');
      } else {
        toast.error('Order not found');
        navigate('/admin/orders');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async () => {
    if (!window.confirm('Delete this order permanently? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success('Order deleted');
      navigate('/admin/orders');
    } catch {
      toast.error('Delete failed');
    }
  };

  const updateStatus = async () => {
    if (newStatus === order.status) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setOrder(prev => ({ ...prev, status: newStatus }));
      toast.success(`✓ Status updated to "${STATUS_LABELS[newStatus]}"`, {
        style: { background: '#111', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
      });
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
        <p>Loading order...</p>
      </div>
    );
  }

  if (!order) return null;

  const hasPhotos = order.photos && Object.keys(order.photos).length > 0;
  const currentIdx = STATUSES.indexOf(order.status);

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <Link to="/admin/orders" className={styles.backBtn}>← Back to Orders</Link>
        <div className={styles.topCenter}>
          <span className={styles.orderIdLabel}>Order</span>
          <span className={styles.orderId}>{order.orderId || '—'}</span>
        </div>
        <span
          className={styles.statusBadge}
          style={{ color: STATUS_COLORS[order.status], background: `${STATUS_COLORS[order.status]}18`, borderColor: `${STATUS_COLORS[order.status]}35` }}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </header>

      <div className={styles.content}>
        {/* Status Pipeline */}
        <div className={styles.statusCard}>
          <div className={styles.statusCardHead}>
            <h3 className={styles.cardTitle}>Order Status</h3>
            <div className={styles.statusActions}>
              {order.status !== 'cancelled' && (
                <>
                  <select
                    className={styles.statusSelect}
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    className={styles.updateBtn}
                    onClick={updateStatus}
                    disabled={updating || newStatus === order.status}
                  >
                    {updating ? 'Saving…' : 'Update'}
                  </button>
                  <button
                    className={styles.cancelOrderBtn}
                    onClick={async () => {
                      if (!window.confirm('Cancel this order? The record will be kept but marked as Cancelled.')) return;
                      setUpdating(true);
                      try {
                        await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', updatedAt: serverTimestamp() });
                        setOrder(prev => ({ ...prev, status: 'cancelled' }));
                        setNewStatus('cancelled');
                        toast.success('Order cancelled');
                      } catch { toast.error('Failed to cancel'); }
                      finally { setUpdating(false); }
                    }}
                    disabled={updating}
                  >
                    Cancel Order
                  </button>
                </>
              )}
              {order.status === 'cancelled' && (
                <button
                  className={styles.restoreBtn}
                  onClick={async () => {
                    setUpdating(true);
                    try {
                      await updateDoc(doc(db, 'orders', orderId), { status: 'paid', updatedAt: serverTimestamp() });
                      setOrder(prev => ({ ...prev, status: 'paid' }));
                      setNewStatus('paid');
                      toast.success('Order restored to New Order');
                    } catch { toast.error('Failed to restore'); }
                    finally { setUpdating(false); }
                  }}
                  disabled={updating}
                >
                  ↩ Restore Order
                </button>
              )}
            </div>
          </div>

          {order.status === 'cancelled' && (
            <div className={styles.cancelledBanner}>
              <span className={styles.cancelledIcon}>✕</span>
              <div>
                <strong>Order Cancelled</strong>
                <p>This order has been cancelled. Use "Restore Order" above to reactivate it.</p>
              </div>
            </div>
          )}

          {order.status !== 'cancelled' && <div className={styles.pipeline}>
            {STATUSES.map((s, i) => (
              <Fragment key={s}>
                {i > 0 && (
                  <div className={`${styles.pipeLine} ${i <= currentIdx ? styles.pipeLineDone : ''}`} />
                )}
                <div
                  className={`${styles.pipeDot} ${i <= currentIdx ? styles.pipeDotDone : ''}`}
                  style={i <= currentIdx ? { background: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : {}}
                >
                  {i <= currentIdx ? '✓' : i + 1}
                </div>
              </Fragment>
            ))}
            {STATUSES.map((s, i) => (
              <span
                key={`lbl-${s}`}
                className={`${styles.pipeLabel} ${i <= currentIdx ? styles.pipeLabelDone : ''}`}
                style={{
                  gridColumn: i * 2 + 1,
                  ...(i === currentIdx ? { color: STATUS_COLORS[s] } : {}),
                }}
              >
                {STATUS_LABELS[s]}
              </span>
            ))}
          </div>}
        </div>

        {/* Main Grid */}
        <div className={styles.grid}>
          {/* Left */}
          <div className={styles.col}>
            {/* Customer */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>👤 Customer Details</h3>
              <div className={styles.infoList}>
                <InfoRow label="Name" value={order.customer?.name} />
                <InfoRow label="Email" value={order.customer?.email} />
                <InfoRow label="Phone" value={order.customer?.phone} />
                <InfoRow label="Address" value={order.customer?.address} />
                {order.giftMessage && <InfoRow label="Gift Message" value={order.giftMessage} highlight />}
              </div>
            </div>

            {/* Payment */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>💳 Payment Details</h3>
              <div className={styles.infoList}>
                <InfoRow label="Order ID" value={order.orderId} mono />
                <InfoRow label="Payment ID" value={order.paymentId} mono />
                <InfoRow label="Date" value={formatDate(order.createdAt)} />
                <div className={styles.divider} />
                <InfoRow label="Subtotal" value={`₹${(order.subtotal || 0).toLocaleString('en-IN')}`} />
                {(order.discount > 0) && (
                  <InfoRow label="Discount" value={`− ₹${order.discount.toLocaleString('en-IN')}`} />
                )}
                <InfoRow label="Shipping" value={order.shipping === 0 ? 'Free' : `₹${order.shipping}`} />
                <div className={styles.divider} />
                <InfoRow label="Grand Total" value={`₹${(order.grandTotal || 0).toLocaleString('en-IN')}`} bold gold />
              </div>
            </div>
          </div>

          {/* Right */}
          <div className={styles.col}>
            {/* Items */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🛍 Items Ordered</h3>
              <div className={styles.itemsList}>
                {(order.items || []).map((item, i) => (
                  <div key={i} className={styles.itemRow}>
                    <div className={styles.itemLeft}>
                      <span className={styles.itemName}>{item.name}</span>
                      {item.variant && <span className={styles.itemVariant}>{item.variant}</span>}
                    </div>
                    <div className={styles.itemRight}>
                      <span className={styles.itemQty}>× {item.qty}</span>
                      <span className={styles.itemPrice}>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.itemsTotal}>
                <span>Total</span>
                <span className={styles.itemsTotalAmt}>₹{(order.grandTotal || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Photos */}
            {hasPhotos && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>📎 Customer Photos</h3>
                <div className={styles.photosWrap}>
                  {Object.entries(order.photos).map(([productName, urls]) => (
                    <div key={productName} className={styles.photoGroup}>
                      <p className={styles.photoGroupLabel}>{productName}</p>
                      <div className={styles.photoGrid}>
                        {urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className={styles.photoCard}>
                            <img src={url} alt={`Photo ${i + 1}`} className={styles.photoImg} />
                            <span className={styles.photoAction}>⬇ Open / Download</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className={styles.dangerZone}>
          <button className={styles.deleteOrderBtn} onClick={deleteOrder}>
            🗑 Delete This Order
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, bold, gold, highlight }) {
  return (
    <div className={`${styles.infoRow} ${highlight ? styles.infoRowHighlight : ''}`}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${mono ? styles.mono : ''} ${bold ? styles.bold : ''} ${gold ? styles.gold : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
