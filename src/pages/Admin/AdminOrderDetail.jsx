import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import toast from 'react-hot-toast';
import OrderTimeline, { STATUSES, STATUS_LABELS, STATUS_COLORS } from '../../components/OrderTimeline/OrderTimeline';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  isGiftOrder,
  isSurpriseGiftOrder,
  hidesSenderIdentity,
  recipientDeliveryMessage,
  formatDeliveryDate,
  isRecipientPurged,
  hasRecipientContact,
  GIFT_RECIPIENTS_COLLECTION,
} from '../../lib/giftOrders';
import styles from './AdminOrderDetail.module.css';

const WHATSAPP_STATUS_MESSAGE = {
  paid: 'Hi! We\'ve received your order at Subwikha\'s Hub and are getting it ready. Thank you for shopping with us! 💛',
  processing: 'Your order at Subwikha\'s Hub is now being handcrafted! We\'ll let you know as soon as it ships. 🎁',
  shipped: 'Great news — your order has shipped! It\'s on its way to you now. 🚚',
  delivered: 'Your order has been delivered! We hope you love it — thank you for shopping with Subwikha\'s Hub. ✨',
};

// Status updates go to the BUYER — the person who paid and the person we
// talk to about the order.
function sendWhatsAppUpdate(order) {
  const phone = (order.customer?.phone || '').replace(/\D/g, '');
  if (!phone) { return; }
  const msg = WHATSAPP_STATUS_MESSAGE[order.status] || `Update on your order ${order.orderId}: ${STATUS_LABELS[order.status]}`;
  const fullPhone = phone.length === 10 ? `91${phone}` : phone;
  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Delivery updates go to the RECIPIENT and are always neutral: no sender name,
// no order total, no product names, no order id. A surprise must stay a
// surprise, and a gift recipient has no business knowing what the parcel cost.
function sendRecipientWhatsApp(order, recipient) {
  const phone = (recipient?.phone || '').replace(/\D/g, '');
  if (!phone) { return; }
  const msg = recipientDeliveryMessage(order.status);
  const fullPhone = phone.length === 10 ? `91${phone}` : phone;
  window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { checking, authed, logout } = useAdminAuth();
  const [order, setOrder] = useState(null);
  // The gift recipient's own record, read from the giftRecipients table.
  const [recipient, setRecipient] = useState(null);
  const [recipientError, setRecipientError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (authed) fetchOrder();
  }, [authed, orderId]);

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

  // The recipient's details live in their own table. The document id is the
  // order id, so this is a direct read — never a query.
  useEffect(() => {
    if (!order?.recipientId) { setRecipient(null); setRecipientError(false); return; }
    let cancelled = false;
    getDoc(doc(db, GIFT_RECIPIENTS_COLLECTION, order.recipientId))
      .then(snap => {
        if (cancelled) return;
        setRecipient(snap.exists() ? { firestoreId: snap.id, ...snap.data() } : null);
        // The order points at a recipient record that isn't there — either the
        // rules haven't been deployed yet, or the record went missing. Say so
        // rather than showing an empty delivery address.
        setRecipientError(!snap.exists());
      })
      .catch(err => {
        console.error('Could not load the gift recipient record:', err);
        if (!cancelled) { setRecipient(null); setRecipientError(true); }
      });
    return () => { cancelled = true; };
  }, [order?.recipientId]);

  const deleteOrder = async () => {
    if (!window.confirm('Delete this order permanently? This cannot be undone.')) return;
    try {
      // The gift recipient record goes with the order — no orphaned delivery
      // details left behind in the table.
      if (order?.recipientId) {
        await deleteDoc(doc(db, GIFT_RECIPIENTS_COLLECTION, order.recipientId)).catch(() => {});
      }
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success('Order deleted');
      navigate('/admin/orders');
    } catch {
      toast.error('Delete failed');
    }
  };

  // Stamps the recipient record when the gift is marked as delivered, so the
  // shop always knows when the delivery details can be erased.
  const stampDelivered = async () => {
    if (!order?.recipientId) return;
    try {
      await updateDoc(doc(db, GIFT_RECIPIENTS_COLLECTION, order.recipientId), {
        deliveredAt: serverTimestamp(),
      });
      setRecipient(prev => (prev ? { ...prev, deliveredAt: new Date() } : prev));
    } catch (err) {
      console.error('Could not stamp the recipient record as delivered:', err);
    }
  };

  // Sends the buyer the feedback form — the customer is asked how the
  // product, the packaging and the delivery were only once the gift has
  // actually reached them.
  const sendFeedbackForm = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/send-feedback-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'The feedback form could not be sent');
        return false;
      }
      if (data.sent) {
        await updateDoc(doc(db, 'orders', orderId), { feedbackRequestSentAt: serverTimestamp() }).catch(() => {});
        setOrder(prev => ({ ...prev, feedbackRequestSentAt: new Date() }));
        toast.success(`Feedback form sent to ${data.to}`, {
          style: { background: '#111', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
        });
        return true;
      }
      // Already sent, or switched off — not an error worth shouting about.
      toast(data.skipped ? (data.reason || 'The feedback form was not sent') : 'The feedback form was not sent');
      return false;
    } catch (err) {
      console.error('Could not send the feedback form:', err);
      toast.error('The feedback form could not be sent');
      return false;
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
      if (newStatus === 'delivered') {
        stampDelivered();
        // The gift has arrived — now is the moment to ask how it went.
        sendFeedbackForm();
      }
      toast.success(`✓ Status updated to "${STATUS_LABELS[newStatus]}"`, {
        style: { background: '#111', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
      });
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // Erases the recipient's contact details once the gift has been delivered.
  // The order, the payment and the fact that a gift was sent all stay intact.
  const purgeRecipient = async () => {
    if (!order?.recipientId) return;
    if (!window.confirm(
      "Permanently erase the recipient's name, phone number and address from the gift recipient record?\n\n" +
      'The order and the payment are kept — only the delivery details are removed.'
    )) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, GIFT_RECIPIENTS_COLLECTION, order.recipientId), {
        name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '',
        purgedAt: serverTimestamp(),
      });
      setRecipient(prev => (prev ? {
        ...prev,
        name: '', phone: '', address: '', city: '', state: '', pincode: '', landmark: '',
        purgedAt: new Date(),
      } : prev));
      toast.success('Recipient details erased');
    } catch {
      toast.error('Failed to erase the recipient details');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (checking || !authed || loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
        <p>{checking || !authed ? 'Checking admin session...' : 'Loading order...'}</p>
      </div>
    );
  }

  if (!order) return null;

  const hasPhotos = order.photos && Object.keys(order.photos).length > 0;
  const personalizedItems = (order.items || []).filter(i => i.personalization);
  const isGift = isGiftOrder(order);
  const isSurprise = isSurpriseGiftOrder(order);
  // The recipient's record from the giftRecipients table, falling back to the
  // copy embedded in the order for gift orders placed before that table
  // existed.
  const recipientRecord = recipient || order.recipient || null;
  const recipientPurged = isRecipientPurged(recipientRecord);
  const canPurge = Boolean(order.recipientId)
    && order.status === 'delivered'
    && !recipientPurged
    && hasRecipientContact(recipientRecord);

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <Link to="/admin/orders" className={styles.backBtn}>← Back to Orders</Link>
        <div className={styles.topCenter}>
          <span className={styles.orderIdLabel}>Order</span>
          <span className={styles.orderId}>{order.orderId || '—'}</span>
        </div>
        <div className={styles.headerBadges}>
          {isGiftOrder(order) && (
            <span className={styles.giftBadge}>
              🎁 Gift Order{isSurpriseGiftOrder(order) ? ' · Surprise' : ''}
            </span>
          )}
          <span
            className={styles.statusBadge}
            style={{ color: STATUS_COLORS[order.status], background: `${STATUS_COLORS[order.status]}18`, borderColor: `${STATUS_COLORS[order.status]}35` }}
          >
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
        <button className={styles.backBtn} onClick={logout} style={{ marginLeft: 12 }}>Logout</button>
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
                  <button
                    className={styles.restoreBtn}
                    onClick={() => sendWhatsAppUpdate(order)}
                    title="Opens WhatsApp with a pre-filled status update for the buyer"
                  >
                    📲 {isGift ? 'Update Buyer' : 'Send WhatsApp Update'}
                  </button>
                  {isGift && (
                    <button
                      className={styles.recipientBtn}
                      onClick={() => sendRecipientWhatsApp(order, recipientRecord)}
                      title="Opens WhatsApp with a neutral delivery message for the recipient — no sender name, price or product details"
                    >
                      🎀 Notify Recipient
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button
                      className={styles.feedbackBtn}
                      onClick={sendFeedbackForm}
                      disabled={updating}
                      title="Emails the buyer the feedback form, with their order and gift already filled in"
                    >
                      {order.feedbackRequestSentAt ? '💝 Feedback form sent' : '💝 Send feedback form'}
                    </button>
                  )}
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

          <OrderTimeline status={order.status} />
        </div>

        {/* Main Grid */}
        <div className={styles.grid}>
          {/* Left */}
          <div className={styles.col}>
            {/* Buyer */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>{isGift ? '🛍 Buyer Details' : '👤 Customer Details'}</h3>
              {isGift && (
                <p className={styles.cardNote}>
                  The buyer pays for this order and receives every confirmation and update.
                </p>
              )}
              <div className={styles.infoList}>
                <InfoRow label="Name" value={order.customer?.name} />
                <InfoRow label="Email" value={order.customer?.email} />
                <InfoRow label="Phone" value={order.customer?.phone} />
                {!isGift && <InfoRow label="Address" value={order.customer?.address} />}
                {isGift && <InfoRow label="Address" value="Delivered to the recipient" />}
                {!isGift && order.giftMessage && <InfoRow label="Gift Message" value={order.giftMessage} highlight />}
              </div>
            </div>

            {/* Recipient */}
            {isGift && (
              <div className={`${styles.card} ${styles.recipientCard}`}>
                <h3 className={styles.cardTitle}>🎀 Recipient Details</h3>
                <p className={styles.cardNote}>
                  Deliver the parcel here. This number is for delivery coordination only — never for sharing order details, price or the sender's identity.
                  {recipientRecord?.firestoreId && (
                    <> <br />Stored in the <code>giftRecipients</code> table.</>
                  )}
                </p>
                {recipientError ? (
                  <div className={styles.recipientError}>
                    ⚠ The recipient record could not be loaded from the <code>giftRecipients</code> table, so
                    the delivery address is not shown here. Deploy the current <code>firestore.rules</code>
                    (Firebase Console → Firestore → Rules → Publish, or <code>firebase deploy --only firestore:rules</code>)
                    and refresh.
                  </div>
                ) : recipientPurged ? (
                  <div className={styles.infoList}>
                    <InfoRow label="Details" value="Erased after delivery — the gift record itself is kept" />
                    <InfoRow label="Erased On" value={formatDate(recipientRecord?.purgedAt)} />
                  </div>
                ) : (
                  <div className={styles.infoList}>
                    <InfoRow label="Name" value={recipientRecord?.name} />
                    <InfoRow label="Phone" value={recipientRecord?.phone} />
                    <InfoRow label="Address" value={recipientRecord?.address} />
                    <InfoRow label="City" value={recipientRecord?.city} />
                    <InfoRow label="State" value={recipientRecord?.state} />
                    <InfoRow label="PIN Code" value={recipientRecord?.pincode} />
                    {recipientRecord?.landmark && <InfoRow label="Landmark" value={recipientRecord.landmark} />}
                    <InfoRow label="Delivered On" value={recipientRecord?.deliveredAt ? formatDate(recipientRecord.deliveredAt) : 'Not delivered yet'} />
                  </div>
                )}
                {canPurge && (
                  <button
                    className={styles.purgeBtn}
                    onClick={purgeRecipient}
                    disabled={updating}
                    title="Once the gift is delivered, the recipient's contact details can be erased — the order and payment are kept"
                  >
                    🧹 Erase recipient details
                  </button>
                )}
              </div>
            )}

            {/* Surprise / gift details */}
            {isGift && (
              <div className={`${styles.card} ${styles.surpriseCard}`}>
                <h3 className={styles.cardTitle}>🎀 Surprise Gift Status</h3>
                <div className={styles.infoList}>
                  <InfoRow
                    label="Surprise Gift"
                    value={isSurprise ? 'Yes 🎀 — keep it a surprise' : 'No — sender is known to the recipient'}
                  />
                  <InfoRow
                    label="Sender Identity"
                    value={hidesSenderIdentity(order)
                      ? 'Hidden — do not reveal the buyer'
                      : 'Visible — the recipient may be told who sent it'}
                  />
                  <InfoRow
                    label="Delivery Date"
                    value={order.preferredDeliveryDate
                      ? formatDeliveryDate(order.preferredDeliveryDate)
                      : 'No preference — deliver as soon as possible'}
                  />
                </div>
                {order.giftMessage && (
                  <div className={styles.giftNoteBox}>
                    <span className={styles.giftNoteLabel}>Personalized Gift Message</span>
                    <p className={styles.giftNoteText}>{order.giftMessage}</p>
                    {hidesSenderIdentity(order) && (
                      <span className={styles.giftNoteFooter}>
                        Sender name withheld — print this note without a signature.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

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
                <InfoRow label="Delivery" value={deliverySummary(order)} />
                <InfoRow label="Delivery Charge" value={order.shipping === 0 ? 'Free' : `₹${order.shipping}`} />
                {order.deliveryMethod === 'PICKUP' && order.pickupLocation && (
                  <InfoRow label="Pickup At" value={order.pickupLocation} />
                )}
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

            {/* Personalization — the design the customer framed themselves */}
            {personalizedItems.length > 0 && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>🎨 Personalization</h3>
                <div className={styles.photosWrap}>
                  {personalizedItems.map(item => (
                    <div key={item.name} className={styles.photoGroup}>
                      <p className={styles.photoGroupLabel}>{item.name}</p>

                      {(item.personalization.photos || []).length > 0 && (
                        <div className={styles.photoGrid}>
                          {item.personalization.photos.map((photo, i) => (
                            <a key={i} href={photo.url} target="_blank" rel="noreferrer" className={styles.photoCard}>
                              <img src={photo.url} alt={photo.name || `Photo ${i + 1}`} className={styles.photoImg} />
                              <span className={styles.photoAction}>
                                {photo.slotLabel || 'Photo'} · zoom {Math.round((photo.transform?.scale || 1) * 100)}%
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {Object.keys(item.personalization.fields || {}).length > 0 && (
                        <div className={styles.personalFields}>
                          {Object.entries(item.personalization.fields).map(([key, value]) => (
                            <p key={key} className={styles.personalField}><strong>{key}:</strong> {value}</p>
                          ))}
                        </div>
                      )}
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

/** "Local Delivery (PIN 641029)" or "Store Pickup" — how this parcel reaches them. */
function deliverySummary(order) {
  if (!order) return '';
  if (order.deliveryMethod === 'PICKUP') return '🏠 Store Pickup';
  const zone = order.deliveryZoneName || 'Delivery';
  return order.deliveryPincode ? `${zone} (PIN ${order.deliveryPincode})` : zone;
}
