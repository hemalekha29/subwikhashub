import Seo from '../../components/Seo/Seo';
import { policies } from '../../data/policyContent';
import { staticHeads } from '../../lib/seo';
import styles from './PolicyPage.module.css';

// Policy copy lives in src/data/policyContent.jsx and the <head> in src/lib/seo.js, so the
// SPA page and the prerendered static HTML (scripts/prerender.mjs) read from the same place.
function Policy({ k }) {
  const pol = policies[k];
  return (
    <div className={`page-container ${styles.page}`}>
      <Seo head={staticHeads[k]()} />
      <div className={styles.header}>
        <span className="section-label">{pol.label}</span>
        <h1 className={styles.title}>{pol.title}</h1>
        <div className="divider" />
      </div>
      <div className={styles.body}>
        {pol.sections.map((s) => (
          <div key={s.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{s.title}</h2>
            {s.body}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ShippingPage = () => <Policy k="shipping" />;
export const ReturnsPage = () => <Policy k="returns" />;
export const PrivacyPage = () => <Policy k="privacy" />;
export const TermsPage = () => <Policy k="terms" />;
