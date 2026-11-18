import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  CHECKOUT_LEADS_COLLECTION,
  CHECKOUT_SETTINGS_COLLECTION,
  CHECKOUT_SETTINGS_DOC,
  CHECKOUT_STATUS,
  CHECKOUT_STATUS_LABELS,
  DEFAULT_LEAD_SETTINGS,
  FOLLOW_UP_STATUS,
  FOLLOW_UP_STATUS_LABELS,
  PAYMENT_STATUS,
  PAYMENT_STATUS_LABELS,
  effectiveCheckoutStatus,
  followUpMessage,
  isOpenLead,
  timeAgo,
} from '../../lib/checkoutLeads';
import { whatsappLink } from '../../data/site';
import styles from './AdminLeads.module.css';

const FILTERS = [
  { key: 'all', label: 'All Checkout Leads' },
  { key: 'pending', label: 'Payment Pending' },
  { key: 'abandoned', label: 'Abandoned' },
  { key: 'failed', label: 'Payment Failed' },
  { key: 'completed', label: 'Completed / Converted' },
  { key: 'followup', label: 'Follow-up Required' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'lost', label: 'Lost' },
];

const STATUS_COLORS = {
  NEW: '#c9a84c',
  UNDER_REVIEW: '#6c8ebf',
  IN_PROGRESS: '#f5a623',
  RESOLVED: '#4ade80',
  CLOSED: '#888',
};

