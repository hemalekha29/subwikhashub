import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUS,
  FEEDBACK_STATUS_LABELS,
  RATING_LABELS,
} from '../../lib/feedback';
import styles from './AdminFeedback.module.css';

const COLLECTION = 'feedbacks';

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All Feedback' },
  { key: FEEDBACK_CATEGORIES.PRODUCT, label: 'Product' },
  { key: FEEDBACK_CATEGORIES.DELIVERY, label: 'Delivery' },
  { key: FEEDBACK_CATEGORIES.PACKAGING, label: 'Packaging' },
  { key: FEEDBACK_CATEGORIES.CUSTOMER_SERVICE, label: 'Customer Service' },
  { key: FEEDBACK_CATEGORIES.WEBSITE, label: 'Website' },
  { key: FEEDBACK_CATEGORIES.COMPLAINT, label: 'Complaints' },
  { key: FEEDBACK_CATEGORIES.SUGGESTION, label: 'Suggestions' },
  { key: FEEDBACK_CATEGORIES.GIFT_EXPERIENCE, label: 'Gift Experience' },
  { key: FEEDBACK_CATEGORIES.OTHER, label: 'Other' },
];

const STATUS_COLORS = {
  NEW: '#c9a84c',
  UNDER_REVIEW: '#6c8ebf',
  IN_PROGRESS: '#f5a623',
  RESOLVED: '#4ade80',
  CLOSED: '#888',
};

