import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAllProducts } from '../../hooks/useAllProducts';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { trackEvent, toGaItem } from '../../lib/analytics';
import toast from 'react-hot-toast';
import { isValidEmail, isValidPhone } from '../../lib/validators';
import styles from './Checkout.module.css';

// Razorpay's checkout.js used to sit in index.html's <head> and load on every page —
// now it's only fetched here, the one page that actually needs it (see index.html for
// the rest of that change). Cached so re-opening the payment modal doesn't re-fetch it.
let razorpayScriptPromise = null;
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => { razorpayScriptPromise = null; reject(new Error('Failed to load Razorpay')); };
      document.head.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

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

function getWelcomeDiscount() {
  try {
    const raw = localStorage.getItem('subwikha_welcome_discount');
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.used || Date.now() > d.expires) return null;
    return d.percent;
  } catch {
    return null;
  }
}

function needsPhotoVariants(p) {
  return (p?.variants || []).some(v => /photo/i.test(v));
}

export default function Checkout() {
  const { items, total, dispatch } = useCart();
  const navigate = useNavigate();
  const allProducts = useAllProducts();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
    giftMessage: '',
  });
  const [errors, setErrors] = useState({});
  const [photoFiles, setPhotoFiles] = useState({});
  const fileInputRefs = useRef({});

  useEffect(() => {
    loadRazorpayScript().catch(() => {}); // start fetching early so it's ready by submit time
    if (items.length > 0) {
      trackEvent('begin_checkout', {
        currency: 'INR',
        value: total,
        items: items.map(i => toGaItem(i)),
      });
    }
  }, []);

  // Referral code (if any) came from a shared link and was stashed in localStorage by
  // ReferralCapture in App.jsx. We only echo it back to the server to validate — the
  // client never queries the `referrals` collection itself (that used to mean fetching
  // every referral/order in Firestore just to render one banner; see api/create-order.js
  // for where this is actually verified now).
  const refCode = localStorage.getItem('subwikha_referral');
  const myCode = localStorage.getItem('subwikha_my_referral_code');
  const hasReferral = Boolean(refCode && refCode !== myCode);

  const gameDiscount = getGameDiscount();
  const welcomeDiscount = getWelcomeDiscount();
  const usingWelcome = (welcomeDiscount || 0) > (gameDiscount || 0);
  const appliedDiscountPercent = usingWelcome ? welcomeDiscount : gameDiscount;
  const discountAmount = appliedDiscountPercent ? Math.floor(total * appliedDiscountPercent / 100) : 0;

  // These are *display estimates only*, computed from data already in the browser
  // (cart total, this device's own saved discount) so the order summary doesn't sit
  // blank while typing. The authoritative price, discount, and shipping fee are always
  // recomputed from trusted server-side data in api/create-order.js — nothing here is
  // trusted for the actual charge.
  const qualifiesByAmount = (total - discountAmount) >= 500;
  const freeShippingReason = qualifiesByAmount ? 'amount' : hasReferral ? 'referral' : null;
  const shipping = freeShippingReason ? 0 : 80;
  const grandTotal = total - discountAmount + shipping;

  // Flatten bundle components so each product needing a photo (custom or hamper) gets its own upload slot
  const photoItems = items.flatMap(item => {
    if (item.isBundle) {
      return item.components
        .map((c, idx) => {
          const full = allProducts.find(p => p.slug === c.slug || p.id === c.productId);
          if (!full || !needsPhotoVariants(full)) return null;
          return { id: `${item.id}__${idx}`, name: `${c.name} (from ${item.name})`, images: full.images };
        })
        .filter(Boolean);
    }
    return needsPhotoVariants(item) ? [{ id: item.id, name: item.name, images: item.images }] : [];
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => ({ ...err, [name]: '' }));
  };

  function handlePhotoChange(itemId, files) {
    const all = Array.from(files);
    const arr = all.filter(f => f.size <= 15 * 1024 * 1024).slice(0, 5);
    const oversized = all.filter(f => f.size > 15 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`${oversized.length > 1 ? `${oversized.length} photos are` : '1 photo is'} over 15 MB and won't be uploaded`);
    }
    setPhotoFiles(prev => ({ ...prev, [itemId]: [...(prev[itemId] || []), ...arr].slice(0, 5) }));
    setErrors(prev => ({ ...prev, [`photo_${itemId}`]: '' }));
  }

  function removePhoto(itemId, index) {
    setPhotoFiles(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((_, i) => i !== index),
    }));
  }

  async function uploadOrderPhotos(orderId) {
    const links = {};
    for (const item of photoItems) {
      const files = photoFiles[item.id] || [];
      if (!files.length) continue;
      const urls = [];
      for (const file of files) {
        urls.push(await uploadToCloudinary(file, `orders/${orderId}/${item.id}`));
      }
      links[item.name] = urls;
    }
    return links;
  }

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!isValidEmail(form.email)) errs.email = 'Valid email required';
    if (!isValidPhone(form.phone)) errs.phone = '10-digit phone required';
    if (!form.address.trim()) errs.address = 'Street address is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode)) errs.pincode = '6-digit pincode required';
    photoItems.forEach(item => {
      if (!photoFiles[item.id]?.length) {
        errs[`photo_${item.id}`] = `Please upload at least one photo for ${item.name}`;
      }
    });
    return errs;
  };

  // Builds the minimal, identifying-only payload for api/create-order.js — slugs and
  // quantities, never prices. The server looks up the real price for every item itself;
  // anything price-shaped sent from here is ignored server-side.
  function buildOrderItems() {
    return items.map(i =>
      i.isBundle
        ? { isBundle: true, qty: i.qty, components: i.components.map(c => ({ slug: c.slug, qty: c.qty })) }
        : { slug: i.slug, id: i.id, qty: i.qty, variant: i.variant || null, customization: i.customization || null }
    );
  }

  const handlePayment = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Surface each specific problem as its own toast (not just the small
      // inline text under a field) so it's obvious what to fix without hunting.
      const messages = [...new Set(Object.values(errs))];
      messages.slice(0, 4).forEach(msg => toast.error(msg));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    let created;
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: buildOrderItems(),
          phone: form.phone,
          referralCode: hasReferral ? refCode : null,
          discountPercent: appliedDiscountPercent || 0,
        }),
      });
      created = await res.json();
      if (!res.ok || !created.ok) {
        toast.error(created.error || 'Could not start payment. Please try again.');
        setLoading(false);
        return;
      }
    } catch {
      toast.error('Could not reach the server. Check your connection and try again.');
      setLoading(false);
      return;
    }

    try {
      await loadRazorpayScript(); // usually already loaded by now (kicked off on page mount)
    } catch {
      toast.error('Could not load the payment gateway. Please check your connection and try again.');
      setLoading(false);
      return;
    }

    const options = {
      key: created.keyId,
      amount: created.amount,
      currency: created.currency,
      order_id: created.razorpayOrderId,
      name: "Subwikha's Hub",
      description: `${items.length} Gift${items.length > 1 ? 's' : ''}: Where Memories Become Gifts`,
      image: '/logo.png',
      handler: async function (response) {
        // Photos are keyed by the server-issued Razorpay order id, so this is always
        // the same id verify-payment will look up — no more locally-guessed order ids.
        let photoLinks = {};
        if (photoItems.length > 0) {
          setUploading(true);
          try {
            photoLinks = await uploadOrderPhotos(response.razorpay_order_id);
          } catch (err) {
            console.error('Photo upload failed:', err);
          }
          setUploading(false);
        }

        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              customer: {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
                address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
              },
              giftMessage: form.giftMessage || '',
              photos: photoLinks,
            }),
          });
          const verified = await verifyRes.json();
          if (!verifyRes.ok || !verified.ok) {
            setLoading(false);
            toast.error(verified.error || 'We could not confirm your payment. Please contact us with your payment ID.');
            return;
          }

          if (usingWelcome) {
            const raw = localStorage.getItem('subwikha_welcome_discount');
            if (raw) {
              const d = JSON.parse(raw);
              localStorage.setItem('subwikha_welcome_discount', JSON.stringify({ ...d, used: true }));
            }
          } else if (gameDiscount) {
            const raw = localStorage.getItem('subwikha_discount');
            if (raw) {
              const d = JSON.parse(raw);
              localStorage.setItem('subwikha_discount', JSON.stringify({ ...d, used: true }));
            }
          }
          if (hasReferral) localStorage.removeItem('subwikha_referral');

          trackEvent('purchase', {
            transaction_id: verified.orderId,
            currency: 'INR',
            value: verified.grandTotal,
            items: items.map(i => toGaItem(i)),
          });

          dispatch({ type: 'CLEAR_CART' });
          navigate('/order-success', {
            state: {
              paymentId: verified.paymentId,
              orderId: verified.orderId,
              items,
              total: verified.grandTotal,
              address: form,
            },
          });
        } catch {
          setLoading(false);
          toast.error('Payment succeeded but we could not confirm your order. Please contact us with your payment ID.');
        }
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
      theme: { color: '#c9a84c', backdrop_color: '#0a0a0a' },
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
      {uploading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.85)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
        }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(201,168,76,0.3)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'rotate 0.8s linear infinite' }} />
          <p style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.1em' }}>Uploading your photos...</p>
        </div>
      )}

      <div className={styles.header}>
        <span className="section-label">Secure Checkout</span>
        <h1 className={styles.title}>Complete Your Order</h1>
        <p className={styles.codNotice}>⚡ We accept online payments only: no Cash on Delivery</p>
      </div>

      <div className={styles.inner}>
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

          {/* Photo Upload — only if cart has photo products */}
          {photoItems.length > 0 && (
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                Upload Your Photos
                <span className={styles.optional}> — Required for custom items</span>
              </h3>
              {photoItems.map(item => {
                const files = photoFiles[item.id] || [];
                const err = errors[`photo_${item.id}`];
                return (
                  <div key={item.id} className={styles.photoUploadItem}>
                    <p className={styles.photoProductName}>📎 {item.name}</p>

                    {files.length === 0 ? (
                      <label
                        className={`${styles.photoDropZone} ${err ? styles.photoDropZoneError : ''}`}
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                      >
                        <span className={styles.photoDropIcon}>🖼️</span>
                        <span className={styles.photoDropText}>Click to upload photos</span>
                        <span className={styles.photoDropHint}>High resolution JPG / PNG · Max 15 MB each · Up to 5 photos</span>
                      </label>
                    ) : (
                      <>
                        {/* Thumbnails row */}
                        <div className={styles.photoThumbs}>
                          {files.map((f, i) => (
                            <div key={i} className={styles.photoThumbWrap}>
                              <img src={URL.createObjectURL(f)} className={styles.photoThumb} alt="" />
                              <button
                                type="button"
                                className={styles.photoThumbRemove}
                                onClick={() => removePhoto(item.id, i)}
                              >✕</button>
                            </div>
                          ))}
                          {files.length < 5 && (
                            <button
                              type="button"
                              className={styles.photoAddMore}
                              onClick={() => fileInputRefs.current[item.id]?.click()}
                              title="Add more photos"
                            >+</button>
                          )}
                          <span className={styles.photoCount}>{files.length} / 5 photo{files.length > 1 ? 's' : ''}</span>
                        </div>

                        {/* Side-by-side preview */}
                        <div className={styles.photoPreviewCard}>
                          <span className={styles.photoPreviewLabel}>Preview</span>
                          <div className={styles.photoPreviewInner}>
                            <div className={styles.photoPreviewSide}>
                              <img src={item.images[0]} alt={item.name} className={styles.photoPreviewImg} />
                              <span className={styles.photoPreviewCaption}>Your Product</span>
                            </div>
                            <div className={styles.photoPreviewPlus}>✦</div>
                            <div className={styles.photoPreviewSide}>
                              <img src={URL.createObjectURL(files[0])} alt="Your photo" className={styles.photoPreviewImg} />
                              <span className={styles.photoPreviewCaption}>Your Photo</span>
                            </div>
                          </div>
                          <p className={styles.photoPreviewNote}>
                            We will personalise your {item.name.toLowerCase()} with this photo. Make sure it is clear and high resolution.
                          </p>
                        </div>
                      </>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      aria-label={`Upload photos for ${item.name}`}
                      style={{ display: 'none' }}
                      ref={el => fileInputRefs.current[item.id] = el}
                      onChange={e => handlePhotoChange(item.id, e.target.files)}
                    />
                    {err && <span className={styles.photoErrorMsg}>{err}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Gift Message */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle} id="giftMessageLabel">Gift Message <span className={styles.optional}>(Optional)</span></h3>
            <div className={styles.fieldWrap}>
              <textarea
                name="giftMessage"
                id="giftMessage"
                aria-labelledby="giftMessageLabel"
                className={styles.textarea}
                value={form.giftMessage}
                onChange={handleChange}
                placeholder="Write a heartfelt message for the recipient..."
                rows={3}
                maxLength={1000}
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
            disabled={loading || uploading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              `Pay ₹${grandTotal.toLocaleString('en-IN')} Securely`
            )}
          </button>
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
                  {item.isBundle ? (
                    <p className={styles.summaryTagline}>{item.components.map(c => c.name).join(', ')}</p>
                  ) : (
                    <p className={styles.summaryTagline}>{item.tagline}</p>
                  )}
                  {item.customization && Object.keys(item.customization).length > 0 && (
                    <p className={styles.summaryTagline} style={{ color: 'var(--gold)' }}>
                      {Object.entries(item.customization).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                </div>
                <p className={styles.summaryPrice}>₹{(item.price * item.qty).toLocaleString('en-IN')}</p>
              </li>
            ))}
          </ul>

          <div className={styles.summaryTotals}>
            {appliedDiscountPercent > 0 && (
              <div className={styles.discountBanner}>
                {usingWelcome
                  ? `🎉 Welcome discount: ${appliedDiscountPercent}% off applied (your best available offer)`
                  : `🎮 Game discount: ${appliedDiscountPercent}% off applied (your best available offer)`}
                {usingWelcome && gameDiscount > 0 && (
                  <><br /><span style={{ opacity: 0.75 }}>Your {gameDiscount}% game discount is saved for a future order.</span></>
                )}
                {!usingWelcome && welcomeDiscount > 0 && (
                  <><br /><span style={{ opacity: 0.75 }}>Your {welcomeDiscount}% welcome discount is saved for a future order.</span></>
                )}
              </div>
            )}
            {freeShippingReason === 'referral' && (
              <div className={styles.discountBanner}>🤝 Referral perk: Free shipping applied!</div>
            )}
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            {discountAmount > 0 && (
              <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                <span>Discount ({appliedDiscountPercent}% off)</span>
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
            <p className={styles.optional} style={{ marginTop: 8 }}>
              Final total (including any loyalty or referral shipping perks) is confirmed at payment.
            </p>
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
      <label className={styles.label} htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        autoComplete="on"
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <span id={`${name}-error`} className={styles.errorMsg}>{error}</span>}
    </div>
  );
}
