import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { collection, doc, getDoc, limit, orderBy, query, setDoc, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db, auth } from '../../firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  DEFAULT_EMAIL_SETTINGS,
  EMAIL_DELIVERY_STATUS,
  EMAIL_LOG_COLLECTION,
  EMAIL_PROVIDER,
  EMAIL_SETTINGS_COLLECTION,
  EMAIL_SETTINGS_DOC,
  NOTIFICATION_TYPE_LABELS,
} from '../../lib/emailConfig';
import styles from './AdminEmailSettings.module.css';

const PROVIDER_LABELS = {
  [EMAIL_PROVIDER.EMAILJS]: 'EmailJS (the template already on the account)',
  [EMAIL_PROVIDER.RESEND]: 'Resend (full HTML emails, any recipient)',
  [EMAIL_PROVIDER.NONE]: 'Off — no emails at all',
};

const STATUS_COLORS = {
  SENT: '#4ade80',
  SENDING: '#c9a84c',
  FAILED: '#ef4444',
  SKIPPED: '#888',
};

export default function AdminEmailSettings() {
  const { checking, authed, logout } = useAdminAuth();
  const [settings, setSettings] = useState(DEFAULT_EMAIL_SETTINGS);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [retrying, setRetrying] = useState('');

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const load = async () => {
    setLoading(true);
    try {
      const [settingsSnap, logSnap] = await Promise.all([
        getDoc(doc(db, EMAIL_SETTINGS_COLLECTION, EMAIL_SETTINGS_DOC)),
        getDocs(query(collection(db, EMAIL_LOG_COLLECTION), orderBy('updatedAt', 'desc'), limit(60))),
      ]);
      if (settingsSnap.exists()) {
        setSettings(prev => ({ ...prev, ...settingsSnap.data() }));
      }
      const entries = logSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      setLog(entries);
    } catch (err) {
      console.error(err);
      toast.error('Could not load the email settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, EMAIL_SETTINGS_COLLECTION, EMAIL_SETTINGS_DOC), {
        ...settings,
        updatedAt: new Date(),
      }, { merge: true });
      toast.success('Email settings saved');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Could not save the settings');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      // Save first, so the test uses the address that was just typed in.
      await setDoc(doc(db, EMAIL_SETTINGS_COLLECTION, EMAIL_SETTINGS_DOC), {
        ...settings,
        updatedAt: new Date(),
      }, { merge: true });
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'The test email could not be sent.');
      } else {
        toast.success(`Test email sent to ${data.to}`);
      }
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Could not send the test email');
    } finally {
      setTesting(false);
    }
  };

  const retry = async (key) => {
    setRetrying(key);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/retry-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Could not re-send that notification.');
      } else {
        toast.success('Notification re-sent');
      }
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Could not retry the notification');
    } finally {
      setRetrying('');
    }
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
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <img src="/logo.png" alt="" className={styles.topLogo} />
          <div className={styles.topText}>
            <span className={styles.topBrand}>Subwikha's Hub</span>
            <span className={styles.topLabel}>Email Settings</span>
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
        {/* What gets emailed */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>📬 What you get emailed about</h3>
          <p className={styles.sectionText}>
            Every email below is sent by the server after the event has actually happened — never
            because a page said so.
          </p>
          <Toggle
            label="New order received"
            hint="Sent once per paid order, with the full order details and a link to the admin."
            checked={settings.orderNotificationsEnabled}
            onChange={v => setSettings(s => ({ ...s, orderNotificationsEnabled: v }))}
          />
          <Toggle
            label="Customer feedback"
            hint="Sent when someone leaves feedback."
            checked={settings.feedbackNotificationsEnabled}
            onChange={v => setSettings(s => ({ ...s, feedbackNotificationsEnabled: v }))}
          />
          <Toggle
            label="The feedback form, after delivery"
            hint="When you mark an order delivered, the buyer is emailed a link to the feedback form with their order and gift already filled in — so they can rate the product, the packaging and the delivery. The recipient of a gift is never emailed."
            checked={settings.feedbackRequestEnabled}
            onChange={v => setSettings(s => ({ ...s, feedbackRequestEnabled: v }))}
          />
          <Toggle
            label="Payment failed or cancelled"
            hint="Off by default — a failed payment is usually not worth an email."
            checked={settings.paymentFailureNotificationsEnabled}
            onChange={v => setSettings(s => ({ ...s, paymentFailureNotificationsEnabled: v }))}
          />
          <Toggle
            label="Daily summary of abandoned checkouts"
            hint="One email a day listing the checkouts worth a follow-up call."
            checked={settings.abandonedSummaryEnabled}
            onChange={v => setSettings(s => ({ ...s, abandonedSummaryEnabled: v }))}
          />
        </div>

        {/* Where they go */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>⚙ Settings</h3>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="email-provider">Email provider</label>
            <select
              id="email-provider"
              className={styles.select}
              value={settings.provider}
              onChange={e => setSettings(s => ({ ...s, provider: e.target.value }))}
            >
              {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <span className={styles.fieldHint}>
              {settings.provider === EMAIL_PROVIDER.EMAILJS && 'Uses the EmailJS template already connected to this project. The recipient is whichever address that template is set to — put {{to_email}} in the template’s To field to make it follow the address below.'}
              {settings.provider === EMAIL_PROVIDER.RESEND && 'Sends our own branded HTML email to any address. Needs RESEND_API_KEY in the environment, and EMAIL_FROM for the sender.'}
              {settings.provider === EMAIL_PROVIDER.NONE && 'No emails will be sent at all.'}
            </span>
            <span className={styles.fieldHint}>
              The API key is never stored here or in the browser — it lives in the server
              environment, so it can’t be read from the site.
            </span>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="admin-email">Send notifications to</label>
              <input
                id="admin-email"
                type="email"
                className={styles.input}
                value={settings.adminEmail || ''}
                onChange={e => setSettings(s => ({ ...s, adminEmail: e.target.value }))}
                placeholder="you@example.com"
              />
              <span className={styles.fieldHint}>
                Leave empty to use the ADMIN_NOTIFICATION_EMAIL environment variable.
              </span>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sender-name">Sender name</label>
              <input
                id="sender-name"
                className={styles.input}
                value={settings.senderName || ''}
                onChange={e => setSettings(s => ({ ...s, senderName: e.target.value }))}
                placeholder="Subwikha's Hub"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="sender-email">Sender address</label>
              <input
                id="sender-email"
                type="email"
                className={styles.input}
                value={settings.senderEmail || ''}
                onChange={e => setSettings(s => ({ ...s, senderEmail: e.target.value }))}
                placeholder="orders@yourdomain.com"
              />
              <span className={styles.fieldHint}>Only needed for providers that let you pick a sender.</span>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="retry-limit">Retry limit</label>
              <input
                id="retry-limit"
                type="number"
                min="1"
                max="10"
                className={styles.input}
                value={settings.retryLimit ?? 3}
                onChange={e => setSettings(s => ({ ...s, retryLimit: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
              />
              <span className={styles.fieldHint}>How many times a failed notification may be re-sent.</span>
            </div>
          </div>

          {!settings.adminEmail && (
            <div className={styles.warningBanner}>
              ⚠ No notification address yet. Set one above, or add the ADMIN_NOTIFICATION_EMAIL
              environment variable — until then, no notifications are sent.
            </div>
          )}

          <div className={styles.actionRow}>
            <button className={styles.primaryBtn} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <button className={styles.secondaryBtn} onClick={sendTest} disabled={testing || saving}>
              {testing ? 'Sending…' : '✉️ Send a test email'}
            </button>
          </div>
        </div>

        {/* Delivery log */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>📮 Delivery log</h3>
          <p className={styles.sectionText}>
            Every notification that was attempted, and what happened to it. One row per order —
            a webhook that fires twice still only produces one email.
          </p>
          {loading ? (
            <div className={styles.loadingState}><div className={styles.loadingSpinner} /><p>Loading log...</p></div>
          ) : log.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>No notifications have been sent yet.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Tries</th>
                    <th>When</th>
                    <th>Error</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {log.map(entry => (
                    <tr key={entry.firestoreId} className={styles.row}>
                      <td><span className={styles.typeCell}>{NOTIFICATION_TYPE_LABELS[entry.type] || entry.type}</span></td>
                      <td><span className={styles.subjectCell}>{entry.subject}</span></td>
                      <td>
                        <span className={styles.badge} style={{ color: STATUS_COLORS[entry.status] || '#888', background: `${STATUS_COLORS[entry.status] || '#888'}18`, borderColor: `${STATUS_COLORS[entry.status] || '#888'}35` }}>
                          {entry.status}
                        </span>
                      </td>
                      <td><span className={styles.attemptsCell}>{entry.attempts || 1}</span></td>
                      <td><span className={styles.dateCell}>{formatDate(entry.updatedAt || entry.createdAt)}</span></td>
                      <td><span className={styles.errorCell}>{entry.lastError || '—'}</span></td>
                      <td>
                        {entry.status === EMAIL_DELIVERY_STATUS.FAILED && (
                          <button
                            className={styles.smallBtn}
                            onClick={() => retry(entry.firestoreId)}
                            disabled={retrying === entry.firestoreId}
                          >
                            {retrying === entry.firestoreId ? '…' : '↻ Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className={styles.toggleRow}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span>
        <span className={styles.toggleTitle}>{label}</span>
        <span className={styles.toggleHint}>{hint}</span>
      </span>
    </label>
  );
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
