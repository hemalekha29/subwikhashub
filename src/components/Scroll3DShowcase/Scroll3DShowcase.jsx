import { useEffect, useRef, useState } from 'react';
import styles from './Scroll3DShowcase.module.css';

// A real WebGL (Three.js) scroll-pinned scene: an abstract gift box — not a photo-real
// product render (the catalog has no 3D assets) — that opens and spins as the section
// scrolls past. Three.js itself is only dynamically imported once this section is about
// to enter the viewport, so it never adds weight to the initial Home bundle.

const MOBILE_BREAKPOINT = 640;

const TAGLINES = [
  'Handcrafted With Love',
  'Every Gift Tells a Story',
  'Free Shipping Above ₹500',
  '100% Made By Hand',
  'Wrapped With Care, Always',
];

// Picked once per mount — a different visitor (or a fresh page load) sees a different
// catchword or product photo emerge from the blast, rather than the same one every time.
function pickReveal(products) {
  if (products.length > 0 && Math.random() < 0.5) {
    const p = products[Math.floor(Math.random() * products.length)];
    if (p?.images?.[0]) return { type: 'product', image: p.images[0], name: p.name };
  }
  return { type: 'tagline', text: TAGLINES[Math.floor(Math.random() * TAGLINES.length)] };
}

export default function Scroll3DShowcase({ products = [] }) {
  const wrapRef = useRef(null);
  const mountRef = useRef(null);
  const [active, setActive] = useState(false);
  const [reveal] = useState(() => pickReveal(products));

  // Only start loading Three.js once the section is close to view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); io.disconnect(); } },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active || !mountRef.current || !wrapRef.current) return;
    let disposed = false;
    let cleanup = () => {};

    import('three').then((THREE) => {
      if (disposed) return;
      cleanup = mountScene(THREE, wrapRef.current, mountRef.current);
    });

    return () => { disposed = true; cleanup(); };
  }, [active]);

  return (
    <section className={styles.wrap} ref={wrapRef}>
      <div className={styles.pin}>
        <div className={styles.canvasHost} ref={mountRef} />
        <div className={styles.overlay}>
          <span className={styles.label}>✦ Every Gift, An Experience ✦</span>
          <h2 className={styles.title}>Unwrap Something Special</h2>
          <p className={styles.sub}>Scroll to see it come together — just like every order does, by hand.</p>
        </div>
        {/* Erupts from the blast at the end of the scroll — see applyProgress's
            blastPulse in mountScene, which drives this element's opacity/scale. */}
        <div className={styles.blastReveal} data-blast-reveal>
          {reveal.type === 'product' ? (
            <>
              <img src={reveal.image} alt="" className={styles.revealImg} />
              <span className={styles.revealName}>{reveal.name}</span>
            </>
          ) : (
            <span className={styles.revealText}>{reveal.text}</span>
          )}
        </div>
      </div>
    </section>
  );
}

