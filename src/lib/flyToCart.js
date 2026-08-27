// "Fly to cart": clones the product image, flies it from wherever Add-to-Cart
// was clicked to the navbar cart icon, then bumps the icon on arrival. Purely a
// visual flourish — the actual cart dispatch happens independently of this, so
// if anything here fails/no-ops the add-to-cart action itself is unaffected.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {Object} opts
 * @param {HTMLElement} opts.sourceEl - the element to fly from (button or image)
 * @param {string} [opts.imageSrc] - product image; falls back to a plain gold dot if omitted
 */
export function flyToCart({ sourceEl, imageSrc }) {
  if (!sourceEl || prefersReducedMotion()) return;

  const target = document.querySelector('[data-cart-icon]');
  if (!target) return;

  const start = sourceEl.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  if (!start.width || !end.width) return;

  const startCenter = { x: start.left + start.width / 2, y: start.top + start.height / 2 };
  const endCenter = { x: end.left + end.width / 2, y: end.top + end.height / 2 };
  const dx = endCenter.x - startCenter.x;
  const dy = endCenter.y - startCenter.y;

  // Wrapper carries the arc/scale/fade motion; the ring is a separate child so its
  // glow doesn't get clipped/scaled oddly by the image's own border-radius.
  const size = 72;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  Object.assign(wrapper.style, {
    position: 'fixed',
    left: `${startCenter.x - size / 2}px`,
    top: `${startCenter.y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: 9999,
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  });

  const ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'absolute',
    inset: '-6px',
    borderRadius: '16px',
    border: '2px solid var(--gold-light)',
    boxShadow: '0 0 0 4px rgba(201,168,76,0.25), 0 12px 32px rgba(0,0,0,0.55)',
  });
  wrapper.appendChild(ring);

  const flyer = document.createElement(imageSrc ? 'img' : 'div');
  if (imageSrc) {
    flyer.src = imageSrc;
    flyer.alt = '';
  }
  Object.assign(flyer.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    objectFit: 'cover',
    background: imageSrc ? 'transparent' : 'var(--gold)',
  });
  wrapper.appendChild(flyer);
  document.body.appendChild(wrapper);

  // A launch "pop" (scale up before the arc starts) makes the takeoff itself register,
  // full opacity is held until the very end, and the duration is long enough (900ms)
  // to actually be seen rather than blink past in a third of a second.
  const anim = wrapper.animate(
    [
      { transform: 'translate(0, 0) scale(0.9) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: 'translate(0, -6px) scale(1.15) rotate(-4deg)', opacity: 1, offset: 0.14 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 130}px) scale(0.85) rotate(10deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx * 0.88}px, ${dy * 0.88 - 20}px) scale(0.4) rotate(20deg)`, opacity: 1, offset: 0.88 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.1) rotate(25deg)`, opacity: 0.3, offset: 1 },
    ],
    { duration: 900, easing: 'cubic-bezier(0.25, 0.05, 0.35, 1)' }
  );

  anim.onfinish = () => {
    wrapper.remove();
    target.classList.remove('cart-bump');
    void target.offsetWidth; // force reflow so the class can be re-added if triggered again quickly
    target.classList.add('cart-bump');
    target.addEventListener('animationend', () => target.classList.remove('cart-bump'), { once: true });
  };
}