export default function AdminLeads() {
  const { checking, authed, logout } = useAdminAuth();
  const [leads, setLeads] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_LEAD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [openLead, setOpenLead] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const load = async () => {
    setLoading(true);
    try {
      const [leadsSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, CHECKOUT_LEADS_COLLECTION)),
        getDoc(doc(db, CHECKOUT_SETTINGS_COLLECTION, CHECKOUT_SETTINGS_DOC)),
      ]);
      const data = leadsSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() ?? new Date(0);
        const tb = b.createdAt?.toDate?.() ?? new Date(0);
        return tb - ta;
      });
      setLeads(data);
      if (settingsSnap.exists()) {
        setSettings(prev => ({ ...DEFAULT_LEAD_SETTINGS, ...settingsSnap.data() }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load the checkout leads');
    } finally {
      setLoading(false);
    }
  };

  const saveFollowUp = async (lead, patch) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, CHECKOUT_LEADS_COLLECTION, lead.firestoreId), {
        ...patch,
        updatedAt: new Date(),
      });
      setLeads(prev => prev.map(l => (l.firestoreId === lead.firestoreId ? { ...l, ...patch } : l)));
      setOpenLead(prev => (prev && prev.firestoreId === lead.firestoreId ? { ...prev, ...patch } : prev));
      toast.success('Lead updated');
    } catch (err) {
      console.error(err);
      toast.error('Could not update the lead');
    } finally {
      setSaving(false);
    }
  };

  const removeLead = async (lead) => {
    if (!window.confirm(`Delete lead ${lead.leadId || lead.firestoreId}?\n\nThe customer's details are removed permanently.`)) return;
    try {
      await deleteDoc(doc(db, CHECKOUT_LEADS_COLLECTION, lead.firestoreId));
      setLeads(prev => prev.filter(l => l.firestoreId !== lead.firestoreId));
      setOpenLead(null);
      toast.success('Lead deleted');
    } catch (err) {
      console.error(err);
      toast.error('Could not delete the lead');
    }
  };

  const matchesFilter = (lead, key) => {
    const status = effectiveCheckoutStatus(lead, settings);
    switch (key) {
      case 'all': return true;
      case 'pending': return lead.paymentStatus === PAYMENT_STATUS.PENDING && status !== CHECKOUT_STATUS.ABANDONED;
      case 'abandoned': return status === CHECKOUT_STATUS.ABANDONED;
      case 'failed': return lead.paymentStatus === PAYMENT_STATUS.FAILED;
      case 'completed': return lead.paymentStatus === PAYMENT_STATUS.SUCCESS;
      case 'followup': return lead.followUpStatus === FOLLOW_UP_STATUS.FOLLOW_UP_REQUIRED;
      case 'contacted': return lead.followUpStatus === FOLLOW_UP_STATUS.CONTACTED;
      case 'lost': return lead.followUpStatus === FOLLOW_UP_STATUS.LOST;
      default: return true;
    }
  };

  const filtered = useMemo(() => leads.filter(lead => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s
      || (lead.leadId || '').toLowerCase().includes(s)
      || (lead.customer?.name || '').toLowerCase().includes(s)
      || (lead.customer?.phone || '').includes(s)
      || (lead.customer?.email || '').toLowerCase().includes(s);
    return matchesFilter(lead, filter) && matchSearch;
  }), [leads, filter, search, settings]);

  const countFor = (key) => leads.filter(lead => matchesFilter(lead, key)).length;

  const stats = useMemo(() => {
    const open = leads.filter(isOpenLead);
    const converted = leads.filter(l => l.paymentStatus === PAYMENT_STATUS.SUCCESS);
    const potential = open.reduce((sum, l) => sum + (Number(l.grandTotal) || 0), 0);
    const recovered = converted.reduce((sum, l) => sum + (Number(l.grandTotal) || 0), 0);
    return {
      total: leads.length,
      pending: leads.filter(l => l.paymentStatus === PAYMENT_STATUS.PENDING).length,
      abandoned: leads.filter(l => effectiveCheckoutStatus(l, settings) === CHECKOUT_STATUS.ABANDONED).length,
      failed: leads.filter(l => l.paymentStatus === PAYMENT_STATUS.FAILED).length,
      converted: converted.length,
      conversionRate: leads.length ? Math.round((converted.length / leads.length) * 100) : 0,
      potential,
      recovered,
    };
  }, [leads, settings]);

  const trend = useMemo(() => {
    const days = 30;
    const buckets = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ key, label: `${d.getDate()}/${d.getMonth() + 1}`, leads: 0, converted: 0 });
    }
    const index = new Map(buckets.map(b => [b.key, b]));
    leads.forEach(lead => {
      const key = lead.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10);
      const bucket = key ? index.get(key) : null;
      if (!bucket) return;
      bucket.leads += 1;
      if (lead.paymentStatus === PAYMENT_STATUS.SUCCESS) bucket.converted += 1;
    });
    const max = Math.max(1, ...buckets.map(b => b.leads));
    return { buckets, max };
  }, [leads]);

  // Daily, weekly and monthly views of the same numbers: how many checkouts
  // started, how many converted, and what the unconverted ones are worth.
  const periods = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = 86400000;
    const windows = [
      { label: 'Today', from: startOfToday, to: null },
      { label: 'Last 7 days', from: new Date(startOfToday.getTime() - 6 * day), to: null },
      { label: 'Last 30 days', from: new Date(startOfToday.getTime() - 29 * day), to: null },
      { label: 'Last 90 days', from: new Date(startOfToday.getTime() - 89 * day), to: null },
      { label: 'This month', from: new Date(now.getFullYear(), now.getMonth(), 1), to: null },
      {
        label: 'Last month',
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    ];

    return windows.map(w => {
      const inWindow = leads.filter(l => {
        const d = l.createdAt?.toDate?.();
        if (!d) return false;
        if (d < w.from) return false;
        if (w.to && d >= w.to) return false;
        return true;
      });
      const converted = inWindow.filter(l => l.paymentStatus === PAYMENT_STATUS.SUCCESS);
      const potential = inWindow.filter(isOpenLead).reduce((s, l) => s + (Number(l.grandTotal) || 0), 0);
      const recovered = converted.reduce((s, l) => s + (Number(l.grandTotal) || 0), 0);
      return {
        label: w.label,
        leads: inWindow.length,
        converted: converted.length,
        rate: inWindow.length ? Math.round((converted.length / inWindow.length) * 100) : 0,
        potential,
        recovered,
      };
    });
  }, [leads]);

  // The last six calendar months, side by side.
  const monthly = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        year: d.getFullYear(),
        leads: 0,
        converted: 0,
      });
    }
    const index = new Map(buckets.map(b => [b.key, b]));
    leads.forEach(lead => {
      const d = lead.createdAt?.toDate?.();
      if (!d) return;
      const bucket = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!bucket) return;
      bucket.leads += 1;
      if (lead.paymentStatus === PAYMENT_STATUS.SUCCESS) bucket.converted += 1;
    });
    const max = Math.max(1, ...buckets.map(b => b.leads));
    return { buckets, max };
  }, [leads]);

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
            <span className={styles.topLabel}>Checkout Leads</span>
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
        {/* Stats */}
        <div className={styles.statsRow}>
          <Stat label="Total Leads" value={stats.total} />
          <Stat label="Payment Pending" value={stats.pending} color="#c9a84c" />
          <Stat label="Abandoned" value={stats.abandoned} color="#f5a623" />
          <Stat label="Failed" value={stats.failed} color="#ef4444" />
          <Stat label="Converted" value={stats.converted} color="#4ade80" />
          <Stat label="Conversion Rate" value={`${stats.conversionRate}%`} />
          <Stat label="Potential Revenue" value={`₹${stats.potential.toLocaleString('en-IN')}`} color="#e879f9" />
          <Stat label="Recovered Revenue" value={`₹${stats.recovered.toLocaleString('en-IN')}`} color="#4ade80" />
        </div>

        {/* 30-day trend */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Last 30 days</h3>
          <div className={styles.trendRow}>
            {trend.buckets.map(b => (
              <div key={b.key} className={styles.trendCol} title={`${b.label}: ${b.leads} leads, ${b.converted} converted`}>
                <div className={styles.trendBars}>
                  <span className={styles.trendBarLead} style={{ height: `${(b.leads / trend.max) * 100}%` }} />
                  <span className={styles.trendBarConverted} style={{ height: `${(b.converted / trend.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.trendLegend}>
            <span><i className={styles.legendLeads} /> Leads</span>
            <span><i className={styles.legendConverted} /> Converted</span>
          </div>
        </div>

        {/* Daily / weekly / monthly summary */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Daily, weekly &amp; monthly</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Leads</th>
                  <th>Converted</th>
                  <th>Conversion</th>
                  <th>Potential</th>
                  <th>Recovered</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <tr key={p.label} className={styles.row}>
                    <td><span className={styles.periodLabel}>{p.label}</span></td>
                    <td><span className={styles.amount}>{p.leads}</span></td>
                    <td><span className={styles.itemCount}>{p.converted}</span></td>
                    <td><span className={styles.rateCell}>{p.rate}%</span></td>
                    <td><span className={styles.amount}>₹{p.potential.toLocaleString('en-IN')}</span></td>
                    <td><span className={styles.recovered}>₹{p.recovered.toLocaleString('en-IN')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Six months side by side */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Last 6 months</h3>
          <div className={styles.monthRow}>
            {monthly.buckets.map(b => (
              <div key={b.key} className={styles.monthCol}>
                <span className={styles.monthValue}>{b.leads}</span>
                <span className={styles.monthBarTrack}>
                  <span className={styles.monthBar} style={{ height: `${(b.leads / monthly.max) * 100}%` }} />
                  <span className={styles.monthBarConverted} style={{ height: `${(b.converted / monthly.max) * 100}%` }} />
                </span>
                <span className={styles.monthLabel}>{b.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.trendLegend}>
            <span><i className={styles.legendLeads} /> Leads</span>
            <span><i className={styles.legendConverted} /> Converted</span>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.filterTabs}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`${styles.tab} ${filter === f.key ? styles.tabActive : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className={styles.tabCount}>{countFor(f.key)}</span>
              </button>
            ))}
          </div>
          <input
            className={styles.search}
            placeholder="Search name, phone, email or lead ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingState}><div className={styles.loadingSpinner} /><p>Loading leads...</p></div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🧾</span>
            <p>{leads.length === 0 ? 'No checkout leads yet.' : 'No leads match this filter.'}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Customer</th>
                  <th>Products</th>
                  <th>Total</th>
                  <th>Delivery</th>
                  <th>Payment</th>
                  <th>Checkout</th>
                  <th>Follow-up</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const status = effectiveCheckoutStatus(lead, settings);
                  return (
                    <tr key={lead.firestoreId} className={styles.row}>
                      <td><span className={styles.leadId}>{lead.leadId || '—'}</span></td>
                      <td>
                        <div className={styles.customerCell}>
                          <span className={styles.customerName}>{lead.customer?.name || '—'}</span>
                          <span className={styles.customerSub}>{lead.customer?.phone || ''}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.itemSummary}>
                          {(lead.items || []).slice(0, 2).map(i => `${i.name} ×${i.qty}`).join(', ')}
                          {(lead.items || []).length > 2 ? ` +${lead.items.length - 2}` : ''}
                        </span>
                      </td>
                      <td><span className={styles.amount}>₹{(lead.grandTotal || 0).toLocaleString('en-IN')}</span></td>
                      <td>
                        <span className={styles.zoneCell}>
                          {lead.deliveryMethod === 'PICKUP' ? '🏠 Pickup' : `🚚 ${lead.deliveryZoneName || '—'}`}
                          {lead.deliveryCharge > 0 && <span className={styles.zoneCharge}>₹{lead.deliveryCharge}</span>}
                        </span>
                      </td>
                      <td><Badge label={PAYMENT_STATUS_LABELS[lead.paymentStatus] || lead.paymentStatus} color={paymentColor(lead.paymentStatus)} /></td>
                      <td><Badge label={CHECKOUT_STATUS_LABELS[status] || status} color={status === CHECKOUT_STATUS.COMPLETED ? '#4ade80' : status === CHECKOUT_STATUS.ABANDONED ? '#f5a623' : '#c9a84c'} /></td>
                      <td><Badge label={FOLLOW_UP_STATUS_LABELS[lead.followUpStatus] || lead.followUpStatus} color={followUpColor(lead.followUpStatus)} /></td>
                      <td><span className={styles.date}>{timeAgo(lead.createdAt)}</span></td>
                      <td>
                        <button className={styles.viewBtn} onClick={() => { setOpenLead(lead); setNoteDraft(lead.followUpNotes || ''); }}>Open →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className={styles.tableFooter}>{filtered.length} lead{filtered.length !== 1 ? 's' : ''} shown</p>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {openLead && (
        <LeadDrawer
          lead={openLead}
          settings={settings}
          noteDraft={noteDraft}
          setNoteDraft={setNoteDraft}
          saving={saving}
          onClose={() => setOpenLead(null)}
          onSaveNote={() => saveFollowUp(openLead, { followUpNotes: noteDraft })}
          onSetStatus={(status) => saveFollowUp(openLead, {
            followUpStatus: status,
            ...(status === FOLLOW_UP_STATUS.CONTACTED ? { lastContactedAt: new Date() } : {}),
          })}
          onSchedule={(date) => saveFollowUp(openLead, { nextFollowUpAt: date })}
          onReopen={() => saveFollowUp(openLead, { followUpStatus: FOLLOW_UP_STATUS.FOLLOW_UP_REQUIRED })}
          onDelete={() => removeLead(openLead)}
        />
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

function Badge({ label, color }) {
  return (
    <span className={styles.badge} style={{ color, background: `${color}18`, borderColor: `${color}35` }}>
      {label}
    </span>
  );
}

function paymentColor(status) {
  if (status === PAYMENT_STATUS.SUCCESS) return '#4ade80';
  if (status === PAYMENT_STATUS.FAILED) return '#ef4444';
  if (status === PAYMENT_STATUS.CANCELLED) return '#888';
  return '#c9a84c';
}

function followUpColor(status) {
  if (status === FOLLOW_UP_STATUS.CONVERTED) return '#4ade80';
  if (status === FOLLOW_UP_STATUS.LOST) return '#888';
  if (status === FOLLOW_UP_STATUS.CONTACTED) return '#6c8ebf';
  if (status === FOLLOW_UP_STATUS.FOLLOW_UP_REQUIRED) return '#f5a623';
  return '#9a9a9a';
}

function LeadDrawer({ lead, settings, noteDraft, setNoteDraft, saving, onClose, onSaveNote, onSetStatus, onSchedule, onReopen, onDelete }) {
  const wa = whatsappLink(followUpMessage(lead));
  const phone = (lead.customer?.phone || '').replace(/\D/g, '');
  const callHref = phone ? `tel:+91${phone}` : null;
  const status = effectiveCheckoutStatus(lead, settings);
  const items = lead.items || [];

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <div>
            <h3 className={styles.drawerTitle}>{lead.leadId || 'Checkout lead'}</h3>
            <p className={styles.drawerSub}>
              {CHECKOUT_STATUS_LABELS[status]} · {timeAgo(lead.createdAt)}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Customer */}
        <section className={styles.card}>
          <h4 className={styles.cardTitle}>👤 Customer Information</h4>
          <Row label="Name" value={lead.customer?.name} />
          <Row label="Phone" value={lead.customer?.phone} />
          <Row label="Email" value={lead.customer?.email} />
        </section>

        {/* Order */}
        <section className={styles.card}>
          <h4 className={styles.cardTitle}>🛍 Order Information</h4>
          {items.length > 0 ? (
            <div className={styles.itemList}>
              {items.map((item, i) => (
                <div key={i} className={styles.itemRow}>
                  <span>{item.name}{item.variant ? ` (${item.variant})` : ''} × {item.qty}</span>
                  <span className={styles.itemPrice}>₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ) : <p className={styles.muted}>No items recorded.</p>}
          <Row label="Subtotal" value={`₹${(lead.subtotal || 0).toLocaleString('en-IN')}`} />
          <Row label="Discount" value={lead.discount > 0 ? `− ₹${lead.discount.toLocaleString('en-IN')}` : '—'} />
          <Row label="Delivery Charge" value={lead.deliveryCharge > 0 ? `₹${lead.deliveryCharge}` : 'Free'} />
          <Row label="Total" value={`₹${(lead.grandTotal || 0).toLocaleString('en-IN')}`} bold />
        </section>

        {/* Delivery */}
        <section className={styles.card}>
          <h4 className={styles.cardTitle}>🚚 Delivery Information</h4>
          <Row label="Method" value={lead.deliveryMethod === 'PICKUP' ? 'Store pickup' : 'Home delivery'} />
          <Row label="Zone" value={lead.deliveryMethod === 'PICKUP' ? 'Store Pickup' : lead.deliveryZoneName} />
          <Row label="Areas" value={lead.deliveryAreas} />
          <Row label="PIN code" value={lead.deliveryPincode} />
          <Row label="Address" value={deliveryAddressText(lead)} />
          {lead.pickupLocation && <Row label="Pickup location" value={lead.pickupLocation} />}
        </section>

        {/* Gift */}
        {lead.orderType === 'GIFT_ORDER' && (
          <section className={styles.card}>
            <h4 className={styles.cardTitle}>🎁 Gift Information</h4>
            <Row label="Recipient" value={lead.recipient?.name} />
            <Row label="Recipient phone" value={lead.recipient?.phone} />
            <Row label="Recipient address" value={recipientAddressText(lead.recipient)} />
            <Row label="Surprise gift" value={lead.isSurpriseGift ? 'Yes — keep it a surprise' : 'No'} />
            <Row label="Sender identity" value={lead.hideSenderIdentity ? 'Hidden from the recipient' : 'Visible'} />
            {lead.giftMessage && <Row label="Gift message" value={lead.giftMessage} highlight />}
          </section>
        )}

        {/* Payment */}
        <section className={styles.card}>
          <h4 className={styles.cardTitle}>💳 Payment Information</h4>
          <Row label="Payment status" value={PAYMENT_STATUS_LABELS[lead.paymentStatus] || lead.paymentStatus} />
          <Row label="Payment reference" value={lead.paymentId} mono />
          <Row label="Payment order id" value={lead.razorpayOrderId} mono />
          <Row label="Failure reason" value={lead.paymentFailureReason} />
          <Row label="Linked order" value={lead.linkedOrderId} mono />
          <Row label="Last activity" value={timeAgo(lead.lastActivityAt)} />
        </section>

        {/* Follow-up */}
        <section className={styles.card}>
          <h4 className={styles.cardTitle}>📞 Follow-up</h4>
          <Row label="Follow-up status" value={FOLLOW_UP_STATUS_LABELS[lead.followUpStatus] || lead.followUpStatus} />
          <Row label="Last contacted" value={lead.lastContactedAt ? timeAgo(lead.lastContactedAt) : 'Never'} />
          <Row label="Next follow-up" value={lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString('en-IN') : 'Not scheduled'} />

          <div className={styles.actionRow}>
            {wa ? (
              <a className={styles.whatsappBtn} href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>
            ) : (
              <span className={styles.actionHint} title="Add your WhatsApp number in src/data/site.js">💬 WhatsApp (number not set)</span>
            )}
            {callHref && <a className={styles.callBtn} href={callHref}>📞 Call</a>}
            <button className={styles.smallBtn} onClick={() => onSetStatus(FOLLOW_UP_STATUS.CONTACTED)}>Mark contacted</button>
            <button className={styles.smallBtn} onClick={() => onSetStatus(FOLLOW_UP_STATUS.FOLLOW_UP_REQUIRED)}>Needs follow-up</button>
            <button className={styles.smallBtn} onClick={() => onSetStatus(FOLLOW_UP_STATUS.CONVERTED)}>Mark converted</button>
            <button className={styles.smallBtn} onClick={() => onSetStatus(FOLLOW_UP_STATUS.LOST)}>Mark lost</button>
            <button className={styles.smallBtn} onClick={onReopen}>Reopen</button>
          </div>

          <div className={styles.scheduleRow}>
            <input
              type="date"
              className={styles.dateInput}
              onChange={e => onSchedule(e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
            <span className={styles.actionHint}>Schedule a follow-up date</span>
          </div>

          <textarea
            className={styles.notes}
            rows={4}
            placeholder="Follow-up notes (private — never shown to the customer)"
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
          />
          <button className={styles.primaryBtn} onClick={onSaveNote} disabled={saving}>Save notes</button>
        </section>

        <div className={styles.dangerZone}>
          <button className={styles.dangerBtn} onClick={onDelete}>Delete this lead</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, bold, highlight }) {
  return (
    <div className={`${styles.row} ${highlight ? styles.rowHighlight : ''}`}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${mono ? styles.mono : ''} ${bold ? styles.bold : ''}`}>{value || '—'}</span>
    </div>
  );
}

function deliveryAddressText(lead) {
  const a = lead.deliveryAddress || lead.buyerAddress;
  if (!a || !a.address) return '';
  return [a.address, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}

function recipientAddressText(recipient) {
  if (!recipient || !recipient.address) return '';
  return [recipient.address, recipient.city, recipient.state, recipient.pincode, recipient.landmark]
    .filter(Boolean)
    .join(', ');
}
