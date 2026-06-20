import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate, useMatch } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import styles from './Navbar.module.css';

function getWishlistCount() {
  try { return JSON.parse(localStorage.getItem('subwikha_wishlist') || '[]').length; }
  catch { return 0; }
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [wishlistCount, setWishlistCount] = useState(getWishlistCount);
  const { count, dispatch } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setQuery('');
  }, [location]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onStorage = () => setWishlistCount(getWishlistCount());
    window.addEventListener('storage', onStorage);
    // Also poll since localStorage events don't fire in same tab
    const interval = setInterval(() => setWishlistCount(getWishlistCount()), 500);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop' },
    { to: '/about', label: 'Our Story' },
    { to: '/contact', label: 'Contact' },
    { to: '/game', label: '✦ Play & Win', highlight: true },
  ];

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <img src="/logo.png" alt="Subwikha's Hub" className={styles.logoImg} />
        </Link>

        {/* Desktop Links */}
        <ul className={styles.links}>
          {navLinks.map(({ to, label, highlight }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `${styles.link} ${highlight ? styles.linkHighlight : ''} ${isActive ? styles.active : ''}`
                }
                end={to === '/'}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Search */}
          <div className={`${styles.searchWrap} ${searchOpen ? styles.searchOpen : ''}`}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search gifts..."
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchSubmit} aria-label="Search">
                <SearchIcon />
              </button>
            </form>
            <button
              className={styles.searchToggle}
              onClick={() => setSearchOpen(v => !v)}
              aria-label="Toggle search"
            >
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </button>
          </div>

          {/* Wishlist */}
          <Link to="/wishlist" className={styles.iconNavBtn} aria-label="Wishlist">
            <HeartIcon />
            {wishlistCount > 0 && <span className={styles.badge}>{wishlistCount}</span>}
          </Link>

          {/* Cart */}
          <button
            className={styles.cartBtn}
            onClick={() => dispatch({ type: 'TOGGLE_CART' })}
            aria-label="Open cart"
          >
            <CartIcon />
            {count > 0 && <span className={styles.badge}>{count}</span>}
          </button>

          {/* Burger */}
          <button
            className={`${styles.burger} ${menuOpen ? styles.open : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className={`${styles.mobileSearch} ${menuOpen ? styles.mobileSearchVisible : ''}`}>
        <form onSubmit={handleSearch} className={styles.mobileSearchForm}>
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search gifts, keychains, frames..."
            className={styles.mobileSearchInput}
          />
          {query && <button type="submit" className={styles.mobileSearchBtn}>Go</button>}
        </form>
      </div>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileOpen : ''}`}>
        {navLinks.map(({ to, label, highlight }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.mobileLink} ${highlight ? styles.mobileLinkHighlight : ''} ${isActive ? styles.active : ''}`
            }
            end={to === '/'}
          >
            {label}
          </NavLink>
        ))}
        <div className={styles.mobileDivider} />
        <div className={styles.mobileUsp}>
          <span>🎁 Free Shipping ₹500+</span>
          <span>✦ Handcrafted</span>
          <span>◆ Gift Packaging</span>
        </div>
      </div>
    </nav>
  );
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
