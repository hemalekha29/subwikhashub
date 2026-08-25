import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { occasions } from '../../data/products';
import { useAllProducts } from '../../hooks/useAllProducts';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './GiftFinder.module.css';

const BUDGETS = [
  { label: 'Under ₹100', icon: '🪙', min: 0, max: 100 },
  { label: '₹100 – ₹300', icon: '💰', min: 100, max: 300 },
  { label: '₹300 – ₹500', icon: '💎', min: 300, max: 500 },
  { label: '₹500+', icon: '👑', min: 500, max: Infinity },
];

const CATEGORY_GROUPS = [
  { label: 'Any Style', icon: '✦', cats: null },
  { label: 'Keychains', icon: '🔑', cats: ['resin', 'pipe', 'photo', 'metal'] },
  { label: 'Photo Frames', icon: '🖼️', cats: ['frames'] },
  { label: 'Bouquets & Pots', icon: '💐', cats: ['bouquets', 'pots'] },
  { label: 'Night Lights', icon: '🌙', cats: ['lighting'] },
];

const OCCASION_ICONS = {
  'Birthday': '🎂',
  'Anniversary': '💍',
  "Valentine's Day": '💝',
  'Wedding': '👰',
  'Rakhi': '🎗️',
  'Housewarming': '🏠',
  'Friendship Day': '🤝',
  'Just Because': '✨',
};

const STEPS = ['Occasion', 'Budget', 'Style'];

function StepProgress({ step }) {
  return (
    <div className={styles.stepProgress}>
      {STEPS.map((label, i) => (
        <div key={label} className={styles.stepProgressItem}>
          <div className={styles.stepProgressNodeWrap}>
            <span className={`${styles.stepProgressNode} ${i <= step ? styles.stepProgressNodeDone : ''} ${i === step ? styles.stepProgressNodeActive : ''}`}>
              {i < step ? '✓' : i + 1}
            </span>
            {i < STEPS.length - 1 && <span className={`${styles.stepProgressLine} ${i < step ? styles.stepProgressLineDone : ''}`} />}
          </div>
          <span className={`${styles.stepProgressLabel} ${i === step ? styles.stepProgressLabelActive : ''}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ChipRow({ options, value, onSelect, getLabel = o => o, getIcon }) {
  return (
    <div className={styles.chipRow}>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => onSelect(opt)}
          className={`${styles.chip} ${value === opt ? styles.chipActive : ''}`}
        >
          {getIcon && <span className={styles.chipIcon}>{getIcon(opt)}</span>}
          <span>{getLabel(opt)}</span>
        </button>
      ))}
    </div>
  );
}

export default function GiftFinder() {
  const products = useAllProducts();
  const [step, setStep] = useState(0);
  const [occasion, setOccasion] = useState(null);
  const [budget, setBudget] = useState(null);
  const [categoryGroup, setCategoryGroup] = useState(null);

  const restart = () => {
    setStep(0);
    setOccasion(null);
    setBudget(null);
    setCategoryGroup(null);
  };

  // Some products (like the Chocolate Bouquet) have multiple price tiers via
  // priceVariants — match the budget against any tier, not just the base price.
  const productPrices = (p) => p.priceVariants?.length ? p.priceVariants.map(v => v.price) : [p.price];

  const results = (() => {
    if (!budget) return [];
    let list = products.filter(p => productPrices(p).some(price => price >= budget.min && price <= budget.max));
    if (occasion) list = list.filter(p => p.occasion?.includes(occasion));
    if (categoryGroup?.cats) list = list.filter(p => categoryGroup.cats.includes(p.category));
    return list.slice(0, 6);
  })();

  return (
    <div className={`page-container ${styles.page}`}>
      <Helmet>
        <title>Gift Finder | Subwikha's Hub</title>
        <meta name="description" content="Not sure what to gift? Answer 3 quick questions and we'll recommend the perfect handcrafted gift for the occasion and budget." />
        <link rel="canonical" href="https://subwikhahub.vercel.app/gift-finder" />
        <meta property="og:title" content="Gift Finder | Subwikha's Hub" />
        <meta property="og:description" content="Not sure what to gift? Answer 3 quick questions and we'll recommend the perfect handcrafted gift for the occasion and budget." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/gift-finder" />
      </Helmet>

      <div className={styles.header}>
        <span className="section-label">Not Sure What to Gift?</span>
        <h1 className={styles.title}>Gift Finder</h1>
        <p className={styles.subtitle}>Answer 3 quick questions and we'll find the perfect gift for you</p>
      </div>

      {step < 3 && <StepProgress step={step} />}

      {step === 0 && (
        <div className={styles.stepWrap}>
          <h3 className={styles.stepTitle}>What's the occasion?</h3>
          <ChipRow
            options={occasions}
            value={occasion}
            getIcon={o => OCCASION_ICONS[o] || '🎁'}
            onSelect={o => { setOccasion(o); setStep(1); }}
          />
        </div>
      )}

      {step === 1 && (
        <div className={styles.stepWrap}>
          <h3 className={styles.stepTitle}>What's your budget?</h3>
          <ChipRow
            options={BUDGETS}
            value={budget}
            getLabel={b => b.label}
            getIcon={b => b.icon}
            onSelect={b => { setBudget(b); setStep(2); }}
          />
          <button onClick={() => setStep(0)} className={styles.backBtn}>← Back</button>
        </div>
      )}

      {step === 2 && (
        <div className={styles.stepWrap}>
          <h3 className={styles.stepTitle}>Any style preference?</h3>
          <ChipRow
            options={CATEGORY_GROUPS}
            value={categoryGroup}
            getLabel={c => c.label}
            getIcon={c => c.icon}
            onSelect={c => { setCategoryGroup(c); setStep(3); }}
          />
          <button onClick={() => setStep(1)} className={styles.backBtn}>← Back</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className={styles.resultsIntro}>
            <p className={styles.resultsText}>
              {results.length > 0
                ? `Here's what we recommend for ${occasion}:`
                : "We couldn't find an exact match — here's our closest picks, or try different answers:"}
            </p>
            <button onClick={restart} className={`btn-outline ${styles.retakeBtn}`}>Retake Quiz</button>
          </div>

          {results.length > 0 ? (
            <div className={styles.resultsGrid}>
              {results.map(p => <ProductCard key={p.slug} product={p} />)}
            </div>
          ) : (
            <div className={styles.noResults}>
              <Link to="/shop" className="btn-gold">Browse All Gifts</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
