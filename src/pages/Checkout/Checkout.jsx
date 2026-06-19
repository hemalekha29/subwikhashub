import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';
import styles from './Checkout.module.css';

const EMAILJS_SERVICE_ID  = 'service_tq7y4u2';
const EMAILJS_TEMPLATE_ID = 'template_wd6f6bw';
const EMAILJS_PUBLIC_KEY  = 'kmmr3Ac8anXDDcvyn';

const RAZORPAY_KEY = 'rzp_live_T3PKJRpVYTxbOi';

function getGameDiscount() {
  try {
    const raw = localStorage.getItem('subwikha_discount');
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.used || Date.now() > d.expires) return null;
    return d.percent;
  } catch {
    return null;
  }
}

export default function Checkout() {
  const { items, total, dispatch } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
    giftMessage: '',
  });
  const [errors, setErrors] = useState({});

  const gameDiscount = getGameDiscount();
  const discountAmount = gameDiscount ? Math.floor(total * gameDiscount / 100) : 0;
  const shipping = (total - discountAmount) >= 500 ? 0 : 80;
  const grandTotal = total - discountAmount + shipping;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => ({ ...err, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone)) errs.phone = '10-digit phone required';
    if (!form.address.trim()) errs.address = 'Required';
    if (!form.city.trim()) errs.city = 'Required';
    if (!form.state.trim()) errs.state = 'Required';
    if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode)) errs.pincode = '6-digit pincode required';
    return errs;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the errors below');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    const options = {
      key: RAZORPAY_KEY,
      amount: grandTotal * 100, // in paise
      currency: 'INR',
      name: "Subwikha's Hub",
      description: `${items.length} Gift${items.length > 1 ? 's' : ''}: Where Memories Become Gifts`,
      image: '/logo.png',
      handler: async function (response) {
        const orderId = response.razorpay_order_id || `ORD${Date.now()}`;
        const paymentId = response.razorpay_payment_id;

        const orderData = {
          orderId,
          paymentId,
          customer: {
            name: `${form.firstName} ${form.lastName}`,
            email: form.email,
            phone: form.phone,
            address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
          },
          items: items.map(i => ({
            name: i.name,
            qty: i.qty,
            price: i.price,
            variant: i.variant || null,
          })),
          subtotal: total,
          discount: discountAmount,
          shipping,
          grandTotal,
          giftMessage: form.giftMessage || '',
          status: 'paid',
          createdAt: serverTimestamp(),
        };

        // Save to Firebase
        try {
          await addDoc(collection(db, 'orders'), orderData);
        } catch (err) {
          console.error('Firebase save failed:', err);
        }

        // Send email notification
        try {
          const itemsList = items.map(i => `${i.name}${i.variant ? ` (${i.variant})` : ''} × ${i.qty} = ₹${i.price * i.qty}`).join('\n');
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              name: 'Order Alert',
              email: 'enistechteam@gmail.com',
              subject: `New Order ${orderId}: ₹${grandTotal}`,
              message: `New order received!\n\nOrder ID: ${orderId}\nPayment ID: ${paymentId}\n\nCustomer: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\nPhone: ${form.phone}\nAddress: ${form.address}, ${form.city}, ${form.state} - ${form.pincode}\n\nItems:\n${itemsList}\n\nSubtotal: ₹${total}\nShipping: ₹${shipping}\nTotal: ₹${grandTotal}\n\nGift Message: ${form.giftMessage || 'None'}`,
            },
            EMAILJS_PUBLIC_KEY
          );
        } catch (err) {
          console.error('Email notification failed:', err);
        }

        if (gameDiscount) {
          const raw = localStorage.getItem('subwikha_discount');
          if (raw) {
            const d = JSON.parse(raw);
            localStorage.setItem('subwikha_discount', JSON.stringify({ ...d, used: true }));
          }
        }
        dispatch({ type: 'CLEAR_CART' });
        navigate('/order-success', {
          state: { paymentId, orderId, items, total: grandTotal, address: form },
        });
      },
      prefill: {
        name: `${form.firstName} ${form.lastName}`,
        email: form.email,
        contact: form.phone,
      },
      notes: {
        address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
        gift_message: form.giftMessage,
      },
      theme: {
        color: '#c9a84c',
        backdrop_color: '#0a0a0a',
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          toast('Payment cancelled', { icon: '⚠' });
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setLoading(false);
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch {
      setLoading(false);
      toast.error('Unable to open payment gateway. Please try again.');
    }
  };

  if (items.length === 0) {
    return (
      <div className={`page-container ${styles.empty}`}>
        <div className={styles.emptyContent}>
          <span className={styles.emptyIcon}>◇</span>
          <h2>Your cart is empty</h2>
          <p>Add some beautiful gifts before checking out</p>
          <Link to="/shop" className="btn-gold">Shop Gifts</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-container ${styles.checkout}`}>
      <div className={styles.header}>
        <span className="section-label">Secure Checkout</span>
        <h1 className={styles.title}>Complete Your Order</h1>
      </div>

      <div className={styles.inner}>
        {/* Form */}
        <form className={styles.form} onSubmit={handlePayment} noValidate>
          {/* Contact */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Contact Information</h3>
            <div className={styles.formGrid2}>
              <Field label="First Name" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} />
              <Field label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} error={errors.lastName} />
            </div>
            <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
            <Field label="Phone Number" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="10-digit mobile number" />
          </div>

          {/* Delivery */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Delivery Address</h3>
            <Field label="Street Address" name="address" value={form.address} onChange={handleChange} error={errors.address} />
            <div className={styles.formGrid2}>
              <Field label="City" name="city" value={form.city} onChange={handleChange} error={errors.city} />
              <Field label="State" name="state" value={form.state} onChange={handleChange} error={errors.state} />
            </div>
            <Field label="PIN Code" name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode} placeholder="6-digit PIN" />
          </div>

          {/* Gift Message */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Gift Message <span className={styles.optional}>(Optional)</span></h3>
            <div className={styles.fieldWrap}>
              <textarea
                name="giftMessage"
                className={styles.textarea}
                value={form.giftMessage}
                onChange={handleChange}
                placeholder="Write a heartfelt message for the recipient..."
                rows={3}
              />
            </div>
          </div>

          {/* Payment Notice */}
          <div className={styles.paymentNotice}>
            <div className={styles.paymentIcon}>🔒</div>
            <div>
              <p className={styles.paymentTitle}>Secure Payment via Razorpay</p>
              <p className={styles.paymentDesc}>
                Pay with UPI, Credit/Debit Card, Net Banking, or Wallet.
                Your payment information is encrypted and secure.
              </p>
            </div>
          </div>

          <button
            type="submit"
            className={`btn-gold ${styles.payBtn}`}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              `Pay ₹${grandTotal.toLocaleString('en-IN')} Securely`
            )}
          </button>

          <p className={styles.noCod}>
            ⚡ We accept online payments only: no Cash on Delivery
          </p>
        </form>

        {/* Order Summary */}
        <div className={styles.summary}>
          <h3 className={styles.summaryTitle}>Order Summary</h3>
          <ul className={styles.summaryItems}>
            {items.map(item => (
              <li key={item.id} className={styles.summaryItem}>
                <div className={styles.summaryImgWrap}>
                  <img src={item.images[0]} alt={item.name} className={styles.summaryImg} />
                  <span className={styles.summaryQtyBadge}>{item.qty}</span>
                </div>
                <div className={styles.summaryInfo}>
                  <p className={styles.summaryName}>{item.name}</p>
                  <p className={styles.summaryTagline}>{item.tagline}</p>
                </div>
                <p className={styles.summaryPrice}>₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
              </li>
            ))}
          </ul>

          <div className={styles.summaryTotals}>
            {gameDiscount && (
              <div className={styles.discountBanner}>
                🎮 Game discount ({gameDiscount}%) applied!
              </div>
            )}
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            {discountAmount > 0 && (
              <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                <span>Discount ({gameDiscount}% off)</span>
                <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className={styles.summaryRow}>
              <span>Shipping</span>
              <span>{shipping === 0 ? <span style={{ color: '#4ade80' }}>Free</span> : `₹${shipping}`}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>Total</span>
              <span className={styles.grandTotal}>₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className={styles.razorpayBadge}>
            <span>🔐 Secured by</span>
            <strong>Razorpay</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, error, placeholder }) {
  return (
    <div className={styles.fieldWrap}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        autoComplete="on"
      />
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
