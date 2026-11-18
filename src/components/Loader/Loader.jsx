import { useEffect, useRef, useState } from 'react';
import styles from './Loader.module.css';

// The splash is a welcome, not a waiting room: it stays up long enough to read
// as intentional, and no longer.
const MIN_VISIBLE_MS = 700;   // the shortest it is ever shown
const MAX_WAIT_MS = 2500;     // the longest it can ever block the site

export default function Loader({ onDone }) {
  const [phase, setPhase] = useState('in'); // in → hold → out
  // The callback is usually an inline arrow, which changes identity on every
  // render of the parent — keeping it in a ref stops the effect below from
  // restarting (and the splash from never finishing).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const startedAt = Date.now();
    let holdTimer = null;
    let doneTimer = null;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      // The bar fills as soon as the page is actually ready.
      setPhase('hold');
      // Never flash — but never make anyone wait for a page that is ready.
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      holdTimer = setTimeout(() => setPhase('out'), wait);
      doneTimer = setTimeout(() => onDoneRef.current?.(), wait + 600);
    };

    if (document.readyState === 'complete') {
      // The page is already loaded — open straight away.
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }

    // Safety net: if 'load' never fires (a blocked script, a stalled image),
    // the site still opens.
    const safety = setTimeout(finish, MAX_WAIT_MS);

    return () => {
      window.removeEventListener('load', finish);
      clearTimeout(safety);
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div className={`${styles.loader} ${phase === 'out' ? styles.exit : ''}`}>
      <div className={styles.bg} />
      <div className={`${styles.content} ${phase !== 'in' ? styles.contentVisible : ''}`}>
        <div className={styles.logoWrap}>
          <img src="/logo.png" alt="Subwikha's Hub" className={styles.logo} />
          <div className={styles.shimmer} />
        </div>
        <div className={styles.bar}>
          <div className={`${styles.barFill} ${phase === 'hold' || phase === 'out' ? styles.barFull : ''}`} />
        </div>
        <p className={styles.tagline}>Where Memories Become Gifts</p>
      </div>
    </div>
  );
}
