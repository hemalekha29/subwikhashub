import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import styles from './AdminAnalytics.module.css';

function isAdminAuthed() {
  return sessionStorage.getItem('subwikha_admin') === '1';
}

const STATUS_COLORS = { paid: '#c9a84c', processing: '#6c8ebf', shipped: '#f5a623', delivered: '#4ade80' };
const STATUS_LABELS = { paid: 'New Order', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' };

// ── Data helpers ─────────────────────────────────────────────────────────────

function getRevenueByDay(orders, days) {
  const slots = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    slots.push({ key: d.toISOString().slice(0, 10), revenue: 0, count: 0 });
  }
  orders.forEach(o => {
    if (!o.createdAt) return;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const key = d.toISOString().slice(0, 10);
    const slot = slots.find(s => s.key === key);
    if (slot) { slot.revenue += o.grandTotal || 0; slot.count += 1; }
  });
  return slots;
}

function getStatusDist(orders) {
  const dist = { paid: 0, processing: 0, shipped: 0, delivered: 0 };
  orders.forEach(o => { if (o.status in dist) dist[o.status]++; });
  return dist;
}

function getWishlistDemand(wishlistEvents, orders) {
  const orderedNames = new Set();
  orders.forEach(o => (o.items || []).forEach(i => orderedNames.add(i.name)));
  const counts = {};
  wishlistEvents.forEach(e => {
    const key = e.slug || e.name;
    if (!counts[key]) counts[key] = { name: e.name, count: 0 };
    counts[key].count += 1;
  });
  return Object.values(counts)
    .map(c => ({ ...c, everOrdered: orderedNames.has(c.name) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getTopProducts(orders) {
  const map = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 };
      map[item.name].qty += item.qty || 1;
      map[item.name].revenue += (item.price || 0) * (item.qty || 1);
    });
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
}

// ── Bar Chart (SVG) ──────────────────────────────────────────────────────────

function BarChart({ data }) {
  const VW = 560;
  const VH = 160;
  const PAD_L = 38;
  const PAD_B = 26;
  const n = data.length;
  const maxRev = Math.max(...data.map(d => d.revenue), 1);
  const yMax = maxRev < 200 ? 200 : Math.ceil(maxRev / 500) * 500;
  const yTicks = [0, Math.round(yMax / 2), yMax];
  const slotW = (VW - PAD_L) / n;
  const barW = Math.max(slotW - 5, 3);
  const labelInterval = Math.max(1, Math.floor(n / 6));

  const getY = v => VH - (v / yMax) * VH;

  return (
    <svg viewBox={`0 0 ${VW} ${VH + PAD_B}`} className={styles.barSvg} preserveAspectRatio="xMidYMid meet">
      {yTicks.map((t, ti) => (
        <g key={ti}>
          <line x1={PAD_L} y1={getY(t)} x2={VW} y2={getY(t)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <text x={PAD_L - 5} y={getY(t) + 4} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={9}>
            {t === 0 ? '0' : t >= 1000 ? `₹${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : `₹${t}`}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const bH = (d.revenue / yMax) * VH;
        const x = PAD_L + i * slotW + (slotW - barW) / 2;
        const showLbl = i === 0 || i % labelInterval === 0 || i === n - 1;
        return (
          <g key={d.key}>
            <rect
              x={x} y={getY(d.revenue)}
              width={barW} height={Math.max(bH, d.revenue > 0 ? 3 : 1)}
              fill={d.revenue > 0 ? (i === n - 1 ? '#c9a84c' : 'rgba(201,168,76,0.45)') : 'rgba(255,255,255,0.04)'}
              rx={2}
            />
            {showLbl && (
              <text x={x + barW / 2} y={VH + PAD_B - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8.5}>
                {new Date(d.key + 'T12:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut Chart (CSS conic-gradient) ─────────────────────────────────────────

function DonutChart({ dist, total }) {
  if (total === 0) {
    return (
      <div className={styles.donutSection}>
        <div className={styles.donut} style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className={styles.donutHole}><span className={styles.donutZero}>No data</span></div>
        </div>
      </div>
    );
  }
  let acc = 0;
  const segs = Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([s, v]) => {
      const pct = (v / total) * 100;
      const seg = `${STATUS_COLORS[s]} ${acc}% ${acc + pct}%`;
      acc += pct;
      return seg;
    });

  return (
    <div className={styles.donutSection}>
      <div className={styles.donut} style={{ background: `conic-gradient(${segs.join(', ')})` }}>
        <div className={styles.donutHole}>
          <span className={styles.donutTotal}>{total}</span>
          <span className={styles.donutTotalLabel}>orders</span>
        </div>
      </div>
      <div className={styles.donutLegend}>
        {Object.entries(dist).map(([s, v]) => (
          <div key={s} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: STATUS_COLORS[s] }} />
            <span className={styles.legendName}>{STATUS_LABELS[s]}</span>
            <span className={styles.legendVal}>{v}</span>
            <span className={styles.legendPct}>{total > 0 ? `${Math.round((v / total) * 100)}%` : '0%'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Products ─────────────────────────────────────────────────────────────

function TopProducts({ products }) {
  const maxRev = Math.max(...products.map(p => p.revenue), 1);
  if (products.length === 0) return <p className={styles.noData}>No product data yet.</p>;
  return (
    <div className={styles.productsTable}>
      {products.map((p, i) => (
        <div key={p.name} className={styles.productRow}>
          <span className={styles.productRank}>#{i + 1}</span>
          <div className={styles.productInfo}>
            <span className={styles.productName}>{p.name}</span>
            <div className={styles.productBarWrap}>
              <div className={styles.productBarFill} style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
            </div>
          </div>
          <div className={styles.productMeta}>
            <span className={styles.productRevenue}>₹{p.revenue.toLocaleString('en-IN')}</span>
            <span className={styles.productQty}>{p.qty} sold</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [wishlistEvents, setWishlistEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    if (!isAdminAuthed()) { navigate('/admin/login'); return; }
    fetchOrders();
    fetchWishlistEvents();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const data = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() ?? new Date(0);
        const tb = b.createdAt?.toDate?.() ?? new Date(0);
        return ta - tb;
      });
      setOrders(data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlistEvents = async () => {
    try {
      const snap = await getDocs(collection(db, 'wishlistEvents'));
      setWishlistEvents(snap.docs.map(d => d.data()));
    } catch (err) {
      console.error('Wishlist analytics fetch error:', err);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('subwikha_admin');
    navigate('/admin/login');
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const deliveryRate = totalOrders ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  const revenueByDay = getRevenueByDay(orders, range);
  const periodRevenue = revenueByDay.reduce((s, d) => s + d.revenue, 0);
  const periodOrders = revenueByDay.reduce((s, d) => s + d.count, 0);

  const statusDist = getStatusDist(orders);
  const topProducts = getTopProducts(orders);
  const wishlistDemand = getWishlistDemand(wishlistEvents, orders);

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
        <p>Loading analytics...</p>
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
            <span className={styles.topLabel}>Analytics</span>
          </div>
        </div>
        <nav className={styles.topNav}>
          <Link to="/admin/orders"    className={styles.navLink}>Orders</Link>
          <Link to="/admin/products"  className={styles.navLink}>Products</Link>
          <Link to="/admin/analytics" className={`${styles.navLink} ${styles.navActive}`}>Analytics</Link>
          <Link to="/admin/gallery"   className={styles.navLink}>Gallery</Link>
        </nav>
        <div className={styles.topRight}>
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.content}>
        {/* KPI Row */}
        <div className={styles.kpiRow}>
          <div className={`${styles.kpiCard} ${styles.kpiGold}`}>
            <span className={styles.kpiValue}>₹{totalRevenue.toLocaleString('en-IN')}</span>
            <span className={styles.kpiLabel}>Total Revenue</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiValue}>{totalOrders}</span>
            <span className={styles.kpiLabel}>Total Orders</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiValue}>₹{avgOrderValue.toLocaleString('en-IN')}</span>
            <span className={styles.kpiLabel}>Avg Order Value</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiValue}>{deliveryRate}%</span>
            <span className={styles.kpiLabel}>Delivery Rate</span>
            <span className={styles.kpiSub}>{deliveredCount} delivered</span>
          </div>
        </div>

        {/* Revenue chart + Donut */}
        <div className={styles.row2}>
          <div className={styles.chartCard}>
            <div className={styles.chartHead}>
              <div>
                <h3 className={styles.cardTitle}>Revenue Over Time</h3>
                <p className={styles.chartSub}>
                  ₹{periodRevenue.toLocaleString('en-IN')} · {periodOrders} orders in last {range} days
                </p>
              </div>
              <div className={styles.rangeTabs}>
                {[7, 14, 30].map(r => (
                  <button
                    key={r}
                    className={`${styles.rangeTab} ${range === r ? styles.rangeTabActive : ''}`}
                    onClick={() => setRange(r)}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>
            <BarChart data={revenueByDay} />
          </div>

          <div className={styles.donutCard}>
            <h3 className={styles.cardTitle}>Orders by Status</h3>
            <DonutChart dist={statusDist} total={totalOrders} />
          </div>
        </div>

        {/* Top Products */}
        <div className={styles.productsCard}>
          <h3 className={styles.cardTitle}>Top Products by Revenue</h3>
          <TopProducts products={topProducts} />
        </div>

        {/* Wishlist Demand */}
        <div className={styles.productsCard}>
          <h3 className={styles.cardTitle}>Most Wishlisted Products</h3>
          {wishlistDemand.length === 0 ? (
            <p className={styles.noData}>No wishlist activity yet.</p>
          ) : (
            <div className={styles.productsTable}>
              {wishlistDemand.map((p, i) => (
                <div key={p.name} className={styles.productRow}>
                  <span className={styles.productRank}>#{i + 1}</span>
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>{p.name}</span>
                  </div>
                  <div className={styles.productMeta}>
                    <span className={styles.productRevenue}>{p.count} saves</span>
                    <span className={styles.productQty} style={{ color: p.everOrdered ? '#4ade80' : '#f5a623' }}>
                      {p.everOrdered ? 'Has been ordered' : 'Never ordered — consider a promo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
