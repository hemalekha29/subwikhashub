import { useEffect, useState } from 'react';
import { products } from '../../data/products';
import styles from './HeroShowcase.module.css';

// Curated real product photos — one striking shot per category — cycled as a
// slow Ken Burns crossfade so it reads like a video reel without needing actual footage.
const SLIDE_IDS = [8, 15, 19, 16, 17, 10, 7, 20];
const SLIDE_DURATION = 5000;

function buildSlides() {
  return SLIDE_IDS
    .map(id => products.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({ src: p.images[0], name: p.name }));
}

export default function HeroShowcase() {
  const [slides] = useState(buildSlides);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setActive(a => (a + 1) % slides.length), SLIDE_DURATION);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div className={styles.showcase} aria-hidden="true">
      {slides.map((s, i) => (
        <div
          key={s.src}
          className={`${styles.slide} ${i === active ? styles.slideActive : ''}`}
          style={{ backgroundImage: `url(${s.src})` }}
        />
      ))}
    </div>
  );
}
