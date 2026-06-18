import { useState } from 'react';
import toast from 'react-hot-toast';
import styles from './ShareStrip.module.css';

export default function ShareStrip({ product }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const url = `${window.location.origin}/product/${product.id}`;
  const text = `🎁 Check out this gift from Subwikha's Hub!\n\n${product.name} — ₹${product.price}\n`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank');
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title: `${product.name} — Subwikha's Hub`, text: product.tagline, url });
    } else {
      copyLink();
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.trigger} ${open ? styles.triggerActive : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Share this product"
      >
        <ShareIcon />
        <span>{open ? 'Close' : 'Share this gift'}</span>
        <div className={`${styles.arrow} ${open ? styles.arrowUp : ''}`}>›</div>
      </button>

      <div className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        <button className={styles.option} onClick={copyLink}>
          <span className={styles.optionIcon}>
            {copied ? <CheckIcon /> : <LinkIcon />}
          </span>
          <span className={styles.optionLabel}>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>

        <div className={styles.divider} />

        <button className={styles.option} onClick={shareWhatsApp}>
          <span className={styles.optionIcon}><WhatsAppIcon /></span>
          <span className={styles.optionLabel}>WhatsApp</span>
        </button>

        <div className={styles.divider} />

        <button className={styles.option} onClick={shareNative}>
          <span className={styles.optionIcon}><UploadIcon /></span>
          <span className={styles.optionLabel}>More</span>
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.985-1.418A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.946 7.946 0 01-4.073-1.117l-.292-.173-3.018.859.858-2.943-.19-.302A7.948 7.948 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}