function mountScene(THREE, wrapEl, mountEl) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const pinEl = mountEl.parentElement;
  const overlayEl = pinEl.querySelector(`.${styles.overlay}`);
  const revealEl = pinEl.querySelector('[data-blast-reveal]');

  const width = mountEl.clientWidth;
  const height = mountEl.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
  camera.position.set(0, 0.8, 10.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mountEl.appendChild(renderer.domElement);

  // ── Lighting — a near-white key (a fully gold-tinted light washed the pink material
  // toward brown/orange) plus a soft hemisphere fill so the box's true color reads,
  // with the gold accents carried by the ribbon/bow materials themselves instead. ──
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0x1a140e, 0.9));
  scene.add(new THREE.AmbientLight(0x3a3226, 0.6));
  const key = new THREE.DirectionalLight(0xfff1d6, 1.9);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // ── Gift box group ──
  const gift = new THREE.Group();
  gift.scale.setScalar(0.8);
  scene.add(gift);

  const baseMat = new THREE.MeshPhysicalMaterial({ color: 0xee87a2, roughness: 0.4, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.2), baseMat);
  base.position.y = -0.4;
  gift.add(base);

  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.35, -1.1); // hinge at back edge
  gift.add(lidGroup);
  const lidMat = new THREE.MeshPhysicalMaterial({ color: 0xf6a9bc, roughness: 0.3, metalness: 0.05, clearcoat: 0.7 });
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.32, 2.32), lidMat);
  lid.position.set(0, 0, 1.1);
  lidGroup.add(lid);

  const ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0xc9a84c, roughness: 0.2, metalness: 0.6, clearcoat: 0.8 });
  const ribbonV = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.7, 2.3), ribbonMat);
  ribbonV.position.y = -0.4;
  gift.add(ribbonV);
  const ribbonH = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 0.32), ribbonMat);
  ribbonH.position.y = -0.4;
  gift.add(ribbonH);

  const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), ribbonMat);
  bowKnot.position.set(0, 0.55, 0);
  lidGroup.add(bowKnot);
  const loopGeo = new THREE.TorusGeometry(0.32, 0.1, 16, 32);
  const loopL = new THREE.Mesh(loopGeo, ribbonMat);
  loopL.position.set(-0.32, 0.6, 0);
  loopL.rotation.set(Math.PI / 2, 0.5, 0);
  lidGroup.add(loopL);
  const loopR = new THREE.Mesh(loopGeo, ribbonMat);
  loopR.position.set(0.32, 0.6, 0);
  loopR.rotation.set(Math.PI / 2, -0.5, 0);
  lidGroup.add(loopR);

  // Warm glow inside the box, revealed once the lid opens
  const glow = new THREE.PointLight(0xffdf9e, 0, 4);
  glow.position.set(0, 0, 0);
  gift.add(glow);

  // ── Sparkle particles orbiting the gift ──
  const particleCount = isMobile ? 60 : 160;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 2.6 + Math.random() * 1.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0xe0c56a, size: 0.045, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ── Blast flash — a billboarded glow sprite that pulses bright at the finale.
  // MeshPhysicalMaterial surfaces don't "glow" on their own without post-processing
  // bloom, so this is what actually sells the blast regardless of camera framing. ──
  const flashTex = makeGlowTexture(THREE);
  const flashMat = new THREE.SpriteMaterial({ map: flashTex, color: 0xfff3d6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Sprite(flashMat);
  flash.position.set(0, 0.3, 0);
  flash.scale.setScalar(0.001);
  scene.add(flash);

  // ── Scroll-driven progress (0 → 1 across the pinned track) ──
  let progress = 0;
  const computeProgress = () => {
    const rect = wrapEl.getBoundingClientRect();
    const total = wrapEl.offsetHeight - window.innerHeight;
    progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
  };

  let scrollScheduled = false;
  const onScroll = () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => { computeProgress(); scrollScheduled = false; if (reduceMotion) render(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  computeProgress();

  const clock = new THREE.Clock();

  function applyProgress() {
    // Lid eases open gradually across most of the scroll range (not front-loaded)
    // so it reads as a deliberate reveal rather than snapping open early and then
    // just spinning for the rest of the section.
    const openAmount = Math.min(1, Math.max(0, (progress - 0.1) / 0.75));
    // The finale: over the last stretch of scroll the sparkles blast outward and
    // brighten, the lid gets blown further open, and the whole box gets a punchy
    // little scale-up — a payoff for scrolling all the way through, not just an
    // open box sitting there at the end.
    const blastAmount = Math.min(1, Math.max(0, (progress - 0.82) / 0.15));
    const blastEase = blastAmount * blastAmount * (3 - 2 * blastAmount); // smoothstep
    const blastPulse = Math.sin(blastAmount * Math.PI); // 0 → 1 → 0 across the blast window

    lidGroup.rotation.x = -openAmount * (Math.PI / 2.6) - blastEase * 0.7;
    lidGroup.position.y = 0.35 + blastEase * 1.1;
    glow.intensity = openAmount * 3.2 + blastEase * 7;
    gift.rotation.y = progress * Math.PI * 0.85;
    gift.scale.setScalar(0.8 + blastPulse * 0.1);
    camera.position.z = 10.5 - progress * 1.4;
    camera.position.y = 0.8 + progress * 0.3;
    particles.rotation.y = progress * 1.1;
    particles.scale.setScalar(1 + openAmount * 0.25 + blastEase * 7.5);
    particleMat.opacity = Math.min(1, 0.85 + blastPulse * 0.4);
    particleMat.size = 0.045 + blastEase * 0.09;
    flash.scale.setScalar(0.6 + blastEase * 7);
    flashMat.opacity = blastPulse * 0.9;

    const overlayFade = progress < 0.12 ? progress / 0.12 : progress > 0.85 ? Math.max(0, (1 - progress) / 0.15) : 1;
    if (overlayEl) overlayEl.style.opacity = String(overlayFade);

    // Rises with the blast (not a pulse like the flash — it has content to actually
    // read) and, unlike the flash, holds rather than fading back out once revealed.
    if (revealEl) {
      revealEl.style.opacity = String(blastEase);
      revealEl.style.transform = `translate(-50%, -50%) scale(${0.5 + blastEase * 0.6})`;
    }
  }

  function render() {
    applyProgress();
    renderer.render(scene, camera);
  }

  let rafId = null;
  function tick() {
    if (!reduceMotion) {
      gift.rotation.y += 0.0009; // slow idle drift on top of scroll rotation
      particles.rotation.y += clock.getDelta() * 0.02;
    }
    render();
    rafId = requestAnimationFrame(tick);
  }

  if (reduceMotion) {
    render();
  } else {
    tick();
  }

  const onResize = () => {
    const w = mountEl.clientWidth;
    const h = mountEl.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (reduceMotion) render();
  };
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (rafId) cancelAnimationFrame(rafId);
    renderer.dispose();
    particleGeo.dispose();
    particleMat.dispose();
    flashMat.dispose();
    flashTex.dispose();
    [baseMat, lidMat, ribbonMat].forEach(m => m.dispose());
    [base.geometry, lid.geometry, ribbonV.geometry, ribbonH.geometry, bowKnot.geometry, loopGeo].forEach(g => g.dispose());
    if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
  };
}

// A soft white→gold radial gradient, used as the blast flash sprite's texture.
function makeGlowTexture(THREE) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,230,180,0.8)');
  grad.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
