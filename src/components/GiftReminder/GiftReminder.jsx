import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';

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

  if (saved) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gold)' }}>
        ✓ We'll email you a week before your {form.occasion.toLowerCase()} reminder.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: 8 }}>Never Miss a Gifting Moment</h3>
      <p style={{ opacity: 0.75, fontSize: '0.88rem', marginBottom: 20 }}>
        Set a reminder for a birthday, anniversary or special date — we'll email you a week in advance.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Your name"
          style={{ background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '12px 14px' }}
        />
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="Your email"
          style={{ background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '12px 14px' }}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={form.occasion}
            onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))}
            style={{ flex: 1, background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '12px 14px' }}
          >
            {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ flex: 1, background: 'var(--black-soft)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', padding: '12px 14px' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', opacity: 0.8 }}>
          <input
            type="checkbox"
            checked={form.recurringYearly}
            onChange={e => setForm(f => ({ ...f, recurringYearly: e.target.checked }))}
          />
          Remind me every year
        </label>
        <button type="submit" className="btn-gold" disabled={saving}>
          {saving ? 'Saving…' : 'Set Reminder'}
        </button>
      </form>
    </div>
  );
}
