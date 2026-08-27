import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
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
  const cardRef = useRef(null);

  // Subtle 3D tilt that follows the cursor — spring-smoothed so it settles rather than
  // snapping. translateZ() on the inner elements (see .module.css) gives the tilted
  // card a real sense of depth instead of just rotating a flat image.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-100, 100], [7, -7]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-100, 100], [-7, 7]), { stiffness: 200, damping: 20 });

  function handleMouseMove(e) {
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }
  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

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
      <motion.div
        ref={cardRef}
        className={styles.card}
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={styles.glow} />

        {saved ? (
          <div className={styles.successCard}>
            <div className={styles.successCheck}><CheckIcon /></div>
            <p className={styles.successText}>
              ✓ We'll email you a week before your {form.occasion.toLowerCase()} reminder.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.iconWrap}><GiftIcon /></div>
            <h3 className={styles.title}>Never Miss a Gifting Moment</h3>
            <p className={styles.subtitle}>
              Set a reminder for a birthday, anniversary or special date — we'll email you a week in advance.
            </p>

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

              <motion.button
                type="submit"
                className={`btn-gold ${styles.submitBtn}`}
                disabled={saving}
                whileHover={{ scale: saving ? 1 : 1.03 }}
                whileTap={{ scale: saving ? 1 : 0.97 }}
              >
                {saving ? 'Saving…' : 'Set Reminder'}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

function GiftIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 12v10H4V12" /><path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
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
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--black)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
