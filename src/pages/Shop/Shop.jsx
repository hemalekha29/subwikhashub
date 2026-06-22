import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { categories } from '../../data/products';
import { useAllProducts } from '../../hooks/useAllProducts';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './Shop.module.css';

const SORT_OPTIONS = [
  { value: 'default', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under ₹100', min: 0, max: 100 },
  { label: '₹100–₹299', min: 100, max: 299 },
  { label: '₹300–₹499', min: 300, max: 499 },
  { label: '₹500+', min: 500, max: Infinity },
];

export default function Shop() {
  const products = useAllProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(searchParams.get('cat') || 'all');
  const [sort, setSort] = useState('default');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [priceRange, setPriceRange] = useState(0);
  const [gridCols, setGridCols] = useState(3);
  const catBarRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const cat = searchParams.get('cat');
    const q = searchParams.get('q');
    if (cat) setActiveCat(cat);
    if (q) setSearch(q);
  }, [searchParams]);

  const handleCat = (cat) => {
    setActiveCat(cat);
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') next.delete('cat');
    else next.set('cat', cat);
    setSearchParams(next);
  };

  const clearAll = () => {
    setActiveCat('all');
    setSearch('');
    setPriceRange(0);
    setSort('default');
    setSearchParams({});
  };

  let filtered = activeCat === 'all'
    ? products
    : activeCat === 'keychains'
      ? products.filter(p => ['resin','pipe','photo','metal'].includes(p.category))
      : products.filter(p => p.category === activeCat);

  if (search) {
    const q = search.toLowerCase();
    // category keyword aliases so "keychain" / "bouquet" etc. still match
    const catAliases = {
      keychain: ['resin', 'pipe', 'photo', 'metal'],
      keychains: ['resin', 'pipe', 'photo', 'metal'],
      bouquet: ['bouquets'],
      bouquets: ['bouquets'],
      frame: ['frames'],
      frames: ['frames'],
      light: ['lighting'],
      lamp: ['lighting'],
      pot: ['pots'],
      magnet: ['magnets'],
      resin: ['resin'],
      pipe: ['pipe'],
    };
    const matchedCats = Object.entries(catAliases)
      .filter(([kw]) => q.includes(kw))
      .flatMap(([, cats]) => cats);

    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      matchedCats.includes(p.category)
    );
  }

  const range = PRICE_RANGES[priceRange];
  if (priceRange > 0) {
    filtered = filtered.filter(p => p.price >= range.min && p.price <= range.max);
  }

  if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sort === 'rating') filtered = [...filtered].sort((a, b) => b.rating - a.rating);
  else if (sort === 'newest') filtered = [...filtered].sort((a, b) => {
    const aT = a.createdAt ? (a.createdAt.toDate?.() ?? new Date(a.createdAt)).getTime() : (a.id || 0) * 1000;
    const bT = b.createdAt ? (b.createdAt.toDate?.() ?? new Date(b.createdAt)).getTime() : (b.id || 0) * 1000;
    return bT - aT;
  });

  const hasFilters = activeCat !== 'all' || search || priceRange > 0 || sort !== 'default';

  return (
    <div className={styles.shop}>
      <Helmet>
        <title>Shop Handcrafted Gifts | Subwikha's Hub</title>
        <meta name="description" content="Shop handcrafted gifts from Coimbatore — custom resin keychains, chocolate bouquets, personalized photo frames, night lights &amp; pipe cleaner flowers. Free shipping above ₹500 across India." />
        <meta name="keywords" content="handcrafted gifts Coimbatore, resin keychain Tamil Nadu, chocolate bouquet Coimbatore, photo frame Coimbatore, custom gifts India, personalized gifts, birthday gifts boyfriend, anniversary gifts Tamil Nadu, gift shop Coimbatore, customized resin keychains Coimbatore" />
        <link rel="canonical" href="https://subwikhahub.vercel.app/shop" />
        <meta property="og:title" content="Shop Handcrafted Gifts | Subwikha's Hub" />
        <meta property="og:description" content="Explore premium handcrafted gifts made with love — keychains, bouquets, frames & more." />
        <meta property="og:url" content="https://subwikhahub.vercel.app/shop" />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
      </Helmet>

      {/* Page Hero */}
      <div className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className="section-label">Our Collection</span>
          <h1 className={styles.heroTitle}>Handcrafted Gifts</h1>
          <p className={styles.heroSub}>Every piece made with love — for the moments that matter most</p>

          {/* Hero Search */}
          <div className={styles.heroSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search keychains, frames, bouquets..."
              className={styles.heroSearchInput}
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterBarInner}>
          {/* Category chips */}
          <div className={styles.catChips} ref={catBarRef}>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`${styles.chip} ${activeCat === cat.id ? styles.chipActive : ''}`}
                onClick={() => handleCat(cat.id)}
              >
                {cat.label}
                <span className={styles.chipCount}>
                  {cat.id === 'all' ? products.length
                    : cat.id === 'keychains' ? products.filter(p => ['resin','pipe','photo','metal'].includes(p.category)).length
                    : products.filter(p => p.category === cat.id).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarInner}>
          <div className={styles.toolbarLeft}>
            <span className={styles.resultCount}>
              <strong>{filtered.length}</strong> gift{filtered.length !== 1 ? 's' : ''} found
              {search && <span className={styles.queryTag}>for "<em>{search}</em>"</span>}
            </span>
            {hasFilters && (
              <button className={styles.clearAllBtn} onClick={clearAll}>
                ✕ Clear filters
              </button>
            )}
          </div>

          <div className={styles.toolbarRight}>
            {/* Price filter */}
            <select
              className={styles.filterSelect}
              value={priceRange}
              onChange={e => setPriceRange(Number(e.target.value))}
            >
              {PRICE_RANGES.map((r, i) => (
                <option key={i} value={i}>{r.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              className={styles.filterSelect}
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Grid toggle */}
            <div className={styles.gridToggle}>
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  className={`${styles.gridBtn} ${gridCols === n ? styles.gridBtnActive : ''}`}
                  onClick={() => setGridCols(n)}
                  aria-label={`${n} columns`}
                >
                  {n === 2 ? <Grid2Icon /> : n === 3 ? <Grid3Icon /> : <Grid4Icon />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className={styles.main}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>◇</span>
            <h3>No gifts found</h3>
            <p>Try adjusting your search or filters</p>
            <button className="btn-gold" onClick={clearAll}>View All Gifts</button>
          </div>
        ) : (
          <div className={styles.grid} style={{ '--cols': gridCols }}>
            {filtered.map(p => <ProductCard key={p.slug} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Grid2Icon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/><rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/></svg>;
}
function Grid3Icon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="4" height="7" rx="1"/><rect x="6" y="0" width="4" height="7" rx="1"/><rect x="12" y="0" width="4" height="7" rx="1"/><rect x="0" y="9" width="4" height="7" rx="1"/><rect x="6" y="9" width="4" height="7" rx="1"/><rect x="12" y="9" width="4" height="7" rx="1"/></svg>;
}
function Grid4Icon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="3" height="7" rx="1"/><rect x="4.3" y="0" width="3" height="7" rx="1"/><rect x="8.7" y="0" width="3" height="7" rx="1"/><rect x="13" y="0" width="3" height="7" rx="1"/><rect x="0" y="9" width="3" height="7" rx="1"/><rect x="4.3" y="9" width="3" height="7" rx="1"/><rect x="8.7" y="9" width="3" height="7" rx="1"/><rect x="13" y="9" width="3" height="7" rx="1"/></svg>;
}
