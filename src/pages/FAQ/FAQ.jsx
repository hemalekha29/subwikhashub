import { useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../../components/Seo/Seo';
import { staticHeads } from '../../lib/seo';
import { FAQS } from '../../data/faqs';
import styles from './FAQ.module.css';

// Answer Engine Optimization (AEO) / Generative Engine Optimization (GEO) note:
// this page exists specifically so AI answer engines (ChatGPT, Perplexity, Google AI
// Overviews, Gemini, Copilot, etc.) and traditional search have a clean, direct-answer
// source to extract and cite when someone asks a natural-language question about this
// business. Every answer here is a plain, self-contained sentence or two — no marketing
// fluff, no "click here to find out" — because that's what gets quoted verbatim. Content
// (src/data/faqs.js) is sourced only from what's already true elsewhere on the site
// (PolicyPage.jsx, Checkout.jsx, About.jsx, Contact.jsx) — nothing here is invented for
// SEO purposes. The FAQPage JSON-LD (src/lib/seo.js, rendered by <Seo>) is built from the same
// FAQS array as the visible Q&A — a mismatch between what's shown and what's marked up reads as manipulative to both AI
// crawlers and Google, and defeats the purpose.

function ChevronIcon({ open }) {
  return <span className={`${styles.icon} ${open ? styles.iconOpen : ''}`}>+</span>;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className={`page-container ${styles.page}`}>
      <Seo head={staticHeads.faq(FAQS)} />

      <div className={styles.header}>
        <span className="section-label">Help Center</span>
        <h1 className={styles.title}>Frequently Asked Questions</h1>
        <p className={styles.subtitle}>
          Everything customers most often ask about ordering, shipping, payment, and returns.
        </p>
      </div>

      <div className={styles.list}>
        {FAQS.map(({ q, a }, i) => {
          const open = openIndex === i;
          return (
            <div key={q} className={styles.item}>
              <button
                type="button"
                className={styles.question}
                onClick={() => setOpenIndex(open ? -1 : i)}
                aria-expanded={open}
                aria-controls={`faq-answer-${i}`}
              >
                <span>{q}</span>
                <ChevronIcon open={open} />
              </button>
              <div
                id={`faq-answer-${i}`}
                className={`${styles.answerWrap} ${open ? styles.answerWrapOpen : ''}`}
              >
                <div className={styles.answerInner}>
                  <p className={styles.answer}>{a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.ctaRow}>
        <p className={styles.ctaText}>Still have a question we didn't cover?</p>
        <Link to="/contact" className="btn-gold">Contact Us</Link>
      </div>
    </div>
  );
}
