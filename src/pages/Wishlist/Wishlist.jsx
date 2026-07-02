import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { products } from '../../data/products';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../hooks/useWishlist';
import toast from 'react-hot-toast';
import styles from './Wishlist.module.css';

export default function Wishlist() {
  const { ids, toggle } = useWishlist();
  const { dispatch } = useCart();

  const wishlistProducts = products.filter(p => ids.includes(p.id));

  const remove = (product) => {
    toggle(product);
    toast('Removed from wishlist', { style: { background: 'var(--black-card)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.2)', fontSize: '0.82rem' } });
  };

  const addToCart = (product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
    toast.success(`${product.name} added to cart`, { style: { background: 'var(--black-card)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', fontSize: '0.82rem' } });
  };

  const addAllToCart = () => {
    wishlistProducts.forEach(p => dispatch({ type: 'ADD_ITEM', payload: p }));
    toast.success(`${wishlistProducts.length} gifts added to cart!`, { style: { background: 'var(--black-card)', color: 'var(--white)', border: '1px solid rgba(201,168,76,0.3)', fontSize: '0.82rem' } });
  };

  return (
    <div className={`page-container ${styles.page}`}>
      <Helmet>
        <title>My Wishlist | Subwikha's Hub</title>
        <meta name="description" content="View your saved gifts on Subwikha's Hub. Add them to your cart and get them delivered beautifully wrapped to your door." />
        <link rel="canonical" href="https://subwikhahub.vercel.app/wishlist" />
        <meta property="og:title" content="My Wishlist | Subwikha's Hub" />
        <meta property="og:description" content="View your saved gifts and add them to cart — handcrafted with love, delivered beautifully." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/wishlist" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className={styles.header}>
        <span className="section-label">Saved for Later</span>
        <h1 className={styles.title}>My Wishlist</h1>
        {wishlistProducts.length > 0 && (
          <p className={styles.count}>{wishlistProducts.length} gift{wishlistProducts.length !== 1 ? 's' : ''} saved</p>
        )}
      </div>

      {wishlistProducts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyHeart}>
            <HeartIcon />
          </div>
          <h3 className={styles.emptyTitle}>Your wishlist is empty</h3>
          <p className={styles.emptyDesc}>Save gifts you love and come back to them anytime</p>
          <Link to="/shop" className="btn-gold">Explore Gifts</Link>
        </div>
      ) : (
        <>
          {wishlistProducts.length > 1 && (
            <div className={styles.bulkBar}>
              <span className={styles.bulkText}>{wishlistProducts.length} items in your wishlist</span>
              <button className={`btn-gold ${styles.addAllBtn}`} onClick={addAllToCart}>
                Add All to Cart
              </button>
            </div>
          )}

          <div className={styles.grid}>
            {wishlistProducts.map(product => (
              <div key={product.id} className={styles.card}>
                <Link to={`/product/${product.slug}`} className={styles.imgWrap}>
                  <img src={product.images[0]} alt={product.name} loading="lazy" className={styles.img} />
                  {product.badge && <span className={styles.badge}>{product.badge}</span>}
                </Link>

                <div className={styles.info}>
                  <p className={styles.tagline}>{product.tagline}</p>
                  <Link to={`/product/${product.slug}`} className={styles.name}>{product.name}</Link>

                  <div className={styles.stars}>
                    <span>{'★'.repeat(Math.floor(product.rating))}</span>
                    <span className={styles.ratingNum}>{product.rating} ({product.reviews})</span>
                  </div>

                  <div className={styles.priceRow}>
                    <span className={styles.price}>₹{product.price.toLocaleString('en-IN')}</span>
                    {product.originalPrice && (
                      <span className={styles.origPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  <p className={styles.delivery}>📦 Delivery in {product.deliveryDays} business days</p>

                  <div className={styles.actions}>
                    <button className={styles.addBtn} onClick={() => addToCart(product)}>
                      Add to Cart
                    </button>
                    <button className={styles.removeBtn} onClick={() => remove(product)} aria-label="Remove from wishlist">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}
