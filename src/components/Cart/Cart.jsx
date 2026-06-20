import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import styles from './Cart.module.css';

const FREE_SHIP = 500;

export default function Cart() {
  const { items, total, isOpen, dispatch } = useCart();
  const progress = Math.min((total / FREE_SHIP) * 100, 100);
  const remaining = FREE_SHIP - total;

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const close = () => dispatch({ type: 'CLOSE_CART' });

  return (
    <>
      <div className={`${styles.overlay} ${isOpen ? styles.visible : ''}`} onClick={close} />

      <aside className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BagIcon />
            <div>
              <h3 className={styles.title}>Gift Collection</h3>
              <span className={styles.subtitle}>{items.length} item{items.length !== 1 ? 's' : ''} selected</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={close} aria-label="Close cart">
            <CloseIcon />
          </button>
        </div>

        {/* Decorative line */}
        <div className={styles.goldenDivider}>
          <span />
          <span className={styles.diamondDot}>◆</span>
          <span />
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyGift}>
              <GiftIcon />
              <div className={styles.emptyRibbon} />
            </div>
            <p className={styles.emptyTitle}>Your collection is empty</p>
            <p className={styles.emptyDesc}>Discover handcrafted gifts made with love</p>
            <Link to="/shop" className={`btn-gold ${styles.exploreBtn}`} onClick={close}>
              Explore Gifts
            </Link>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className={styles.shipProgress}>
              {remaining > 0 ? (
                <p className={styles.shipText}>
                  Add <strong className={styles.shipAmt}>₹{remaining.toLocaleString('en-IN')}</strong> more for <span className={styles.shipFree}>FREE shipping</span>
                </p>
              ) : (
                <p className={styles.shipText}>
                  <span className={styles.shipCheck}>✓</span> You've unlocked <span className={styles.shipFree}>free shipping!</span>
                </p>
              )}
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }}>
                  <div className={styles.progressGlow} />
                </div>
              </div>
            </div>

            {/* Items */}
            <ul className={styles.items}>
              {items.map((item, idx) => (
                <li key={item.id} className={styles.item} style={{ animationDelay: `${idx * 0.06}s` }}>
                  <div className={styles.itemAccent} />
                  <div className={styles.imgWrap}>
                    <img src={item.images[0]} alt={item.name} className={styles.img} />
                    <span className={styles.qtyBadge}>{item.qty}</span>
                  </div>
                  <div className={styles.info}>
                    <p className={styles.name}>{item.name}</p>
                    {item.variant && <p className={styles.variant}>{item.variant}</p>}
                    <p className={styles.unitPrice}>₹{item.price.toLocaleString('en-IN')} each</p>
                    <div className={styles.bottomRow}>
                      <div className={styles.qtyPill}>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, qty: item.qty - 1 } })}
                        >−</button>
                        <span className={styles.qty}>{item.qty}</span>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => dispatch({ type: 'UPDATE_QTY', payload: { id: item.id, qty: item.qty + 1 } })}
                        >+</button>
                      </div>
                      <span className={styles.lineTotal}>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })}
                    aria-label="Remove item"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.totalCard}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Subtotal</span>
                  <span className={styles.totalAmt}>₹{total.toLocaleString('en-IN')}</span>
                </div>
                {remaining <= 0 && (
                  <div className={styles.freeShipTag}>
                    <span>🎁</span> Free shipping applied
                  </div>
                )}
              </div>

              <Link to="/checkout" className={`btn-gold ${styles.checkoutBtn}`} onClick={close}>
                <span>Proceed to Checkout</span>
                <ArrowIcon />
              </Link>

              <div className={styles.footerLinks}>
                <Link to="/shop" className={styles.continueLink} onClick={close}>
                  ← Continue Shopping
                </Link>
                <button className={styles.clearBtn} onClick={() => dispatch({ type: 'CLEAR_CART' })}>
                  Clear All
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/>
      <path d="M12 22V7"/>
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}
