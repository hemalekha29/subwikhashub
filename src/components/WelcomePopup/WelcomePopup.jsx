import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SEEN_KEY = 'subwikha_seen_welcome';
const WELCOME_PERCENT = 5;
const WELCOME_VALID_MS = 7 * 24 * 60 * 60 * 1000;
// Read by PlayNudge so the same "play for a discount" pitch doesn't
// immediately repeat as a banner right after this popup is dismissed.
export const PROMO_SEEN_KEY = 'subwikha_promo_seen_at';

export default function WelcomePopup() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY)) return;
    // Give first-time visitors a moment to see the hero before interrupting
    // with a full-screen popup, instead of ambushing them at 1.8s.
    const timer = setTimeout(() => {
      // Don't ambush someone who's mid-tap on the hamburger menu, and don't show a
      // full-screen backdrop on top of an already-open mobile menu.
      if (document.body.dataset.mobileMenuOpen === '1') return;
      setVisible(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // If the mobile menu opens while this is already showing (or about to show), get out
  // of the way instead of visually stacking on top of it / blocking the burger button —
  // see the matching event dispatch in Navbar.jsx.
  useEffect(() => {
    const onMobileMenu = (e) => {
      document.body.dataset.mobileMenuOpen = e.detail.open ? '1' : '0';
      if (e.detail.open) setVisible(false);
    };
    window.addEventListener('subwikha:mobilemenu', onMobileMenu);
    return () => window.removeEventListener('subwikha:mobilemenu', onMobileMenu);
  }, []);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1');
    sessionStorage.setItem(PROMO_SEEN_KEY, String(Date.now()));
    setVisible(false);
  };

  const claimDiscount = () => {
    localStorage.setItem(
      'subwikha_welcome_discount',
      JSON.stringify({ percent: WELCOME_PERCENT, expires: Date.now() + WELCOME_VALID_MS, used: false })
    );
    dismiss();
  };

  const playInstead = () => {
    dismiss();
    navigate('/game');
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={dismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--black-card)', border: '1px solid rgba(201,168,76,0.35)',
          borderRadius: 12, padding: '36px 32px', maxWidth: 420, width: '100%',
          textAlign: 'center', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', color: 'var(--white)', fontSize: '1.1rem', opacity: 0.6, cursor: 'pointer' }}
        >✕</button>

        <span style={{ fontSize: '2.2rem' }}>🎁</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: '10px 0 8px', color: 'var(--white)' }}>
          Welcome to Subwikha's Hub!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
          Get <strong style={{ color: 'var(--gold)' }}>{WELCOME_PERCENT}% off</strong> your first order automatically,
          or play our mini-game for a chance at up to <strong style={{ color: 'var(--gold)' }}>10% off</strong> instead.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-gold" onClick={claimDiscount}>Claim {WELCOME_PERCENT}% Off Now</button>
          <button className="btn-outline" onClick={playInstead}>Play &amp; Win up to 10% →</button>
        </div>
      </div>
    </div>
  );
}
