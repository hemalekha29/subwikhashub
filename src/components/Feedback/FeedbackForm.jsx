import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RATING_LABELS, feedbackCategoryConfig, FEEDBACK_CATEGORY_CONFIG } from '../../lib/feedback';
import { uploadToCloudinary } from '../../lib/cloudinary';
import styles from './FeedbackForm.module.css';

/**
 * The universal feedback form.
 *
 * ONE component, used everywhere feedback is collected — the footer link, the
 * dedicated /feedback page, the order confirmation, the track-order page and
 * the product page. It takes its shape from props, so no page ever needs its
 * own form:
 *
 *   <FeedbackForm category="product" productId={p.id} productName={p.name}
 *                 sourcePage={`product:${p.slug}`} />
 */
export default function FeedbackForm({
  category: fixedCategory,
  productId = null,
  productName = null,
  orderId = null,
  sourcePage = 'unknown',
  title = 'Share Your Feedback',
  subtitle = 'Your words help us make every gift more special 💝',
  allowAnonymous = true,
  compact = false,
  initialDetails = null,
  onSubmitted = null,
}) {
  const fixedConfig = fixedCategory ? feedbackCategoryConfig(fixedCategory) : null;
  const [category, setCategory] = useState(fixedCategory || '');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', message: '', rating: 0, isAnonymous: false,
  });
  // Pre-filled answers — the link we email after an order already knows which
  // product the feedback is about, so the customer is not asked for it again.
  const [details, setDetails] = useState(initialDetails || {});
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  const config = fixedConfig || feedbackCategoryConfig(category);
  const canBeAnonymous = allowAnonymous && config?.allowAnonymous !== false;

  const setField = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: '' }));
  };

  const handleFiles = async (files) => {
    const list = Array.from(files || []).filter(f => f.type.startsWith('image/') && f.size <= 8 * 1024 * 1024).slice(0, 4);
    if (!list.length) {
      toast.error('Please choose images under 8 MB');
      return;
    }
    setUploading(true);
    try {
      const urls = [];
      for (const file of list) {
        urls.push(await uploadToCloudinary(file, 'feedback'));
      }
      setAttachments(prev => [...prev, ...urls].slice(0, 4));
    } catch (err) {
      console.error(err);
      toast.error('Could not upload the image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!fixedCategory && !category) errs.category = 'Please choose what your feedback is about';
    if (!form.isAnonymous && !form.name.trim()) errs.name = 'Please tell us your name';
    if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) errs.phone = 'Enter a valid 10-digit phone number';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (!form.message.trim() && Object.keys(details).filter(k => details[k]).length === 0) {
      errs.message = 'Please share a little more with us';
    }
    (config?.fields || []).forEach(field => {
      if (field.required && !details[field.key]) errs[field.key] = 'This one helps us a lot';
    });
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category || fixedCategory,
          name: form.name,
          phone: form.phone,
          email: form.email,
          rating: form.rating || null,
          message: form.message,
          details,
          productId,
          productName,
          orderId,
          sourcePage,
          isAnonymous: canBeAnonymous && form.isAnonymous,
          attachmentUrls: attachments,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'We could not save your feedback. Please try again.');
        setSubmitting(false);
        return;
      }
      setDone(true);
      setReference(data.reference || '');
      if (onSubmitted) onSubmitted(data);
    } catch {
      toast.error('We could not reach the server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={styles.success}>
        <span className={styles.successIcon}>💝</span>
        <h3 className={styles.successTitle}>Thank you for sharing your experience with Subwikha's Hub!</h3>
        <p className={styles.successText}>Your feedback helps us make every gift more special. 💝</p>
        {reference && <p className={styles.successRef}>Your reference: {reference}</p>}
      </div>
    );
  }

  return (
    <form className={`${styles.form} ${compact ? styles.compact : ''}`} onSubmit={handleSubmit} noValidate>
      {!compact && (
        <div className={styles.formHead}>
          <h3 className={styles.formTitle}>{title}</h3>
          <p className={styles.formSubtitle}>{subtitle}</p>
        </div>
      )}
      {!fixedCategory && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="feedback-category">What is your feedback about?</label>
          <select
            id="feedback-category"
            className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
            value={category}
            onChange={e => { setCategory(e.target.value); setDetails({}); setErrors({}); }}
          >
            <option value="">Choose a category…</option>
            {FEEDBACK_CATEGORY_CONFIG.map(c => (
              <option key={c.key} value={c.key}>{c.icon}  {c.label}</option>
            ))}
          </select>
          {errors.category && <span className={styles.errorMsg}>{errors.category}</span>}
          {config?.description && <span className={styles.hint}>{config.description}</span>}
        </div>
      )}

      {/* Rating */}
      <div className={styles.field}>
        <span className={styles.label}>Overall rating</span>
        <StarRating value={form.rating} onChange={v => setField('rating', v)} />
      </div>

      {/* Who you are */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="feedback-name">Your Name</label>
          <input
            id="feedback-name"
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Your name"
            disabled={canBeAnonymous && form.isAnonymous}
          />
          {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="feedback-phone">Phone <span className={styles.optional}>(Optional)</span></label>
          <input
            id="feedback-phone"
            type="tel"
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            value={form.phone}
            onChange={e => setField('phone', e.target.value)}
            placeholder="10-digit mobile number"
          />
          {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="feedback-email">Email <span className={styles.optional}>(Optional)</span></label>
        <input
          id="feedback-email"
          type="email"
          className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
          value={form.email}
          onChange={e => setField('email', e.target.value)}
          placeholder="you@example.com"
        />
        {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
      </div>

      {/* Category-specific fields */}
      {(config?.fields || []).map(field => (
        <div key={field.key} className={styles.field}>
          {field.type === 'rating' ? (
            <>
              <span className={styles.label}>{field.label}</span>
              <StarRating
                value={parseInt(details[field.key], 10) || 0}
                onChange={v => setDetails(d => ({ ...d, [field.key]: v }))}
                small
              />
            </>
          ) : field.type === 'select' ? (
            <>
              <label className={styles.label} htmlFor={`feedback-${field.key}`}>{field.label}</label>
              <select
                id={`feedback-${field.key}`}
                className={`${styles.select} ${errors[field.key] ? styles.inputError : ''}`}
                value={details[field.key] || ''}
                onChange={e => setDetails(d => ({ ...d, [field.key]: e.target.value }))}
              >
                <option value="">Choose…</option>
                {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </>
          ) : field.type === 'textarea' ? (
            <>
              <label className={styles.label} htmlFor={`feedback-${field.key}`}>{field.label}</label>
              <textarea
                id={`feedback-${field.key}`}
                rows={3}
                className={`${styles.textarea} ${errors[field.key] ? styles.inputError : ''}`}
                value={details[field.key] || ''}
                onChange={e => setDetails(d => ({ ...d, [field.key]: e.target.value }))}
                placeholder={field.placeholder || ''}
              />
            </>
          ) : (
            <>
              <label className={styles.label} htmlFor={`feedback-${field.key}`}>{field.label}</label>
              <input
                id={`feedback-${field.key}`}
                className={`${styles.input} ${errors[field.key] ? styles.inputError : ''}`}
                value={details[field.key] || ''}
                onChange={e => setDetails(d => ({ ...d, [field.key]: e.target.value }))}
                placeholder={field.placeholder || ''}
              />
            </>
          )}
          {errors[field.key] && <span className={styles.errorMsg}>{errors[field.key]}</span>}
        </div>
      ))}

      {/* Message */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="feedback-message">Your Feedback</label>
        <textarea
          id="feedback-message"
          rows={5}
          className={`${styles.textarea} ${errors.message ? styles.inputError : ''}`}
          value={form.message}
          onChange={e => setField('message', e.target.value)}
          placeholder="Tell us everything — we read every message 💌"
        />
        {errors.message && <span className={styles.errorMsg}>{errors.message}</span>}
      </div>

      {/* Attachment */}
      {config?.allowAttachment && (
        <div className={styles.field}>
          <span className={styles.label}>Add a photo <span className={styles.optional}>(Optional)</span></span>
          <div className={styles.attachmentRow}>
            {attachments.map((url, i) => (
              <span key={url} className={styles.thumbWrap}>
                <img src={url} alt="" className={styles.thumb} />
                <button
                  type="button"
                  className={styles.thumbRemove}
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                >✕</button>
              </span>
            ))}
            {attachments.length < 4 && (
              <button
                type="button"
                className={styles.attachBtn}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : '+ Add photo'}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Anonymous */}
      {canBeAnonymous && (
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={form.isAnonymous}
            onChange={e => {
              setField('isAnonymous', e.target.checked);
              if (e.target.checked) setForm(f => ({ ...f, name: '', phone: '', email: '' }));
            }}
          />
          <span>
            <span className={styles.checkTitle}>Send this anonymously</span>
            <span className={styles.checkHint}>Your name and contact details will not be saved.</span>
          </span>
        </label>
      )}

      <button type="submit" className={`btn-gold ${styles.submit}`} disabled={submitting || uploading}>
        {submitting ? <span className={styles.spinner} /> : 'Send Feedback'}
      </button>
    </form>
  );
}

/**
 * The interactive 1–5 star rating.
 *
 * Big enough to tap comfortably on a phone, with the meaning of each score
 * spelled out underneath so a rating of 3 is never a mystery.
 */
export function StarRating({ value = 0, onChange, small = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className={styles.ratingWrap}>
      <div
        className={`${styles.stars} ${small ? styles.starsSmall : ''}`}
        role="radiogroup"
        aria-label="Rating out of five"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''} — ${RATING_LABELS[n]}`}
            className={`${styles.star} ${n <= shown ? styles.starOn : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n === value ? 0 : n)}
          >
            ★
          </button>
        ))}
      </div>
      {shown > 0 && <span className={styles.ratingLabel}>{RATING_LABELS[shown]}</span>}
    </div>
  );
}
