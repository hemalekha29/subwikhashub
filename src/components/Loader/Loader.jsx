import { useEffect, useState } from 'react';
import styles from './Loader.module.css';

export default function Loader({ onDone }) {
  const [phase, setPhase] = useState('in'); // in → hold → out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => setPhase('out'), 2000);
    const t3 = setTimeout(() => onDone(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

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
