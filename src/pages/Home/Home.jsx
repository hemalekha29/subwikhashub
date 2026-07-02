import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { products, testimonials } from '../../data/products';
import ProductCard from '../../components/ProductCard/ProductCard';
import UgcGallery from '../../components/UgcGallery/UgcGallery';
import InstagramFeed from '../../components/InstagramFeed/InstagramFeed';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import styles from './Home.module.css';

function RevealSection({ children, className = '', delay = 0 }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const heroBgRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [sparkles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
      delay: Math.random() * 6,
      duration: Math.random() * 4 + 3,
    }))
  );

  useEffect(() => {
    const onScroll = () => {
      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
      }
    };

    const onMouseMove = (e) => {
      mouseRef.current = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 };
      if (heroBgRef.current) {
        heroBgRef.current.style.transform += ` translate(${mouseRef.current.x * -20}px, ${mouseRef.current.y * -20}px)`;
      }
    };

    window.addEventListener('scroll', onScroll);

    const interval = setInterval(() => {
      setActiveTestimonial(v => (v + 1) % testimonials.length);
    }, 5000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(interval);
    };
  }, []);

  const featured = products.slice(0, 4);

  return (
    <div className={styles.home}>
      <Helmet>
        <title>Subwikha's Hub | Handcrafted Gifts in Coimbatore, Tamil Nadu</title>
        <meta name="description" content="Subwikha's Hub – Handcrafted gifts in Coimbatore, Tamil Nadu. Custom chocolate bouquets, resin art, personalized photo frames, keychains &amp; memory keepsakes. Free shipping across India." />
        <meta name="keywords" content="personalized gifts Coimbatore, custom gifts Tamil Nadu, handmade gifts Coimbatore, birthday gifts boyfriend, anniversary gifts, resin keychain Coimbatore, chocolate bouquet Coimbatore, photo frame Tamil Nadu, gift shop Coimbatore, customized gifts India" />
        <link rel="canonical" href="https://subwikhahub.vercel.app" />
        <meta property="og:title" content="Subwikha's Hub | Handcrafted Gifts in Coimbatore" />
        <meta property="og:description" content="Handcrafted gifts from Coimbatore — chocolate bouquets, resin art, personalized keepsakes &amp; more. Free shipping across India." />
        <meta property="og:url" content="https://subwikhahub.vercel.app" />
      </Helmet>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div ref={heroBgRef} className={styles.heroBg} />
        <div className={styles.heroBgOverlay} />

        {/* Sparkles */}
        {sparkles.map(s => (
          <span key={s.id} className={styles.sparkle} style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }} />
        ))}

        {/* Floating Rings */}
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        <div className={styles.ring3} />

        <div className={styles.heroContent}>
            <span className={styles.heroLabel}>✦ Est. 2024 · Handcrafted Gifting ✦</span>

          <h1 className={styles.heroTitle}>
            <span className={styles.heroLine1}>Where Every Memory</span>
            <em className={styles.heroLine2}>Becomes a Gift</em>
          </h1>

          <p className={styles.heroSub}>
            Handcrafted with love: chocolate bouquets, resin art,<br />
            and keepsakes that make moments last forever.
          </p>

          <div className={styles.heroBtns}>
            <Link to="/shop" className={`btn-gold ${styles.heroBtn}`}>
              Explore Gifts
            </Link>
            <Link to="/about" className={`btn-outline ${styles.heroBtn}`}>
              Our Story
            </Link>
          </div>

          <div className={styles.heroStats}>
            {[
              { num: '50+', label: 'Happy Orders' },
              { num: '100%', label: 'Handcrafted' },
              { num: '2024', label: 'Est.' },
            ].map(({ num, label }, i) => (
              <div key={i} className={styles.statGroup}>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{num}</span>
                  <span className={styles.statLabel}>{label}</span>
                </div>
                {i < 2 && <div className={styles.statDivider} />}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.scrollHint}>
          <div className={styles.scrollMouse}>
            <div className={styles.scrollDot} />
          </div>
          <span>Scroll</span>
        </div>
      </section>

      {/* ── GOLD MARQUEE ── */}
      <div className={styles.marqueeWrap}>
        <div className={styles.marquee}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>
              Chocolate Bouquets &nbsp;✦&nbsp; Resin Art &nbsp;✦&nbsp;
              Personalized Gifts &nbsp;✦&nbsp; Memory Boxes &nbsp;✦&nbsp;
              Handmade Keepsakes &nbsp;✦&nbsp; Custom Designs &nbsp;✦&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <section className={styles.section}>
        <RevealSection>
          <div className={styles.sectionHead}>
            <span className="section-label">Gift by Occasion</span>
            <h2 className={styles.sectionTitle}>Find the Perfect Gift</h2>
            <div className="divider" />
          </div>
        </RevealSection>

        <div className={styles.catGrid}>
          {[
            { label: 'Bouquets', emoji: '💐', img: '/images/bouquet-1.webp', cat: 'bouquets' },
            { label: 'Photo Frames', emoji: '🖼️', img: '/images/frame-1.webp', cat: 'frames' },
            { label: 'Night Lights', emoji: '🌙', img: '/images/lamp-4.webp', cat: 'lighting' },
            { label: 'Keychains', emoji: '✨', img: '/images/resin-photo-1.webp', cat: 'keychains' },
          ].map(({ label, emoji, img, cat }, i) => (
            <RevealSection key={label} delay={i * 80}>
              <Link to={`/shop?cat=${cat}`} className={styles.catCard}>
                <img src={img} alt={label} className={styles.catImg} />
                <div className={styles.catOverlay} />
                <div className={styles.catLabel}>
                  <span className={styles.catEmoji}>{emoji}</span>
                  <span className={styles.catName}>{label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </Link>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className={styles.section}>
        <RevealSection>
          <div className={styles.sectionHead}>
            <span className="section-label">Hand-Picked for You</span>
            <h2 className={styles.sectionTitle}>Featured Gifts</h2>
            <div className="divider" />
          </div>
        </RevealSection>

        <div className={styles.productGrid}>
          {featured.map((p, i) => (
            <RevealSection key={p.id} delay={i * 100}>
              <ProductCard product={p} />
            </RevealSection>
          ))}
        </div>

        <RevealSection>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/shop" className="btn-outline">View All Gifts</Link>
          </div>
        </RevealSection>
      </section>

      {/* ── USP STRIP ── */}
      <div className={styles.uspStrip}>
        {[
          { icon: '✦', title: 'Handmade with Love', desc: 'Every gift crafted by hand, with care in every detail' },
          { icon: '◈', title: 'Fully Personalized', desc: 'Custom names, messages & designs just for you' },
          { icon: '◇', title: 'Free Shipping ₹500+', desc: 'Free delivery on all orders above ₹500' },
          { icon: '◆', title: 'Luxury Packaging', desc: 'Every order arrives beautifully wrapped' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className={styles.usp}>
            <span className={styles.uspIcon}>{icon}</span>
            <div>
              <h4 className={styles.uspTitle}>{title}</h4>
              <p className={styles.uspDesc}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TESTIMONIALS ── */}
      <section className={styles.section}>
        <RevealSection>
          <div className={styles.sectionHead}>
            <span className="section-label">Real Stories</span>
            <h2 className={styles.sectionTitle}>What Our Gifters Say</h2>
            <div className="divider" />
          </div>
        </RevealSection>

        <div className={styles.testimonialWrap}>
          {testimonials.map((t, i) => (
            <div key={t.id} className={`${styles.testimonial} ${i === activeTestimonial ? styles.testimonialActive : ''}`}>
              <div className={styles.quoteIcon}>"</div>
              <p className={styles.testimonialText}>{t.text}</p>
              <div className={styles.stars}>{'★'.repeat(t.rating)}</div>
              <div className={styles.testimonialMeta}>
                {t.photo && (
                  <img
                    src={t.photo}
                    alt={t.name}
                    className={styles.testimonialAvatar}
                    onClick={() => setLightboxImg(t.photo)}
                    title="Click to view"
                  />
                )}
                <div>
                  <span className={styles.testimonialName}>{t.name}</span>
                  <span className={styles.testimonialGift}>{t.gift}</span>
                </div>
              </div>
            </div>
          ))}
          <div className={styles.testimonialDots}>
            {testimonials.map((_, i) => (
              <button key={i} className={`${styles.dot} ${i === activeTestimonial ? styles.dotActive : ''}`} onClick={() => setActiveTestimonial(i)} />
            ))}
          </div>
        </div>
      </section>

      <UgcGallery />
      <InstagramFeed />

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaGlow} />
        <div className={styles.ctaOrb1} />
        <div className={styles.ctaOrb2} />
        <RevealSection>
          <div className={styles.ctaContent}>
            <img src="/logo.png" alt="Subwikha's Hub" className={styles.ctaLogo} />
            <h2 className={styles.ctaTitle}>Ready to Create a Memory?</h2>
            <p className={styles.ctaText}>Every gift tells a story. Let us help you tell yours: beautifully.</p>
            <Link to="/shop" className="btn-gold">Shop Now</Link>
          </div>
        </RevealSection>
      </section>

      {/* Lightbox */}
      {lightboxImg && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxImg(null)}>
          <div className={styles.lightboxBox} onClick={e => e.stopPropagation()}>
            <img src={lightboxImg} alt="Customer review" className={styles.lightboxImg} />
            <button className={styles.lightboxClose} onClick={() => setLightboxImg(null)}>✕</button>
          </div>
        </div>
      )}

    </div>
  );
}
