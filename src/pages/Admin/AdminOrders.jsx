import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { isGiftOrder, isSurpriseGiftOrder, GIFT_RECIPIENTS_COLLECTION } from '../../lib/giftOrders';
import styles from './AdminOrders.module.css';

const STATUS_LABELS = { paid: 'New Order', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const STATUS_COLORS = { paid: '#c9a84c', processing: '#6c8ebf', shipped: '#f5a623', delivered: '#4ade80', cancelled: '#ef4444' };

export default function AdminOrders() {
  const { checking, authed, logout } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  // Gift recipient records, keyed by their document id (= the order id).
  const [recipients, setRecipients] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('all');
  // Order-type filter — kept separate from the status filter so you can look
  // at "all gift orders" regardless of where they are in the pipeline.
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authed) fetchOrders();
  }, [authed]);

  const fetchOrders = async () => {
    setLoading(true);
    setFetchError('');
    try {
      // Simple collection read — no orderBy to avoid index requirement
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      // Sort by createdAt client-side
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() ?? new Date(0);
        const tb = b.createdAt?.toDate?.() ?? new Date(0);
        return tb - ta;
      });
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setFetchError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }

    // The gift-recipient table is read separately and defensively: a problem
    // here (e.g. the rules haven't been deployed yet) must never stop the
    // orders list from working. One query for the whole list — the records are
    // matched up in memory by their document id, which is the order id.
    try {
      const rSnap = await getDocs(collection(db, GIFT_RECIPIENTS_COLLECTION));
      const map = {};
      rSnap.docs.forEach(d => { map[d.id] = { firestoreId: d.id, ...d.data() }; });
      setRecipients(map);
    } catch (err) {
      console.error('Could not load gift recipients:', err);
      setRecipients({});
    }
  };

  const deleteOrder = async (order, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this order permanently? This cannot be undone.')) return;
    try {
      // The gift recipient record goes with the order — no orphaned delivery
      // details left behind in the table.
      if (order.recipientId) {
        await deleteDoc(doc(db, GIFT_RECIPIENTS_COLLECTION, order.recipientId)).catch(() => {});
      }
      await deleteDoc(doc(db, 'orders', order.firestoreId));
      setOrders(prev => prev.filter(o => o.firestoreId !== order.firestoreId));
      toast.success('Order deleted');
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  // The recipient record for an order. `recipientId` is the pointer the server
  // set when it wrote the order; the embedded `recipient` is the fallback for
  // gift orders created before the recipient table existed.
  const recipientOf = (o) => recipients[o?.recipientId] || o?.recipient || null;

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter;
    const matchType = typeFilter === 'all'
      || (typeFilter === 'self' && !isGiftOrder(o))
      || (typeFilter === 'gift' && isGiftOrder(o))
      || (typeFilter === 'surprise' && isSurpriseGiftOrder(o));
    const r = recipientOf(o);
    const s = search.toLowerCase();
    const matchSearch = !s ||
      (o.orderId || '').toLowerCase().includes(s) ||
      (o.customer?.name || '').toLowerCase().includes(s) ||
      (o.customer?.email || '').toLowerCase().includes(s) ||
      (o.customer?.phone || '').includes(s) ||
      (r?.name || '').toLowerCase().includes(s) ||
      (r?.phone || '').includes(s);
    return matchStatus && matchType && matchSearch;
  });

  const stats = {
    total: orders.length,
    revenue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
    newOrders: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    giftOrders: orders.filter(o => isGiftOrder(o)).length,
    surpriseOrders: orders.filter(o => isSurpriseGiftOrder(o)).length,
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const FILTERS = [
    { key: 'all', label: 'All Statuses' },
    { key: 'paid', label: 'New Orders' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const TYPE_FILTERS = [
    { key: 'all', label: 'All Orders' },
    { key: 'self', label: 'Self Orders' },
    { key: 'gift', label: 'Gift Orders' },
    { key: 'surprise', label: 'Surprise Gifts' },
  ];

  const typeCounts = {
    all: orders.length,
    self: orders.filter(o => !isGiftOrder(o)).length,
    gift: stats.giftOrders,
    surprise: stats.surpriseOrders,
  };

  if (checking || !authed) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>Checking admin session...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <img src="/logo.png" alt="" className={styles.topLogo} />
          <div className={styles.topText}>
            <span className={styles.topBrand}>Subwikha's Hub</span>
            <span className={styles.topLabel}>Order Management</span>
          </div>
        </div>
        <nav className={styles.topNav}>
          <NavLink to="/admin/orders"    className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Orders</NavLink>
          <NavLink to="/admin/leads"     className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Leads</NavLink>
          <NavLink to="/admin/feedback"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Feedback</NavLink>
          <NavLink to="/admin/products"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Products</NavLink>
          <NavLink to="/admin/delivery"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Delivery</NavLink>
          <NavLink to="/admin/settings"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Settings</NavLink>
          <NavLink to="/admin/analytics" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Analytics</NavLink>
          <NavLink to="/admin/gallery"   className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Gallery</NavLink>
        </nav>
        <div className={styles.topRight}>
          <button className={styles.refreshBtn} onClick={fetchOrders} disabled={loading}>
            {loading ? '...' : '↺ Refresh'}
          </button>
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.content}>
        {/* Stats Row */}
        <div className={styles.statsRow}>
          <StatCard label="Total Orders" value={stats.total} />
          <StatCard label="Total Revenue" value={`₹${stats.revenue.toLocaleString('en-IN')}`} highlight />
          <StatCard label="New Orders" value={stats.newOrders} color="#c9a84c" />
          <StatCard label="Processing" value={stats.processing} color="#6c8ebf" />
          <StatCard label="Shipped" value={stats.shipped} color="#f5a623" />
          <StatCard label="Delivered" value={stats.delivered} color="#4ade80" />
          <StatCard label="Cancelled" value={stats.cancelled} color="#ef4444" />
          <StatCard label="Gift Orders" value={stats.giftOrders} color="#e879f9" />
          <StatCard label="Surprise Gifts" value={stats.surpriseOrders} color="#f472b6" />
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Order Type</span>
            <div className={styles.filterTabs}>
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`${styles.tab} ${typeFilter === f.key ? styles.tabActive : ''}`}
                  onClick={() => setTypeFilter(f.key)}
                >
                  {f.label}
                  <span className={styles.tabCount}>{typeCounts[f.key]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterGroupLabel}>Status</span>
            <div className={styles.filterTabs}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`${styles.tab} ${filter === f.key ? styles.tabActive : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className={styles.tabCount}>
                    {f.key === 'all' ? orders.length : orders.filter(o => o.status === f.key).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <input
            className={styles.search}
            placeholder="Search buyer, recipient, email, phone, order ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {fetchError && (
          <div className={styles.errorBanner}>
            <strong>⚠ Could not load orders:</strong> {fetchError}
            <br />
            <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>
              Fix: Go to Firebase Console → Firestore → Rules → set <code>allow read, write: if true;</code> temporarily, or add proper auth rules.
            </span>
          </div>
        )}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Fetching orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <p>{search || filter !== 'all' || typeFilter !== 'all' ? 'No orders match your filter.' : 'No orders yet.'}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Photos</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const hasPhotos = order.photos && Object.keys(order.photos).length > 0;
                  const gift = isGiftOrder(order);
                  const surprise = isSurpriseGiftOrder(order);
                  const recipient = recipientOf(order);
                  return (
                    <tr key={order.firestoreId} className={styles.row}>
                      <td>
                        <span className={styles.orderId}>
                          {order.orderId ? `…${order.orderId.slice(-10)}` : '—'}
                        </span>
                        {gift && (
                          <span className={styles.giftBadge}>
                            🎁 Gift Order
                            {surprise && <span className={styles.giftBadgeSub}> · Surprise</span>}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.customerName}>{order.customer?.name || '—'}</span>
                          <span className={styles.customerSub}>{order.customer?.phone || order.customer?.email || ''}</span>
                          {gift && recipient?.name && (
                            <span className={styles.recipientSub}>→ {recipient.name}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={styles.itemCount}>
                          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <span className={styles.amount}>₹{(order.grandTotal || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td>
                        {hasPhotos ? (
                          <span className={styles.photoBadge}>📎 Yes</span>
                        ) : (
                          <span className={styles.noPhoto}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={styles.date}>{formatDate(order.createdAt)}</span>
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{
                            color: STATUS_COLORS[order.status] || '#888',
                            background: `${STATUS_COLORS[order.status] || '#888'}18`,
                            borderColor: `${STATUS_COLORS[order.status] || '#888'}35`,
                          }}
                        >
                          {STATUS_LABELS[order.status] || order.status || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <Link to={`/admin/orders/${order.firestoreId}`} className={styles.viewBtn}>View →</Link>
                          <button className={styles.deleteRowBtn} onClick={e => deleteOrder(order, e)} title="Delete order">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className={styles.tableFooter}>{filtered.length} order{filtered.length !== 1 ? 's' : ''} shown</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, highlight }) {
  return (
    <div className={`${styles.statCard} ${highlight ? styles.statHighlight : ''}`}>
      <span className={styles.statValue} style={color ? { color } : {}}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
