import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import ReferralShare from '../../components/ReferralShare/ReferralShare';
import FeedbackForm from '../../components/Feedback/FeedbackForm';
import { ORDER_TYPE, formatDeliveryDate } from '../../lib/giftOrders';
import styles from './OrderSuccess.module.css';

function makeReferralCode(firstName) {
  const namePart = (firstName || 'GIFT').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'GIFT';
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SUBW-${namePart}-${rand}`;
}

export default function OrderSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [referralCode, setReferralCode] = useState(null);

  // The buyer is the person who placed the order. `address` is kept as the
  // fallback so an older checkout session still renders correctly.
  const buyer = useMemo(() => state?.buyer || {
    firstName: state?.address?.firstName,
    lastName: state?.address?.lastName,
    email: state?.address?.email,
    phone: state?.address?.phone,
  }, [state]);
  const isGift = state?.orderType === ORDER_TYPE.GIFT;
  const recipient = state?.recipient;
  const isSurprise = Boolean(state?.isSurpriseGift);
  const hideIdentity = Boolean(state?.hideSenderIdentity);

  useEffect(() => {
    if (!state) return;
    let code = localStorage.getItem('subwikha_my_referral_code');
    if (code) {
      setReferralCode(code);
      return;
    }
    code = makeReferralCode(buyer.firstName);
    addDoc(collection(db, 'referrals'), {
      code,
      ownerName: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim(),
      ownerEmail: buyer.email || '',
      uses: 0,
      createdAt: serverTimestamp(),
    })
      .then(() => {
        localStorage.setItem('subwikha_my_referral_code', code);
        setReferralCode(code);
      })
      .catch(() => {});
  }, [state, buyer]);

  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }
    // Confetti effect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -10,
      w: Math.random() * 8 + 4,
      h: Math.random() * 4 + 2,
      color: ['#c9a84c', '#e0c56a', '#ffffff', '#a07830'][Math.floor(Math.random() * 4)],
      speed: Math.random() * 3 + 1,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 5,
    }));

    let raf;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;
      particles.forEach(p => {
        if (p.y < canvas.height) {
          active = true;
          p.y += p.speed;
          p.angle += p.spin;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.angle * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });
      if (active) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div className={`page-container ${styles.success}`}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.content}>
        <div className={styles.checkCircle}>
          <svg viewBox="0 0 50 50" fill="none">
            <circle cx="25" cy="25" r="24" stroke="var(--gold)" strokeWidth="1.5" />
            <path d="M15 25l8 8 12-16" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <img src="/logo.png" alt="Subwikha's Hub" className={styles.logo} />
        <h1 className={styles.title}>{isGift ? 'Your Gift is Confirmed! 🎁' : 'Order Confirmed!'}</h1>
        <p className={styles.subtitle}>
          {isGift ? (
            <>
              Your surprise is being prepared with love.<br />
              Thank you for gifting with <span className={styles.gold}>Subwikha's Hub</span>.
            </>
          ) : (
            <>
              Your memory is on its way.<br />
              Thank you for shopping with <span className={styles.gold}>Subwikha's Hub</span>.
            </>
          )}
        </p>

        {isGift && (
          <div className={styles.giftBanner}>
            <span className={styles.giftBannerIcon} aria-hidden="true">💝</span>
            <div className={styles.giftBannerText}>
              <strong>Gift Order</strong>
              <span>
                {isSurprise
                  ? (hideIdentity
                    ? 'Your name is hidden — the recipient will only see the gift and your message.'
                    : 'Your name will be included with the gift.')
                  : 'Your name will be included with the gift.'}
              </span>
            </div>
          </div>
        )}

        <div className={styles.orderCard}>
          <div className={styles.orderRow}>
            <span>Payment ID</span>
            <span className={styles.orderValue}>{state.paymentId || 'N/A'}</span>
          </div>
          <div className={styles.orderRow}>
            <span>Order ID</span>
            <span className={styles.orderValue}>{state.orderId}</span>
          </div>
          <div className={styles.orderRow}>
            <span>Amount Paid</span>
            <span className={styles.orderAmount}>₹{state.total?.toLocaleString('en-IN')}</span>
          </div>
          <div className={styles.orderRow}>
            <span>{isGift ? 'Delivering To' : 'Deliver To'}</span>
            <span className={styles.orderValue}>
              {isGift
                ? `${recipient?.name || 'The recipient'}${recipient?.city ? `, ${recipient.city}` : ''}`
                : `${state.address?.firstName} ${state.address?.lastName}, ${state.address?.city}`}
            </span>
          </div>
          {isGift && state.preferredDeliveryDate && (
            <div className={styles.orderRow}>
              <span>Preferred Delivery</span>
              <span className={styles.orderValue}>{formatDeliveryDate(state.preferredDeliveryDate)}</span>
            </div>
          )}
        </div>

        {isGift && state.giftMessage?.trim() && (
          <div className={styles.giftNote}>
            <span className={styles.giftNoteLabel}>Your Gift Message</span>
            <p className={styles.giftNoteText}>{state.giftMessage}</p>
          </div>
        )}

        {state.items?.length > 0 && (
          <div className={styles.itemsList}>
            <h4 className={styles.itemsTitle}>Items Ordered</h4>
            {state.items.map(item => (
              <div key={item.id} className={styles.orderItem}>
                <img src={item.images[0]} alt={item.name} className={styles.itemImg} />
                <div>
                  <p className={styles.itemName}>{item.name}</p>
                  <p className={styles.itemQty}>Qty: {item.qty}</p>
                </div>
                <p className={styles.itemPrice}>₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        <p className={styles.emailNote}>
          {buyer.email && state.buyerEmailEnabled
            ? <>A confirmation email has been sent to <strong>{buyer.email}</strong></>
            : <>We have your order and will keep you updated on WhatsApp at <strong>{buyer.phone}</strong></>}
        </p>

        {/* The universal feedback form — the order id is attached automatically. */}
        <div className={styles.feedbackBlock}>
          <h3 className={styles.feedbackTitle}>How did we do?</h3>
          <p className={styles.feedbackHint}>
            Your order is in good hands — but we'd love to hear what you think 💌
          </p>
          <FeedbackForm
            compact
            sourcePage="order-success"
            orderId={state.orderId}
            title="Tell us about your experience"
          />
        </div>

        {referralCode && <ReferralShare code={referralCode} />}

        <div className={styles.actions}>
          <Link to="/shop" className="btn-gold">Continue Shopping</Link>
          <Link to="/" className="btn-outline">Back to Home</Link>
        </div>
        <p style={{ marginTop: 16 }}>
          <Link to="/track-order" style={{ fontSize: '0.82rem', opacity: 0.7 }}>Track this order →</Link>
        </p>
      </div>
    </div>
  );
}
