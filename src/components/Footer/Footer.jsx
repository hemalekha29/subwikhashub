import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.glow} />
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="Subwikha's Hub" className={styles.logo} />
          <p className={styles.tagline}>Where Memories Become Gifts</p>
          <p className={styles.desc}>
            Crafting extraordinary gift experiences that transform precious moments into timeless keepsakes.
          </p>
          <div className={styles.socials}>
            <a href="https://www.instagram.com/subwikhahub" target="_blank" rel="noopener noreferrer" className={styles.social} aria-label="Instagram">
              <InstagramIcon />
            </a>
          </div>
        </div>

        <div className={styles.col}>
          <h5 className={styles.colTitle}>Quick Links</h5>
          <ul className={styles.list}>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/shop">Shop All</Link></li>
            <li><Link to="/about">Our Story</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/track-order">Track Order</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h5 className={styles.colTitle}>Categories</h5>
          <ul className={styles.list}>
            <li><Link to="/shop?cat=bouquets">Bouquets</Link></li>
            <li><Link to="/shop?cat=frames">Photo Frames</Link></li>
            <li><Link to="/shop?cat=magnets">Fridge Magnets</Link></li>
            <li><Link to="/shop?cat=lighting">Night Lights</Link></li>
            <li><Link to="/shop?cat=pots">Flower Pots</Link></li>
            <li><Link to="/shop?cat=metal">Metal Keychains</Link></li>
            <li><Link to="/shop?cat=resin">Resin Keychains</Link></li>
            <li><Link to="/shop?cat=photo">Photo Keychains</Link></li>
            <li><Link to="/shop?cat=pipe">Pipe Cleaner Keychains</Link></li>
          </ul>
        </div>

        <div className={styles.col}>
          <h5 className={styles.colTitle}>Policies</h5>
          <ul className={styles.list}>
            <li><Link to="/shipping">Shipping Info</Link></li>
            <li><Link to="/returns">Returns & Exchange</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.divider} />
        <div className={styles.bottomRow}>
          <p>© {new Date().getFullYear()} Subwikha's Hub. All rights reserved.</p>
          <div className={styles.payments}>
            <span>Secured by</span>
            <span className={styles.razorpay}>Razorpay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
