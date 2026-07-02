import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAllProducts } from '../../hooks/useAllProducts';
import { db, storage } from '../../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../../lib/emailjsConfig';
import styles from './Checkout.module.css';

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
  const [referralInfo, setReferralInfo] = useState(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    const refCode = localStorage.getItem('subwikha_referral');
    const myCode = localStorage.getItem('subwikha_my_referral_code');
    if (!refCode || refCode === myCode) return;
    getDocs(collection(db, 'referrals'))
      .then(snap => {
        const match = snap.docs.find(d => d.data().code === refCode);
        if (match) setReferralInfo({ firestoreId: match.id, code: refCode });
      })
      .catch(() => {});
  }, []);

  const gameDiscount = getGameDiscount();
  const REFERRAL_DISCOUNT_PERCENT = 5;
  const referralPercent = referralInfo ? REFERRAL_DISCOUNT_PERCENT : 0;
  const usingReferral = referralPercent > (gameDiscount || 0);
  const appliedDiscountPercent = usingReferral ? referralPercent : gameDiscount;
  const discountAmount = appliedDiscountPercent ? Math.floor(total * appliedDiscountPercent / 100) : 0;
  const shipping = (total - discountAmount) >= 500 ? 0 : 80;
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
    const arr = Array.from(files).filter(f => f.size <= 15 * 1024 * 1024).slice(0, 5);
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
        const path = `orders/${orderId}/${item.id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      links[item.name] = urls;
    }
    return links;
  }

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
    photoItems.forEach(item => {
      if (!photoFiles[item.id]?.length) {
        errs[`photo_${item.id}`] = `Please upload at least one photo for ${item.name}`;
      }
    });
    return errs;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the errors below');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    const options = {
      key: RAZORPAY_KEY,
      amount: grandTotal * 100,
      currency: 'INR',
      name: "Subwikha's Hub",
      description: `${items.length} Gift${items.length > 1 ? 's' : ''}: Where Memories Become Gifts`,
      image: '/logo.png',
      handler: async function (response) {
        const orderId = response.razorpay_order_id || `ORD${Date.now()}`;
        const paymentId = response.razorpay_payment_id;

        // Upload photos
        let photoLinks = {};
        if (photoItems.length > 0) {
          setUploading(true);
          try {
            photoLinks = await uploadOrderPhotos(orderId);
          } catch (err) {
            console.error('Photo upload failed:', err);
          }
          setUploading(false);
        }

        const orderData = {
          orderId,
          paymentId,
          customer: {
            name: `${form.firstName} ${form.lastName}`,
            email: form.email,
            phone: form.phone,
            address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
          },
          items: items.flatMap(i =>
            i.isBundle
              ? i.components.map(c => ({ name: c.name, qty: c.qty, price: c.price, variant: null, fromHamper: i.name }))
              : [{ name: i.name, qty: i.qty, price: i.price, variant: i.variant || null, customization: i.customization || null }]
          ),
          subtotal: total,
          discount: discountAmount,
          shipping,
          grandTotal,
          giftMessage: form.giftMessage || '',
          photos: photoLinks,
          status: 'paid',
          createdAt: serverTimestamp(),
        };

        try {
          await addDoc(collection(db, 'orders'), orderData);
        } catch (err) {
          console.error('Firebase save failed:', err);
        }

        try {
          const decrementTargets = items.flatMap(i =>
            i.isBundle
              ? i.components.map(c => ({ slug: c.slug, qty: c.qty }))
              : [{ slug: i.slug, qty: i.qty }]
          );
          for (const t of decrementTargets) {
            const full = allProducts.find(p => p.slug === t.slug);
            if (full?.firestoreId && typeof full.stock === 'number') {
              await updateDoc(doc(db, 'products', full.firestoreId), { stock: increment(-t.qty) });
            }
          }
        } catch (err) {
          console.error('Stock decrement failed:', err);
        }

        try {
          const itemsList = items.map(i => `${i.name}${i.variant ? ` (${i.variant})` : ''} × ${i.qty} = ₹${i.price * i.qty}`).join('\n');
          const photoSection = Object.entries(photoLinks).length > 0
            ? '\n\n━━━ CUSTOMER PHOTOS ━━━\n' + Object.entries(photoLinks).map(([name, urls]) => `📎 ${name}:\n${urls.join('\n')}`).join('\n\n')
            : '';

          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              name: 'Order Alert',
              email: 'enistechteam@gmail.com',
              subject: `New Order ${orderId}: ₹${grandTotal}`,
              message: `New order received!\n\nOrder ID: ${orderId}\nPayment ID: ${paymentId}\n\nCustomer: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\nPhone: ${form.phone}\nAddress: ${form.address}, ${form.city}, ${form.state} - ${form.pincode}\n\nItems:\n${itemsList}\n\nSubtotal: ₹${total}\nDiscount: ₹${discountAmount}\nShipping: ₹${shipping}\nTotal: ₹${grandTotal}\n\nGift Message: ${form.giftMessage || 'None'}${photoSection}`,
            },
            EMAILJS_PUBLIC_KEY
          );
        } catch (err) {
          console.error('Email notification failed:', err);
        }

        if (usingReferral && referralInfo) {
          try {
            await updateDoc(doc(db, 'referrals', referralInfo.firestoreId), { uses: increment(1) });
          } catch (err) {
            console.error('Referral update failed:', err);
          }
          localStorage.removeItem('subwikha_referral');
        } else if (gameDiscount) {
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
            disabled={loading || uploading}
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
                {usingReferral
                  ? `🎉 Referral discount (${appliedDiscountPercent}%) applied!`
                  : `🎮 Game discount (${appliedDiscountPercent}%) applied!`}
              </div>
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
