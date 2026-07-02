import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import styles from './AdminOrders.module.css';

function isAdminAuthed() {
  return sessionStorage.getItem('subwikha_admin') === '1';
}

const STATUS_LABELS = { paid: 'New Order', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const STATUS_COLORS = { paid: '#c9a84c', processing: '#6c8ebf', shipped: '#f5a623', delivered: '#4ade80', cancelled: '#ef4444' };

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAdminAuthed()) { navigate('/admin/login'); return; }
    fetchOrders();
  }, []);

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
  };

  const deleteOrder = async (firestoreId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this order permanently? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'orders', firestoreId));
      setOrders(prev => prev.filter(o => o.firestoreId !== firestoreId));
      toast.success('Order deleted');
    } catch (err) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('subwikha_admin');
    navigate('/admin/login');
  };

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter;
    const s = search.toLowerCase();
    const matchSearch = !s ||
      (o.orderId || '').toLowerCase().includes(s) ||
      (o.customer?.name || '').toLowerCase().includes(s) ||
      (o.customer?.email || '').toLowerCase().includes(s) ||
      (o.customer?.phone || '').includes(s);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: orders.length,
    revenue: orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0),
    newOrders: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const FILTERS = [
    { key: 'all', label: 'All Orders' },
    { key: 'paid', label: 'New Orders' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

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
          <NavLink to="/admin/products"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Products</NavLink>
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
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
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
          <input
            className={styles.search}
            placeholder="Search name, email, phone, order ID..."
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
            <p>{search || filter !== 'all' ? 'No orders match your filter.' : 'No orders yet.'}</p>
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
                  return (
                    <tr key={order.firestoreId} className={styles.row}>
                      <td>
                        <span className={styles.orderId}>
                          {order.orderId ? `…${order.orderId.slice(-10)}` : '—'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.customerName}>{order.customer?.name || '—'}</span>
                          <span className={styles.customerSub}>{order.customer?.phone || order.customer?.email || ''}</span>
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
                          <button className={styles.deleteRowBtn} onClick={e => deleteOrder(order.firestoreId, e)} title="Delete order">🗑</button>
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
