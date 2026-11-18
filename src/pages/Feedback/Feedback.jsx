import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import FeedbackForm from '../../components/Feedback/FeedbackForm';
import { FEEDBACK_CATEGORY_CONFIG } from '../../lib/feedback';
import styles from './Feedback.module.css';

export default function Feedback() {
  const [params] = useSearchParams();

  // The link we email the customer after their order comes with the order id
  // (and the gift, when the order has a single one) already filled in, so
  // they only have to write what they think.
  const linkedOrder = params.get('order') || '';
  const linkedProduct = params.get('product') || '';
  const linkedName = params.get('name') || '';

  // A customer arriving from their order is almost certainly talking about
  // the product — so it is pre-selected, and they can still change it.
  const [category, setCategory] = useState(() => (linkedOrder ? 'product' : ''));

  const feedbackSource = useMemo(() => {
    if (linkedOrder) return `feedback-page:order:${linkedOrder}`;
    return 'feedback-page';
  }, [linkedOrder]);

  return (
    <div className={`page-container ${styles.page}`}>
      <Helmet>
        <title>Share Your Feedback | Subwikha's Hub</title>
        <meta name="description" content="Tell us what you think — your feedback helps us make every Subwikha's Hub gift more special. Product, delivery, packaging, website or a complaint — we read everything." />
      </Helmet>

      <div className={styles.header}>
        <span className={styles.heroIcon}>💌</span>
        <span className="section-label">Your Voice Matters</span>
        <h1 className={styles.title}>Share Your Feedback</h1>
        <p className={styles.subtitle}>
          {linkedOrder
            ? `Thank you for your order ${linkedOrder}${linkedName ? ` (${linkedName})` : ''} — we'd love to hear what you think of it.`
            : 'Whether you loved the gift, spotted a problem, or just had an idea — we read every single message. It helps us make every gift more special.'}
        </p>
      </div>

      <div className={styles.inner}>
        {/* The one reusable form, configured for this page. */}
        <div className={styles.formCard}>
          <FeedbackForm
            category={category || undefined}
            sourcePage={feedbackSource}
            orderId={linkedOrder || null}
            productId={linkedProduct || null}
            productName={linkedName || null}
            initialDetails={linkedName ? { productName: linkedName } : null}
            title="Tell us everything"
          />
        </div>

        {/* A quiet category picker that pre-fills the form. */}
        <div className={styles.side}>
          <h2 className={styles.sideTitle}>What would you like to tell us about?</h2>
          <div className={styles.categoryList}>
            {FEEDBACK_CATEGORY_CONFIG.map(c => (
              <button
                key={c.key}
                className={`${styles.categoryBtn} ${category === c.key ? styles.categoryBtnActive : ''}`}
                onClick={() => setCategory(category === c.key ? '' : c.key)}
              >
                <span className={styles.categoryIcon}>{c.icon}</span>
                <span className={styles.categoryText}>
                  <span className={styles.categoryName}>{c.label}</span>
                  <span className={styles.categoryDesc}>{c.description}</span>
                </span>
              </button>
            ))}
          </div>

          <div className={styles.privacyNote}>
            <h3 className={styles.privacyTitle}>🔒 Your privacy</h3>
            <p>
              We only ask for your name and contact details so we can get back to you — and you can
              send feedback completely anonymously instead. We never share anything you tell us with
              anyone else.
            </p>
            <p className={styles.privacyLink}>
              Read more in our <Link to="/privacy">privacy policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