export default function AdminFeedback() {
  const { checking, authed, logout } = useAdminAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [notes, setNotes] = useState('');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      const data = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.created_at?.toDate?.() ?? new Date(0);
        const tb = b.created_at?.toDate?.() ?? new Date(0);
        return tb - ta;
      });
      setItems(data);
    } catch (err) {
      console.error(err);
      toast.error('Could not load the feedback');
    } finally {
      setLoading(false);
    }
  };

  const save = async (item, patch) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTION, item.firestoreId), {
        ...patch,
        updated_at: new Date(),
      });
      setItems(prev => prev.map(i => (i.firestoreId === item.firestoreId ? { ...i, ...patch } : i)));
      setOpen(prev => (prev && prev.firestoreId === item.firestoreId ? { ...prev, ...patch } : prev));
      toast.success('Feedback updated');
    } catch (err) {
      console.error(err);
      toast.error('Could not update the feedback');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.feedback_reference}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, COLLECTION, item.firestoreId));
      setItems(prev => prev.filter(i => i.firestoreId !== item.firestoreId));
      setOpen(null);
      toast.success('Feedback deleted');
    } catch (err) {
      console.error(err);
      toast.error('Could not delete the feedback');
    }
  };

  const filtered = useMemo(() => items.filter(item => {
    if (categoryFilter !== 'all' && item.feedback_category !== categoryFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (ratingFilter !== 'all' && String(item.rating) !== ratingFilter) return false;
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (item.feedback_reference || '').toLowerCase().includes(s)
      || (item.customer_name || '').toLowerCase().includes(s)
      || (item.customer_phone || '').includes(s)
      || (item.customer_email || '').toLowerCase().includes(s)
      || (item.feedback_message || '').toLowerCase().includes(s);
  }), [items, categoryFilter, statusFilter, ratingFilter, search]);

  const stats = useMemo(() => {
    const rated = items.filter(i => i.rating);
    const avg = rated.length ? (rated.reduce((s, i) => s + i.rating, 0) / rated.length) : 0;
    return {
      total: items.length,
      average: avg.toFixed(1),
      positive: items.filter(i => i.rating >= 4).length,
      negative: items.filter(i => i.rating && i.rating <= 2).length,
      pending: items.filter(i => i.status === FEEDBACK_STATUS.NEW || i.status === FEEDBACK_STATUS.UNDER_REVIEW || i.status === FEEDBACK_STATUS.IN_PROGRESS).length,
      resolvedComplaints: items.filter(i => i.feedback_category === FEEDBACK_CATEGORIES.COMPLAINT && i.status === FEEDBACK_STATUS.RESOLVED).length,
    };
  }, [items]);

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
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <img src="/logo.png" alt="" className={styles.topLogo} />
          <div className={styles.topText}>
            <span className={styles.topBrand}>Subwikha's Hub</span>
            <span className={styles.topLabel}>Feedback</span>
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
          <button className={styles.refreshBtn} onClick={load} disabled={loading}>↺ Refresh</button>
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.statsRow}>
          <Stat label="Total Feedback" value={stats.total} />
          <Stat label="Average Rating" value={stats.average ? `${stats.average}★` : '—'} color="#c9a84c" />
          <Stat label="Positive" value={stats.positive} color="#4ade80" />
          <Stat label="Negative" value={stats.negative} color="#ef4444" />
          <Stat label="Pending" value={stats.pending} color="#f5a623" />
          <Stat label="Resolved Complaints" value={stats.resolvedComplaints} color="#6c8ebf" />
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterTabs}>
            {CATEGORY_FILTERS.map(c => (
              <button
                key={c.key}
                className={`${styles.tab} ${categoryFilter === c.key ? styles.tabActive : ''}`}
                onClick={() => setCategoryFilter(c.key)}
              >
                {c.label}
                <span className={styles.tabCount}>
                  {c.key === 'all' ? items.length : items.filter(i => i.feedback_category === c.key).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.toolbar}>
          <select className={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(FEEDBACK_STATUS).map(([key, label]) => (
              <option key={key} value={key}>{FEEDBACK_STATUS_LABELS[key]}</option>
            ))}
          </select>
          <select className={styles.select} value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map(n => (
              <option key={n} value={String(n)}>{n}★ — {RATING_LABELS[n]}</option>
            ))}
          </select>
          <input
            className={styles.search}
            placeholder="Search name, phone, reference or message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className={styles.loadingState}><div className={styles.loadingSpinner} /><p>Loading feedback...</p></div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <p>{items.length === 0 ? 'No feedback yet.' : 'No feedback matches these filters.'}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.firestoreId} className={styles.row}>
                    <td><span className={styles.ref}>{item.feedback_reference}</span></td>
                    <td>
                      <div className={styles.customerCell}>
                        <span className={styles.customerName}>{item.is_anonymous ? 'Anonymous' : (item.customer_name || '—')}</span>
                        <span className={styles.customerSub}>{item.customer_phone || item.customer_email || ''}</span>
                      </div>
                    </td>
                    <td><span className={styles.category}>{item.feedback_type || item.feedback_category}</span></td>
                    <td>
                      {item.rating ? (
                        <span className={styles.rating}>{item.rating}★ <small>{RATING_LABELS[item.rating]}</small></span>
                      ) : <span className={styles.noRating}>—</span>}
                    </td>
                    <td><span className={styles.message}>{item.feedback_message || '—'}</span></td>
                    <td>
                      <span className={styles.badge} style={{ color: STATUS_COLORS[item.status] || '#888', background: `${STATUS_COLORS[item.status] || '#888'}18`, borderColor: `${STATUS_COLORS[item.status] || '#888'}35` }}>
                        {FEEDBACK_STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td><span className={styles.date}>{formatDate(item.created_at)}</span></td>
                    <td>
                      <button className={styles.viewBtn} onClick={() => { setOpen(item); setNotes(item.internal_notes || ''); setReply(item.admin_reply || ''); }}>Open →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.tableFooter}>{filtered.length} of {items.length} shown</p>
          </div>
        )}
      </div>

      {open && (
        <div className={styles.drawerOverlay} onClick={() => setOpen(null)}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div>
                <h3 className={styles.drawerTitle}>{open.feedback_reference}</h3>
                <p className={styles.drawerSub}>{open.feedback_type || open.feedback_category} · {formatDate(open.created_at)}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setOpen(null)}>✕</button>
            </div>

            <section className={styles.card}>
              <h4 className={styles.cardTitle}>💬 Feedback</h4>
              <div className={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={n <= (open.rating || 0) ? styles.starOn : styles.starOff}>★</span>
                ))}
                {open.rating && <span className={styles.ratingText}>{RATING_LABELS[open.rating]}</span>}
              </div>
              <p className={styles.messageFull}>{open.feedback_message || '—'}</p>
              {Object.keys(open.details || {}).length > 0 && (
                <div className={styles.detailsList}>
                  {Object.entries(open.details).map(([k, v]) => (
                    <div key={k} className={styles.detailRow}>
                      <span>{k}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {(open.attachment_urls || []).length > 0 && (
                <div className={styles.attachments}>
                  {open.attachment_urls.map(url => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Feedback attachment" />
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.card}>
              <h4 className={styles.cardTitle}>👤 Customer</h4>
              <Row label="Name" value={open.is_anonymous ? 'Anonymous' : open.customer_name} />
              <Row label="Phone" value={open.customer_phone} />
              <Row label="Email" value={open.customer_email} />
              <Row label="Source page" value={open.source_page} />
              <Row label="Order" value={open.order_id} mono />
              <Row label="Product" value={open.product_name || open.product_id} />
            </section>

            <section className={styles.card}>
              <h4 className={styles.cardTitle}>⚙ Status</h4>
              <div className={styles.actionRow}>
                {Object.entries(FEEDBACK_STATUS).map(([key, label]) => (
                  <button
                    key={key}
                    className={`${styles.smallBtn} ${open.status === key ? styles.smallBtnActive : ''}`}
                    onClick={() => save(open, { status: key })}
                    disabled={saving}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h4 className={styles.cardTitle}>📝 Reply & notes</h4>
              <label className={styles.fieldLabel}>Reply to the customer</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="A reply the customer can be sent…"
              />
              <button className={styles.primaryBtn} onClick={() => save(open, { admin_reply: reply })} disabled={saving}>Save reply</button>

              <label className={styles.fieldLabel} style={{ marginTop: 16 }}>Internal notes (never shown to the customer)</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Private notes for the team…"
              />
              <button className={styles.primaryBtn} onClick={() => save(open, { internal_notes: notes })} disabled={saving}>Save notes</button>
            </section>

            <div className={styles.dangerZone}>
              <button className={styles.dangerBtn} onClick={() => remove(open)}>Delete this feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statValue} style={color ? { color } : {}}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${mono ? styles.mono : ''}`}>{value || '—'}</span>
    </div>
  );
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
