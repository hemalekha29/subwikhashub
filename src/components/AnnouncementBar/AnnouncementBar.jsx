import { useState, useEffect } from 'react';
import styles from './AnnouncementBar.module.css';

const MESSAGES = [
  { icon: '🎁', text: 'Free Shipping on orders above ₹500' },
  { icon: '✦', text: '100% Handcrafted with Love · Every piece made to order' },
  { icon: '🎮', text: 'Play & Win up to 10% OFF · Visit the Game Zone' },
  { icon: '◆', text: 'Luxury Gift Packaging · Every order arrives beautifully wrapped' },
];

export default function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % MESSAGES.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const msg = MESSAGES[idx];

  return (
    <div className={styles.bar}>
      <div className={styles.track}>
        <p className={`${styles.msg} ${fade ? styles.msgVisible : styles.msgHidden}`}>
          <span className={styles.icon}>{msg.icon}</span>
          {msg.text}
        </p>
      </div>
      <div className={styles.dots}>
        {MESSAGES.map((_, i) => (
          <button key={i} className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`} onClick={() => { setIdx(i); setFade(true); }} />
        ))}
      </div>
    </div>
  );
}
