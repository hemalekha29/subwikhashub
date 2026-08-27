import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { isValidEmail } from '../../lib/validators';
import toast from 'react-hot-toast';
import styles from './GiftReminder.module.css';

const OCCASIONS = ['Birthday', 'Anniversary', "Valentine's Day", 'Wedding', 'Rakhi', 'Just Because'];

export default function GiftReminder() {
  const [form, setForm] = useState({ name: '', email: '', occasion: 'Birthday', date: '', recurringYearly: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.date) {
      toast.error('Please fill in your name, email and the date');
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    // Only checked for one-time reminders — a recurring reminder's match logic
    // (api/send-reminders.js) only ever compares month/day, ignoring the year, so a
    // past year is completely normal there (that's just how you'd enter a birthday).
    // For a one-time date, a past date can genuinely never fire.
    if (!form.recurringYearly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(form.date) < today) {
        toast.error('That date has already passed — pick an upcoming date, or check "Remind me every year" for a recurring date like a birthday');
        return;
      }
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'reminders'), {
        name: form.name.trim(),
        email: form.email.trim(),
        occasion: form.occasion,
        date: form.date,
        recurringYearly: form.recurringYearly,
        notified: false,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      toast.success("We'll remind you a week before!");
    } catch {
      toast.error('Could not save reminder — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.content}>
        <h3 className={styles.title}>Never Miss a Gifting Moment</h3>
        <p className={styles.subtitle}>
          Set a reminder for a birthday, anniversary or special date — we'll email you a week in advance.
        </p>

        {saved ? (
          <div className={styles.successCard}>
            <div className={styles.successCheck}><CheckIcon /></div>
            <p className={styles.successText}>
              We'll email you a week before your {form.occasion.toLowerCase()} reminder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <div className={styles.fieldWrap}>
              <span className={styles.fieldIcon}><UserIcon /></span>
              <input
                aria-label="Your name"
                className={styles.input}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>

            <div className={styles.fieldWrap}>
              <span className={styles.fieldIcon}><MailIcon /></span>
              <input
                type="email"
                aria-label="Your email"
                className={styles.input}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Your email"
              />
            </div>

            <div className={styles.row}>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}><TagIcon /></span>
                <select
                  aria-label="Occasion"
                  className={styles.select}
                  value={form.occasion}
                  onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))}
                >
                  {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}><CalendarIcon /></span>
                <input
                  type="date"
                  aria-label="Reminder date"
                  className={styles.input}
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.recurringYearly}
                onChange={e => setForm(f => ({ ...f, recurringYearly: e.target.checked }))}
              />
              Remind me every year
            </label>

            <button type="submit" className={`btn-gold ${styles.submitBtn}`} disabled={saving}>
              {saving ? 'Saving…' : 'Set Reminder'}
            </button>
          </form>
        )}
      </div>

      <div
        className={styles.imageWrap}
        role="img"
        aria-label="Illustration of a calendar with a date marked with a heart, a wrapped gift box, and a notification bell"
      >
        <div className={styles.scene} aria-hidden="true">
          <span className={`${styles.sparkle} ${styles.sparkle1}`} />
          <span className={`${styles.sparkle} ${styles.sparkle2}`} />
          <span className={`${styles.sparkle} ${styles.sparkle3}`} />

          <div className={styles.floatHeart1}><HeartIcon /></div>
          <div className={styles.floatHeart2}><HeartIcon /></div>

          <div className={styles.calendarFloat}>
            <div className={styles.calendar}>
              <span className={styles.ring} style={{ left: '28%' }} />
              <span className={styles.ring} style={{ left: '50%' }} />
              <span className={styles.ring} style={{ left: '72%' }} />
              <div className={styles.calHeader} />
              <div className={styles.calGrid}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} className={i === 6 ? `${styles.cell} ${styles.cellMarked}` : styles.cell}>
                    {i === 6 && <HeartIcon small />}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.bellWrap}>
            <BellIcon />
          </div>

          <div className={styles.giftFloat}>
            <div className={styles.gift}>
              <div className={styles.giftLid} />
              <span className={styles.ribbonV} />
              <span className={styles.bowLeft} />
              <span className={styles.bowRight} />
              <span className={styles.bowKnot} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" strokeWidth="1.6">
      <path
        d="M12 3a5 5 0 00-5 5v3.2c0 .6-.24 1.18-.66 1.6L4.6 14.5A1 1 0 005.3 16h13.4a1 1 0 00.7-1.71l-1.74-1.7a2.26 2.26 0 01-.66-1.6V8a5 5 0 00-5-5z"
        fill="var(--gold-light)"
      />
      <path d="M10 18.5a2 2 0 004 0" fill="none" />
    </svg>
  );
}

function HeartIcon({ small }) {
  const size = small ? 10 : 20;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#e0607a">
      <path d="M12 21s-7.2-4.6-9.9-9.1C.5 8.7 1.7 5 5.2 4.2c2-.5 3.9.4 4.8 2 .9-1.6 2.8-2.5 4.8-2 3.5.8 4.7 4.5 3.1 7.7C19.2 16.4 12 21 12 21z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.17H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l4.6-4.6a2 2 0 000-2.82z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--black)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
