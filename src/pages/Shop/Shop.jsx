import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { products, categories } from '../../data/products';
import ProductCard from '../../components/ProductCard/ProductCard';
import styles from './Shop.module.css';

const sortOptions = [
  { value: 'default', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(searchParams.get('cat') || 'all');
  const [sort, setSort] = useState('default');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat) setActiveCat(cat);
  }, [searchParams]);

  const handleCat = (cat) => {
    setActiveCat(cat);
    if (cat === 'all') searchParams.delete('cat');
    else searchParams.set('cat', cat);
    setSearchParams(searchParams);
  };

  let filtered = activeCat === 'all'
    ? products
    : activeCat === 'keychains'
      ? products.filter(p => ['resin', 'pipe', 'photo', 'metal'].includes(p.category))
      : products.filter(p => p.category === activeCat);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q)
    );
  }

  if (sort === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sort === 'rating') filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  return (
    <div className={`page-container ${styles.shop}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <span className="section-label">Our Collection</span>
          <h1 className={styles.title}>All Gifts</h1>
          <p className={styles.subtitle}>
            {filtered.length} thoughtfully curated pieces, each a memory waiting to be made
          </p>
        </div>
      </div>

      <div className={styles.inner}>
        {/* Filters Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <h4 className={styles.sideTitle}>Search</h4>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search gifts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.searchInput}
              />
              <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>

          <div className={styles.sideSection}>
            <h4 className={styles.sideTitle}>Category</h4>
            <ul className={styles.catList}>
              {categories.map(cat => (
                <li key={cat.id}>
                  <button
                    className={`${styles.catBtn} ${activeCat === cat.id ? styles.catActive : ''}`}
                    onClick={() => handleCat(cat.id)}
                  >
                    <span>{cat.label}</span>
                    <span className={styles.catCount}>
                      {cat.id === 'all' ? products.length : cat.id === 'keychains' ? products.filter(p => ['resin','pipe','photo','metal'].includes(p.category)).length : products.filter(p => p.category === cat.id).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.sideSection}>
            <h4 className={styles.sideTitle}>Sort By</h4>
            <ul className={styles.catList}>
              {sortOptions.map(opt => (
                <li key={opt.value}>
                  <button
                    className={`${styles.catBtn} ${sort === opt.value ? styles.catActive : ''}`}
                    onClick={() => setSort(opt.value)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Products Grid */}
        <main className={styles.main}>
          {filtered.length === 0 ? (
            <div className={styles.noResults}>
              <p>No gifts found for your search.</p>
              <button className="btn-outline" onClick={() => { setSearch(''); setActiveCat('all'); }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
