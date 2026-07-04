import { Link } from 'react-router-dom';
import { PROMO_SEEN_KEY } from '../WelcomePopup/WelcomePopup';

function hasActiveGameDiscount() {
  try {
    const raw = localStorage.getItem('subwikha_discount');
    if (!raw) return false;
    const d = JSON.parse(raw);
    return !d.used && Date.now() < d.expires;
  } catch {
    return false;
  }
}

// Don't repeat the same "play for a discount" pitch as a banner right after
// the visitor already saw and dismissed the Welcome popup with that same offer.
function justSawWelcomePromo() {
  const seenAt = Number(sessionStorage.getItem(PROMO_SEEN_KEY));
  return seenAt && Date.now() - seenAt < 60000;
}

export default function PlayNudge() {
  if (hasActiveGameDiscount() || justSawWelcomePromo()) return null;

  return (
    <Link
      to="/game"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.05))',
        border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8,
        padding: '12px 18px', margin: '0 0 24px', fontSize: '0.85rem',
        color: 'var(--white)', textDecoration: 'none',
      }}
    >
      <span>🎮</span>
      <span>You haven't played today — win up to <strong style={{ color: 'var(--gold)' }}>10% off</strong> in 30 seconds</span>
      <span style={{ color: 'var(--gold)' }}>Play Now →</span>
    </Link>
  );
}
