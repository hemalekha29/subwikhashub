import { useEffect, useRef } from 'react';
import styles from './Cursor.module.css';

/**
 * The custom cursor.
 *
 * Performance notes — this effect runs on EVERY page, so it has to be quiet:
 *
 *  • It only runs on devices with a real pointer. On a phone the cursor is
 *    hidden by the CSS anyway, so there is no reason to keep a rAF loop alive.
 *  • The animation loop stops when the pointer has been still for a moment
 *    (the ring has caught up by then, so there is nothing left to draw) and
 *    starts again on the next move.
 *  • It stops completely while the tab is in the background, so a hidden tab
 *    never burns battery.
 *
 * The transform is written straight to the DOM — the component never
 * re-renders while the pointer moves.
 */
export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // No mouse, no cursor — and definitely no animation loop.
    if (!window.matchMedia?.('(pointer: fine)').matches) return undefined;

    let raf = 0;
    let idleTimer = 0;
    let running = false;

    const animate = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.12;
      ring.current.y += (pos.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      }
      // Close enough — stop until the pointer moves again.
      const settled =
        Math.abs(pos.current.x - ring.current.x) < 0.1 &&
        Math.abs(pos.current.y - ring.current.y) < 0.1;
      if (settled) {
        running = false;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(animate);
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(animate);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
      start();
      // The loop ends by itself once the ring catches up; this is the safety
      // net for the case where it never quite settles.
      clearTimeout(idleTimer);
      idleTimer = setTimeout(stop, 1500);
    };

    const onEnter = () => ringRef.current?.classList.add(styles.hover);
    const onLeave = () => ringRef.current?.classList.remove(styles.hover);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    const interactives = document.querySelectorAll('a, button, [data-cursor]');
    interactives.forEach(el => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(idleTimer);
      stop();
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className={styles.dot} />
      <div ref={ringRef} className={styles.ring} />
    </>
  );
}
