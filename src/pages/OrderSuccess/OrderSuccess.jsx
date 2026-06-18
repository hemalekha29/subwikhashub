import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './OrderSuccess.module.css';

export default function OrderSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

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
        <h1 className={styles.title}>Order Confirmed!</h1>
        <p className={styles.subtitle}>
          Your memory is on its way.<br />
          Thank you for gifting with <span className={styles.gold}>Subwikha's Hub</span>.
        </p>

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
            <span>Deliver To</span>
            <span className={styles.orderValue}>
              {state.address?.firstName} {state.address?.lastName}, {state.address?.city}
            </span>
          </div>
        </div>

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
          A confirmation email has been sent to <strong>{state.address?.email}</strong>
        </p>

        <div className={styles.actions}>
          <Link to="/shop" className="btn-gold">Continue Shopping</Link>
          <Link to="/" className="btn-outline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
