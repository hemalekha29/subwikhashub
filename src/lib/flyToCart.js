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

  const size = 46;
  const flyer = document.createElement(imageSrc ? 'img' : 'div');
  if (imageSrc) {
    flyer.src = imageSrc;
    flyer.alt = '';
  }
  flyer.setAttribute('aria-hidden', 'true');
  Object.assign(flyer.style, {
    position: 'fixed',
    left: `${startCenter.x - size / 2}px`,
    top: `${startCenter.y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '10px',
    objectFit: 'cover',
    background: imageSrc ? 'transparent' : 'var(--gold)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    zIndex: 9999,
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(flyer);

  const anim = flyer.animate(
    [
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(0.75) rotate(15deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.15) rotate(25deg)`, opacity: 0.4, offset: 1 },
    ],
    { duration: 700, easing: 'cubic-bezier(0.3, 0.05, 0.4, 1)' }
  );

  anim.onfinish = () => {
    flyer.remove();
    target.classList.remove('cart-bump');
    void target.offsetWidth; // force reflow so the class can be re-added if triggered again quickly
    target.classList.add('cart-bump');
    target.addEventListener('animationend', () => target.classList.remove('cart-bump'), { once: true });
  };
}
