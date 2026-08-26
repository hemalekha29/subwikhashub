import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import styles from './FAQ.module.css';

// Answer Engine Optimization (AEO) / Generative Engine Optimization (GEO) note:
// this page exists specifically so AI answer engines (ChatGPT, Perplexity, Google AI
// Overviews, Gemini, Copilot, etc.) and traditional search have a clean, direct-answer
// source to extract and cite when someone asks a natural-language question about this
// business. Every answer here is a plain, self-contained sentence or two — no marketing
// fluff, no "click here to find out" — because that's what gets quoted verbatim. Content
// is sourced only from what's already true elsewhere on the site (PolicyPage.jsx,
// Checkout.jsx, About.jsx, Contact.jsx) — nothing here is invented for SEO purposes.
// The FAQPage JSON-LD below must stay in sync with the visible Q&A text — a mismatch
// between what's shown and what's marked up reads as manipulative to both AI crawlers
// and Google, and defeats the purpose.
const FAQS = [
  {
    q: "What is Subwikha's Hub?",
    a: "Subwikha's Hub is a handmade gift business based in Coimbatore, Tamil Nadu, India, founded in 2024. It makes and sells handcrafted gifts including chocolate bouquets, resin art (keychains, coasters, photo pieces), personalized photo frames, pipe cleaner flower bouquets, fridge magnets, and colour-changing night lights, all made to order.",
  },
  {
    q: 'Does Subwikha\'s Hub ship across India?',
    a: 'Yes. Subwikha\'s Hub delivers across India. Orders above ₹500 get free shipping; orders below ₹500 have an ₹80 shipping fee. Exact delivery time depends on your location and comes in addition to the handmade processing time for your specific product.',
  },
  {
    q: 'How long does it take to make and deliver an order?',
    a: 'Since every item is handmade to order, processing time depends on the product: 2–4 business days for pipe cleaner keychains, metal keychains, and night lights; 3–5 business days for chocolate bouquets, flower pots, fridge magnets, and resin keychains; and 5–7 business days for custom photo frames, resin photo keychains, and resin photo coasters, since those involve custom photo printing or casting. Delivery time is added on top of processing time. During festive or peak gifting periods, processing may take 1–2 extra days.',
  },
  {
    q: 'What payment methods does Subwikha\'s Hub accept?',
    a: 'Subwikha\'s Hub accepts UPI, credit/debit cards, net banking, and wallets, all processed securely through Razorpay, which is PCI-DSS compliant. Cash on Delivery (COD) is not offered — all orders must be paid in full at checkout, and an order is confirmed only after successful payment.',
  },
  {
    q: 'Can I return or exchange an item?',
    a: 'No — because every item is custom-made by hand for that specific order, Subwikha\'s Hub does not accept returns or exchanges on customized products such as photo keychains, personalized items, or custom bouquets. If an order arrives damaged or incorrect, contact them within 48 hours of delivery with photos for a replacement or refund.',
  },
  {
    q: 'Can I cancel my order after placing it?',
    a: 'Yes, but only within 12 hours of placing the order and only before production has started. Once crafting has begun, the order can no longer be cancelled. To cancel, message @subwikhahub on Instagram as soon as possible.',
  },
  {
    q: 'How long do refunds take?',
    a: 'Approved refunds (for damaged items or valid cancellations) are processed back to the original payment method within 5–7 business days.',
  },
  {
    q: 'How do I customize my order or send my photo?',
    a: 'For products that use a customer photo, you upload it directly during checkout. For other customizable items, you send your preferences (size, colour, chocolate choice, engraving text, etc.) via Instagram DM to @subwikhahub after ordering.',
  },
  {
    q: 'How can I track my order?',
    a: 'Use the Track Order page on the website with your Order ID and the phone number used at checkout. Tracking details are also shared via Instagram DM once an order is dispatched.',
  },
  {
    q: 'How can I contact Subwikha\'s Hub?',
    a: 'The fastest way is Instagram DM to @subwikhahub, or the contact form on the website. They reply within 24 hours, Monday to Saturday, 10am–7pm IST.',
  },
  {
    q: 'Can I build a custom gift hamper with multiple items?',
    a: 'Yes — the Build a Hamper tool lets you pick 2 to 4 handcrafted gifts and combines them into one hamper with an automatic 10% discount on the bundle.',
  },
  {
    q: 'Is my payment and personal information safe?',
    a: 'Yes. Payments are processed by Razorpay, which is PCI-DSS compliant, and Subwikha\'s Hub never stores card or payment details on its own servers. Customer information (name, email, phone, address) is collected only to fulfil the order and is never sold or shared for marketing purposes.',
  },
];

function ChevronIcon({ open }) {
  return <span className={`${styles.icon} ${open ? styles.iconOpen : ''}`}>+</span>;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className={`page-container ${styles.page}`}>
      <Helmet>
        <title>Frequently Asked Questions | Subwikha's Hub</title>
        <meta
          name="description"
          content="Answers to common questions about Subwikha's Hub: shipping times, payment methods, returns, cancellations, customization, and order tracking."
        />
        <link rel="canonical" href="https://subwikhahub.vercel.app/faq" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Frequently Asked Questions | Subwikha's Hub" />
        <meta property="og:description" content="Shipping, payment, returns, cancellations, customization and order tracking — answered." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/faq" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

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
