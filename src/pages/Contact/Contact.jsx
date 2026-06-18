import { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';
import styles from './Contact.module.css';

// ── EmailJS config ──────────────────────────────────────────
// 1. Go to https://www.emailjs.com and create a free account
// 2. Add a Gmail service → copy the Service ID below
// 3. Create an email template → copy the Template ID below
// 4. Go to Account → API Keys → copy your Public Key below
const EMAILJS_SERVICE_ID  = 'service_tq7y4u2';
const EMAILJS_TEMPLATE_ID = 'template_wd6f6bw';
const EMAILJS_PUBLIC_KEY  = 'kmmr3Ac8anXDDcvyn';
// ────────────────────────────────────────────────────────────

export default function Contact() {
  const formRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await emailjs.sendForm(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        formRef.current,
        EMAILJS_PUBLIC_KEY
      );
      setSent(true);
      toast.success('Message sent! We\'ll reply within 24 hours.');
    } catch (err) {
      toast.error('Something went wrong. Please DM us on Instagram.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`page-container ${styles.contact}`}>
      <div className={styles.header}>
        <span className="section-label">Get In Touch</span>
        <h1 className={styles.title}>Contact Us</h1>
        <p className={styles.subtitle}>We'd love to hear from you. Whether it's a custom order, a question, or just a hello.</p>
      </div>

      <div className={styles.inner}>
        {/* Info */}
        <div className={styles.info}>
          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>📸</span>
            <div>
              <h4 className={styles.infoTitle}>Instagram</h4>
              <p className={styles.infoText}>
                <a href="https://www.instagram.com/subwikhahub" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>@subwikhahub</a>
                <br />DM us for custom orders & enquiries
              </p>
            </div>
          </div>

          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>◆</span>
            <div>
              <h4 className={styles.infoTitle}>Custom Orders</h4>
              <p className={styles.infoText}>
                Need something bespoke? We specialize in fully personalized gift experiences for special occasions.
              </p>
            </div>
          </div>

          <div className={styles.infoCard}>
            <span className={styles.infoIcon}>⏱</span>
            <div>
              <h4 className={styles.infoTitle}>Response Time</h4>
              <p className={styles.infoText}>We reply within 24 hours<br />Mon–Sat, 10am–7pm IST</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className={styles.formWrap}>
          {sent ? (
            <div className={styles.thankYou}>
              <span className={styles.thankIcon}>◈</span>
              <h3>Thank You!</h3>
              <p>Your message has been received. We'll get back to you shortly.</p>
              <button className="btn-outline" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                Send Another
              </button>
            </div>
          ) : (
            <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" className={styles.input} />
                </div>
                <div className={styles.field}>
                  <label>Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className={styles.input} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Subject</label>
                <input name="subject" value={form.subject} onChange={handleChange} placeholder="How can we help?" className={styles.input} />
              </div>
              <div className={styles.field}>
                <label>Message *</label>
                <textarea name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Tell us about your gifting needs..." className={styles.textarea} />
              </div>
              <button type="submit" className="btn-gold" style={{ width: '100%', padding: '16px' }} disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
