import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import styles from './Cart.module.css';

export default function Cart() {
  const { items, total, isOpen, dispatch } = useCart();

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
        onClick={() => dispatch({ type: 'CLOSE_CART' })}
      />
      <aside className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Your Gifts <span className={styles.gold}>({items.length})</span></h3>
          <button className={styles.closeBtn} onClick={() => dispatch({ type: 'CLOSE_CART' })}>
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <GiftIcon />
            <p>Your cart is empty</p>
            <Link to="/shop" className="btn-outline" onClick={() => dispatch({ type: 'CLOSE_CART' })}>
              Explore Gifts
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.items}>
              {items.map(item => (
                <li key={item.id} className={styles.item}>
                  <img src={item.images[0]} alt={item.name} className={styles.img} />
                  <div className={styles.info}>
                    <p className={styles.name}>{item.name}</p>
                    <p className={styles.price}>₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
                    <div className={styles.qtyRow}>
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
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })}
                  >
                    <CloseIcon />
                  </button>
                </li>
              ))}
            </ul>

            <div className={styles.footer}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <span className={styles.totalAmt}>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <p className={styles.freeShip}>
                {total >= 999 ? '✓ Free shipping included' : `Add ₹${(999 - total).toLocaleString('en-IN')} for free shipping`}
              </p>
              <Link
                to="/checkout"
                className={`btn-gold ${styles.checkoutBtn}`}
                onClick={() => dispatch({ type: 'CLOSE_CART' })}
              >
                Proceed to Checkout
              </Link>
              <button
                className={styles.clearBtn}
                onClick={() => dispatch({ type: 'CLEAR_CART' })}
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M20 12v10H4V12" />
      <path d="M22 7H2v5h20V7z" />
      <path d="M12 22V7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}
