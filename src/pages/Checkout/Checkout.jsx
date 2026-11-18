import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAllProducts } from '../../hooks/useAllProducts';
import { useDeliveryZones } from '../../hooks/useDeliveryZones';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { trackEvent, toGaItem } from '../../lib/analytics';
import toast from 'react-hot-toast';
import { isValidEmail, isValidPhone } from '../../lib/validators';
import {
  ORDER_TYPE,
  MAX_GIFT_MESSAGE_LENGTH,
  MAX_SELF_GIFT_MESSAGE_LENGTH,
  MAX_LANDMARK_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
  todayIsoDate,
} from '../../lib/giftOrders';
import {
  DELIVERY_METHOD,
  NOT_SERVICEABLE_MESSAGE,
  PICKUP_UNAVAILABLE_MESSAGE,
  PICKUP_NOT_IN_AREA_MESSAGE,
  formatCharge,
  isValidPincode,
  resolveDelivery,
} from '../../lib/delivery';
import { whatsappLink } from '../../data/site';
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

/**
 * A stable id for "this checkout", so a customer who abandons the payment and
 * comes back later updates the SAME lead instead of littering the table with
 * near-duplicates.
 *
 * The base id lives in localStorage and is cleared once an order succeeds; the
 * cart signature is mixed in so a genuinely different basket starts a new lead.
 */
function getCheckoutSessionId(items) {
  const BASE_KEY = 'subwikha_checkout_session';
  let base = null;
  try {
    base = localStorage.getItem(BASE_KEY);
    if (!base) {
      base = `cs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(BASE_KEY, base);
    }
  } catch {
    base = `cs_${Date.now().toString(36)}`; // private mode / storage disabled
  }
  const signature = (items || [])
    .map(i => `${i.slug || i.id}:${i.qty}`)
    .join('|');
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    hash = (hash * 31 + signature.charCodeAt(i)) | 0;
  }
  return `${base}-${Math.abs(hash).toString(36)}`;
}

function clearCheckoutSession() {
  try { localStorage.removeItem('subwikha_checkout_session'); } catch { /* ignore */ }
}

/**
 * Tells the server what the payment gateway ended up doing, so the checkout
 * lead reflects the truth (failed / cancelled) instead of sitting on "pending"
 * forever. Fire-and-forget: this must never interrupt the checkout.
 */
function reportPaymentOutcome(razorpayOrderId, status, reason) {
  if (!razorpayOrderId) return;
  try {
    fetch('/api/update-lead-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpayOrderId, status, reason }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

export default function Checkout() {
  const { items, total, dispatch } = useCart();
  const navigate = useNavigate();
  const allProducts = useAllProducts();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // ── Gift order / surprise delivery ──────────────────────────────────────
  // Defaults to a self order so the existing checkout flow is untouched until
  // the customer actively picks "Sending a gift to someone else".
  const [orderType, setOrderType] = useState(ORDER_TYPE.SELF);
  const [isSurprise, setIsSurprise] = useState(false);
  const [hideIdentity, setHideIdentity] = useState(true);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
    recipientName: '', recipientPhone: '', recipientAddress: '',
    recipientCity: '', recipientState: '', recipientPincode: '', recipientLandmark: '',
    preferredDeliveryDate: '',
    giftMessage: '',
  });
  const [errors, setErrors] = useState({});
  const [photoFiles, setPhotoFiles] = useState({});
  // The preview URL of every chosen photo, made once when the file is picked.
  // (Creating them inside render would leak a new object URL on every
  // keystroke — the page would get slower the longer it stayed open.)
  const [photoUrls, setPhotoUrls] = useState({});
  const fileInputRefs = useRef({});

  const isGift = orderType === ORDER_TYPE.GIFT;
  // Self orders keep the longer "gift message" they've always had; a gift
  // message has to fit on a printed note, so it is capped at 250 characters.
  const giftMessageLimit = isGift ? MAX_GIFT_MESSAGE_LENGTH : MAX_SELF_GIFT_MESSAGE_LENGTH;
  const minDeliveryDate = todayIsoDate();

  // ── Delivery ───────────────────────────────────────────────────────────
  // The zones the owner configured in the admin panel. The zone is worked out
  // from the pincode as soon as it is six digits — for a gift order it is the
  // RECIPIENT's pincode that decides the price, never the buyer's.
  const { zones, settings: deliverySettings, pickupZone } = useDeliveryZones();
  const [deliveryMethod, setDeliveryMethod] = useState(DELIVERY_METHOD.HOME);

  const deliveryPincode = isGift ? form.recipientPincode : form.pincode;
  // The SAME resolution the server uses — so the charge on screen is the
  // charge on the payment.
  const homeDelivery = resolveDelivery({
    method: DELIVERY_METHOD.HOME,
    zones,
    pincode: deliveryPincode,
  });
  const pickupDelivery = resolveDelivery({
    method: DELIVERY_METHOD.PICKUP,
    zones,
    pincode: deliveryPincode,
  });
  // Collection from the studio is only offered inside our main delivery area.
  // If the customer changes their PIN code to somewhere that isn't eligible,
  // we fall back to home delivery rather than leaving them in a state the
  // server would reject.
  const pickupAvailable = Boolean(pickupDelivery.zone);
  const homeAvailable = Boolean(homeDelivery.zone);
  const isPickup = deliveryMethod === DELIVERY_METHOD.PICKUP && pickupAvailable;
  const matchedZone = homeDelivery.zone;
  const pincodeLooksValid = isValidPincode(deliveryPincode);
  const pincodeUnservable = pincodeLooksValid && !homeAvailable && !pickupAvailable;
  const noZonesConfigured = zones.length === 0;

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
  // (cart total, this device's own saved discount, the zone the pincode falls in)
  // so the order summary doesn't sit blank while typing. The authoritative price,
  // discount, and delivery charge are always recomputed from trusted server-side
  // data in api/create-order.js — nothing here is trusted for the actual charge.
  //
  // The delivery charge comes from the owner's own zone configuration, so the
  // figure on screen is the one the server will charge.
  const zoneCharge = isPickup ? 0 : (matchedZone?.charge || 0);
  const freeAbove = Math.max(0, Number(deliverySettings?.freeDeliveryAbove) || 0);
  const freeShippingReason = (zoneCharge > 0 && freeAbove > 0 && (total - discountAmount) >= freeAbove)
    ? 'amount'
    : (zoneCharge > 0 && hasReferral ? 'referral' : null);
  const shipping = freeShippingReason ? 0 : zoneCharge;
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
    return needsPhotoVariants(item)
      ? [{
        id: item.id,
        name: item.name,
        images: item.images,
        // Photos the customer already framed in the personalization studio.
        // They are uploaded already, so they travel with the order.
        personalizationPhotos: (item.personalization?.photos || []).filter(p => p?.url),
      }]
      : [];
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => ({ ...err, [name]: '' }));
  };

  // Switching between self and gift orders has to keep the two forms honest:
  // the gift message gets trimmed to the shorter (printed-note) limit, and any
  // error left over from the other mode is cleared so nothing stale is shown.
  const handleOrderTypeChange = (nextType) => {
    if (nextType === orderType) return;
    setOrderType(nextType);
    setForm(f => ({
      ...f,
      giftMessage: nextType === ORDER_TYPE.GIFT
        ? f.giftMessage.slice(0, MAX_GIFT_MESSAGE_LENGTH)
        : f.giftMessage,
    }));
    setErrors({});
    if (nextType === ORDER_TYPE.GIFT) {
      // A surprise gift is the whole point of the gift flow, so it starts on.
      setIsSurprise(true);
    } else {
      setIsSurprise(false);
      setHideIdentity(true);
    }
  };

  function handlePhotoChange(itemId, files) {
    const all = Array.from(files);
    const arr = all.filter(f => f.size <= 15 * 1024 * 1024).slice(0, 5);
    const oversized = all.filter(f => f.size > 15 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`${oversized.length > 1 ? `${oversized.length} photos are` : '1 photo is'} over 15 MB and won't be uploaded`);
    }
    const existing = photoFiles[itemId] || [];
    const room = Math.max(0, 5 - existing.length);
    const added = arr.slice(0, room);
    setPhotoFiles(prev => ({ ...prev, [itemId]: [...existing, ...added].slice(0, 5) }));
    setPhotoUrls(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), ...added.map(f => URL.createObjectURL(f))],
    }));
    setErrors(prev => ({ ...prev, [`photo_${itemId}`]: '' }));
  }

  function removePhoto(itemId, index) {
    setPhotoFiles(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((_, i) => i !== index),
    }));
    setPhotoUrls(prev => {
      const urls = [...(prev[itemId] || [])];
      const dropped = urls[index];
      if (dropped) URL.revokeObjectURL(dropped);
      urls.splice(index, 1);
      return { ...prev, [itemId]: urls };
    });
  }

  async function uploadOrderPhotos(orderId) {
    const links = {};
    for (const item of photoItems) {
      // The photos framed in the personalization studio are already hosted —
      // they go straight to the order.
      const urls = (item.personalizationPhotos || []).map(p => p.url);
      const files = photoFiles[item.id] || [];
      for (const file of files) {
        urls.push(await uploadToCloudinary(file, `orders/${orderId}/${item.id}`));
      }
      if (urls.length) links[item.name] = urls;
    }
    return links;
  }

  const validate = () => {
    const errs = {};
    // ── Buyer details (always) ──
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    // A gift order may leave the email empty (WhatsApp updates only), but a
    // self order has always required one.
    if (form.email.trim() ? !isValidEmail(form.email) : !isGift) {
      errs.email = 'Valid email required';
    }
    if (!isValidPhone(form.phone)) errs.phone = '10-digit phone required';

    if (isGift) {
      // ── Recipient details (gift orders only) ──
      if (!form.recipientName.trim()) errs.recipientName = 'Recipient name is required';
      if (!isValidPhone(form.recipientPhone)) errs.recipientPhone = '10-digit phone required';
      // A pickup order is collected from the studio, so no address is needed.
      if (!isPickup) {
        if (!form.recipientAddress.trim()) errs.recipientAddress = 'Complete address is required';
        if (!form.recipientCity.trim()) errs.recipientCity = 'City is required';
        if (!form.recipientState.trim()) errs.recipientState = 'State is required';
        if (!isValidPincode(form.recipientPincode)) errs.recipientPincode = '6-digit pincode required';
      }
    } else if (!isPickup) {
      // ── Delivery address (self orders, home delivery only) ──
      if (!form.address.trim()) errs.address = 'Street address is required';
      if (!form.city.trim()) errs.city = 'City is required';
      if (!form.state.trim()) errs.state = 'State is required';
      if (!isValidPincode(form.pincode)) errs.pincode = '6-digit pincode required';
    }

    // ── Delivery zone ──
    if (isPickup) {
      if (!pickupZone) errs.delivery = PICKUP_UNAVAILABLE_MESSAGE;
      if (!pickupAvailable) errs.delivery = PICKUP_NOT_IN_AREA_MESSAGE;
    } else if (pincodeLooksValid && !homeAvailable) {
      errs.delivery = NOT_SERVICEABLE_MESSAGE;
    }

    if (form.giftMessage.length > giftMessageLimit) {
      errs.giftMessage = `Please keep your message under ${giftMessageLimit} characters`;
    }
    photoItems.forEach(item => {
      // A photo the customer already framed in the studio counts — they are
      // not asked to upload the same picture twice.
      const alreadyFramed = (item.personalizationPhotos || []).length > 0;
      if (!photoFiles[item.id]?.length && !alreadyFramed) {
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
        : {
          slug: i.slug,
          id: i.id,
          qty: i.qty,
          variant: i.variant || null,
          customization: i.customization || null,
          // The photos framed in the personalization studio, with the crop the
          // customer chose, so the makers print exactly what they saw.
          personalization: i.personalization || null,
        }
    );
  }

  // The buyer — the person paying and the person we talk to about the order.
  function buildBuyer() {
    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      // The delivery address, for a self order being delivered to the buyer.
      // A gift order delivers to somebody else, and a pickup order is collected
      // from the studio, so neither needs a street address.
      address: isPickup || isGift ? '' : form.address.trim(),
      city: isPickup || isGift ? '' : form.city.trim(),
      state: isPickup || isGift ? '' : form.state.trim(),
      // The PIN code is ALWAYS sent, pickup or not: it is what decides the
      // delivery zone and whether collection is available at all.
      pincode: form.pincode.trim(),
    };
  }

  // The recipient — only ever populated for a gift order. This is the address the
  // parcel is actually delivered to.
  function buildRecipient() {
    if (!isGift) return null;
    return {
      name: form.recipientName.trim(),
      phone: form.recipientPhone.trim(),
      address: isPickup ? '' : form.recipientAddress.trim(),
      city: isPickup ? '' : form.recipientCity.trim(),
      state: isPickup ? '' : form.recipientState.trim(),
      pincode: form.recipientPincode.trim(),
      landmark: isPickup ? '' : form.recipientLandmark.trim(),
    };
  }

  // A one-line delivery address, used for Razorpay's merchant-only notes.
  function deliveryAddressLine() {
    if (isPickup) return '';
    if (isGift) {
      const r = buildRecipient();
      return `${r.address}, ${r.city}, ${r.state} - ${r.pincode}`;
    }
    return `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`;
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
          phone: form.phone.trim(),
          orderType,
          buyer: buildBuyer(),
          recipient: buildRecipient(),
          isSurpriseGift: isGift && isSurprise,
          hideSenderIdentity: isGift && isSurprise && hideIdentity,
          preferredDeliveryDate: isGift ? form.preferredDeliveryDate : '',
          deliveryMethod,
          // Lets the server keep ONE lead for this checkout, updated as the
          // customer changes their mind, instead of a new one every attempt.
          checkoutSessionId: getCheckoutSessionId(items),
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
              orderType,
              customer: {
                ...buildBuyer(),
                // A self order delivers to the buyer, so their address doubles as
                // the delivery address. A gift order delivers to somebody else,
                // so the buyer has no delivery address at all.
                address: isGift ? '' : deliveryAddressLine(),
              },
              recipient: buildRecipient(),
              isSurpriseGift: isGift && isSurprise,
              hideSenderIdentity: isGift && isSurprise && hideIdentity,
              giftMessage: form.giftMessage || '',
              preferredDeliveryDate: isGift ? form.preferredDeliveryDate : '',
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
          // The order is through — the next checkout starts a fresh lead.
          clearCheckoutSession();

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
              buyer: buildBuyer(),
              recipient: buildRecipient(),
              orderType,
              giftMessage: form.giftMessage || '',
              buyerEmailEnabled: Boolean(created.buyerEmailEnabled),
              isSurpriseGift: isGift && isSurprise,
              hideSenderIdentity: isGift && isSurprise && hideIdentity,
              preferredDeliveryDate: isGift ? form.preferredDeliveryDate : '',
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
        // Merchant-only notes — never seen by the recipient. The address here is
        // always the delivery address (the recipient's, for a gift order).
        address: deliveryAddressLine(),
        gift_message: form.giftMessage,
      },
      theme: { color: '#c9a84c', backdrop_color: '#0a0a0a' },
      modal: {
        ondismiss: () => {
          setLoading(false);
          // The customer closed the payment window — the lead stays, marked as
          // a cancelled payment, so we can follow up.
          reportPaymentOutcome(created.razorpayOrderId, 'CANCELLED', 'Payment window closed');
          toast('Payment cancelled', { icon: '⚠' });
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setLoading(false);
        // The lead keeps the details either way — this just records what happened.
        reportPaymentOutcome(created.razorpayOrderId, 'FAILED', response?.error?.description);
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
          {/* ── Order type ── */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Who is this order for?</h3>
            <p className={styles.sectionHint}>
              Tell us if this gift is for you, or a surprise for someone you love.
            </p>
            <div className={styles.orderTypeGrid}>
              <OrderTypeOption
                icon="🎁"
                title="Ordering for myself"
                description="We'll deliver it to your own address."
                selected={!isGift}
                onSelect={() => handleOrderTypeChange(ORDER_TYPE.SELF)}
              />
              <OrderTypeOption
                icon="💝"
                title="Sending a gift to someone else"
                description="We'll deliver it to them — and keep it a surprise."
                selected={isGift}
                onSelect={() => handleOrderTypeChange(ORDER_TYPE.GIFT)}
              />
            </div>
          </div>

          {/* ── Buyer details (always) ── */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>
              {isGift ? 'Your Details (Buyer)' : 'Contact Information'}
            </h3>
            <p className={styles.sectionHint}>
              {isGift
                ? "These details are used to confirm your order and send you updates. We never share them with the recipient."
                : "We'll use these to confirm your order and send you updates."}
            </p>
            <div className={styles.formGrid2}>
              <Field label="First Name" name="firstName" value={form.firstName} onChange={handleChange} error={errors.firstName} maxLength={MAX_NAME_LENGTH} />
              <Field label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} error={errors.lastName} maxLength={MAX_NAME_LENGTH} />
            </div>
            <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} optional={isGift} />
            <Field
              label={isGift ? 'WhatsApp / Phone Number' : 'Phone Number'}
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="10-digit mobile number"
            />
          </div>

          {/* ── Address ──
              The PIN code is always needed: it decides the delivery zone, the
              charge, and whether collection from the studio is offered at all. */}
          {isGift ? (
            <div className={`${styles.formSection} ${styles.recipientSection}`}>
              <h3 className={styles.sectionTitle}>Recipient Details</h3>
              <p className={styles.sectionHint}>
                Where should we deliver the gift? These details are used for delivery coordination only.
              </p>
              <Field label="Recipient Full Name" name="recipientName" value={form.recipientName} onChange={handleChange} error={errors.recipientName} maxLength={MAX_NAME_LENGTH} />
              <Field label="Recipient Mobile Number" name="recipientPhone" type="tel" value={form.recipientPhone} onChange={handleChange} error={errors.recipientPhone} placeholder="10-digit mobile number" />
              {!isPickup && (
                <>
                  <Field label="Complete Address" name="recipientAddress" value={form.recipientAddress} onChange={handleChange} error={errors.recipientAddress} maxLength={MAX_ADDRESS_LENGTH} placeholder="House / flat no., street, area" />
                  <div className={styles.formGrid2}>
                    <Field label="City" name="recipientCity" value={form.recipientCity} onChange={handleChange} error={errors.recipientCity} />
                    <Field label="State" name="recipientState" value={form.recipientState} onChange={handleChange} error={errors.recipientState} />
                  </div>
                </>
              )}
              <div className={styles.formGrid2}>
                <Field label="PIN Code" name="recipientPincode" value={form.recipientPincode} onChange={handleChange} error={errors.recipientPincode} placeholder="6-digit PIN" />
                {!isPickup && (
                  <Field label="Landmark" name="recipientLandmark" value={form.recipientLandmark} onChange={handleChange} error={errors.recipientLandmark} optional maxLength={MAX_LANDMARK_LENGTH} placeholder="e.g. Near SBI bank" />
                )}
              </div>
              <DeliveryZoneStatus
                pincode={form.recipientPincode}
                zone={matchedZone}
                unservable={pincodeUnservable}
                pickupAvailable={pickupAvailable}
                isPickup={isPickup}
              />
            </div>
          ) : (
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>{isPickup ? 'Your Area' : 'Delivery Address'}</h3>
              {!isPickup && (
                <>
                  <Field label="Street Address" name="address" value={form.address} onChange={handleChange} error={errors.address} maxLength={MAX_ADDRESS_LENGTH} />
                  <div className={styles.formGrid2}>
                    <Field label="City" name="city" value={form.city} onChange={handleChange} error={errors.city} />
                    <Field label="State" name="state" value={form.state} onChange={handleChange} error={errors.state} />
                  </div>
                </>
              )}
              <Field label="PIN Code" name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode} placeholder="6-digit PIN" />
              <DeliveryZoneStatus
                pincode={form.pincode}
                zone={matchedZone}
                unservable={pincodeUnservable}
                pickupAvailable={pickupAvailable}
                isPickup={isPickup}
              />
            </div>
          )}

          {/* ── Delivery method (unlocked by the PIN code above) ── */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>How would you like to receive your order?</h3>
            <p className={styles.sectionHint}>
              {pickupAvailable
                ? 'Your PIN code is in our main delivery area — you can have it delivered, or collect it free from our studio.'
                : 'Your PIN code decides what we can offer. Enter it above and we will show you the options.'}
            </p>
            <div className={styles.orderTypeGrid}>
              <OrderTypeOption
                icon="🚚"
                title="Home Delivery"
                description={homeAvailable
                  ? 'We bring it to your door'
                  : (pincodeLooksValid ? 'Not available for this PIN code' : 'Enter your PIN code above')}
                selected={!isPickup}
                onSelect={() => setDeliveryMethod(DELIVERY_METHOD.HOME)}
                disabled={!homeAvailable}
              />
              {pickupAvailable ? (
                <OrderTypeOption
                  icon="🏠"
                  title="Direct Pickup"
                  description="Collect it free from our studio"
                  selected={isPickup}
                  onSelect={() => setDeliveryMethod(DELIVERY_METHOD.PICKUP)}
                />
              ) : (
                <div className={styles.pickupLocked}>
                  <span className={styles.pickupLockedIcon}>🏠</span>
                  <span className={styles.pickupLockedText}>
                    <span className={styles.pickupLockedTitle}>Direct Pickup</span>
                    <span className={styles.pickupLockedDesc}>
                      {pincodeLooksValid
                        ? 'Collecting from the studio is open to customers in our main area (Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti & nearby).'
                        : 'Enter your PIN code above to check.'}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {isPickup && pickupZone && (
              <div className={styles.pickupCard}>
                <p className={styles.pickupLocation}>📍 {pickupZone.location || 'Subwikha\'s Hub, Thondamuthur, Coimbatore'}</p>
                {pickupZone.instructions && (
                  <p className={styles.pickupInstructions}>{pickupZone.instructions}</p>
                )}
                <span className={styles.pickupCharge}>🏠 Store Pickup · Delivery Charge: FREE</span>
              </div>
            )}
            {noZonesConfigured && (
              <p className={styles.pickupUnavailable}>
                Delivery is not set up at the moment. Please contact us and we'll help you sort it out.
              </p>
            )}
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
                const urls = photoUrls[item.id] || [];
                const framed = item.personalizationPhotos || [];
                const err = errors[`photo_${item.id}`];
                return (
                  <div key={item.id} className={styles.photoUploadItem}>
                    <p className={styles.photoProductName}>📎 {item.name}</p>

                    {framed.length > 0 && (
                      <div className={styles.photoThumbs}>
                        {framed.map(p => (
                          <div key={p.url} className={styles.photoThumbWrap}>
                            <img src={p.url} className={styles.photoThumb} alt="Your photo" />
                          </div>
                        ))}
                        <span className={styles.photoCount}>
                          {framed.length} photo{framed.length > 1 ? 's' : ''} from your design
                        </span>
                      </div>
                    )}

                    {files.length === 0 && framed.length === 0 ? (
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
                          {urls.map((url, i) => (
                            <div key={url} className={styles.photoThumbWrap}>
                              <img src={url} className={styles.photoThumb} alt="" />
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
                              <img src={urls[0] || framed[0]?.url} alt="Your photo" className={styles.photoPreviewImg} />
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

          {/* ── Surprise gift options (gift orders only) ── */}
          {isGift && (
            <div className={`${styles.formSection} ${styles.surpriseSection}`}>
              <div className={styles.surpriseHead}>
                <div>
                  <h3 className={styles.sectionTitle} id="surpriseLabel">Surprise Gift</h3>
                  <p className={styles.sectionHint} id="surpriseHint">
                    Keep the surprise intact — we never reveal your name or your contact details unless you ask us to.
                  </p>
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={isSurprise}
                    onChange={e => {
                      setIsSurprise(e.target.checked);
                      if (!e.target.checked) setHideIdentity(true);
                    }}
                    aria-describedby="surpriseHint"
                  />
                  <span className={styles.switchTrack} aria-hidden="true"><span className={styles.switchThumb} /></span>
                  <span className={styles.switchText}>{isSurprise ? 'On' : 'Off'}</span>
                </label>
              </div>

              {isSurprise && (
                <div className={styles.surpriseBody}>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={hideIdentity}
                      onChange={e => setHideIdentity(e.target.checked)}
                    />
                    <span>
                      <span className={styles.checkTitle}>Hide my name from the recipient</span>
                      <span className={styles.checkHint}>
                        Your name is left off the gift note and every delivery message.
                      </span>
                    </span>
                  </label>

                  <div className={styles.fieldWrap}>
                    <label className={styles.label} htmlFor="preferredDeliveryDate">
                      Preferred Delivery Date <span className={styles.optional}>(Optional)</span>
                    </label>
                    <input
                      id="preferredDeliveryDate"
                      name="preferredDeliveryDate"
                      type="date"
                      className={styles.input}
                      value={form.preferredDeliveryDate}
                      min={minDeliveryDate}
                      onChange={handleChange}
                    />
                    <span className={styles.checkHint}>
                      We'll do our best to deliver on or after this date.
                    </span>
                  </div>

                  <p className={styles.checkHint}>
                    💌 {form.giftMessage.trim()
                      ? 'Your message below will be printed on the gift note.'
                      : 'Add a personal message below — we will print it on the gift note.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Gift message ── */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle} id="giftMessageLabel">
              {isGift ? 'Your Gift Message' : 'Gift Message'} <span className={styles.optional}>(Optional)</span>
            </h3>
            {isGift && (
              <p className={styles.sectionHint}>
                Write a sweet message for your loved one 💌 — we'll print it on a handwritten-style note.
              </p>
            )}
            <div className={styles.fieldWrap}>
              <textarea
                name="giftMessage"
                id="giftMessage"
                aria-labelledby="giftMessageLabel"
                className={`${styles.textarea} ${isGift ? styles.giftTextarea : ''} ${errors.giftMessage ? styles.inputError : ''}`}
                value={form.giftMessage}
                onChange={handleChange}
                placeholder={isGift
                  ? 'Happy Birthday, my love! Every little moment with you is special. ❤️'
                  : 'Write a heartfelt message for the recipient...'}
                rows={3}
                maxLength={giftMessageLimit}
              />
              <div className={styles.counterRow}>
                <span className={styles.counterHint}>
                  {isGift ? 'Keep it short and sweet — it fits beautifully on the note.' : 'We will pass this along with your order.'}
                </span>
                <span className={`${styles.counter} ${form.giftMessage.length > giftMessageLimit * 0.9 ? styles.counterNearLimit : ''}`}>
                  {form.giftMessage.length} / {giftMessageLimit}
                </span>
              </div>
              {errors.giftMessage && <span className={styles.errorMsg}>{errors.giftMessage}</span>}
            </div>

            {/* Gift note preview */}
            {isGift && (
              <div className={styles.notePreview}>
                <span className={styles.notePreviewLabel}>Gift Note Preview</span>
                <div className={styles.noteCard}>
                  <span className={styles.noteRibbon}>🎀</span>
                  <p className={styles.noteText}>
                    {form.giftMessage.trim() || 'Your message will appear here…'}
                  </p>
                  <span className={styles.noteFrom}>
                    {hideIdentity && isSurprise ? '— From someone who loves you' : '— With love'}
                  </span>
                </div>
              </div>
            )}
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
          {isGift && (
            <div className={styles.summaryGiftBadge}>
              <span aria-hidden="true">💝</span>
              <span>
                <strong>Gift order</strong> — delivering to{' '}
                {form.recipientName.trim() || 'the recipient'}
                {form.recipientCity.trim() ? `, ${form.recipientCity.trim()}` : ''}.
                {isSurprise && hideIdentity
                  ? ' Your name stays hidden.'
                  : ''}
              </span>
            </div>
          )}
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
                  {item.personalization?.photos?.length > 0 && (
                    <p className={styles.summaryTagline} style={{ color: 'var(--gold)' }}>
                      🎨 Personalized with {item.personalization.photos.length} photo
                      {item.personalization.photos.length > 1 ? 's' : ''}
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
              <div className={styles.discountBanner}>🤝 Referral perk: Free delivery applied!</div>
            )}
            {freeShippingReason === 'amount' && (
              <div className={styles.discountBanner}>🎁 Free delivery on orders above ₹{freeAbove.toLocaleString('en-IN')}</div>
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
              <span>
                {isPickup
                  ? 'Store Pickup'
                  : `Delivery${matchedZone?.name ? ` · ${matchedZone.name}` : ''}`}
              </span>
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

function Field({ label, name, type = 'text', value, onChange, error, placeholder, optional, maxLength }) {
  return (
    <div className={styles.fieldWrap}>
      <label className={styles.label} htmlFor={name}>
        {label} {optional && <span className={styles.optional}>(Optional)</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        autoComplete="on"
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <span id={`${name}-error`} className={styles.errorMsg}>{error}</span>}
    </div>
  );
}

// A big, tappable card that picks the order type. Kept as its own component so
// the two options stay visually identical and only the selected one lights up.
function OrderTypeOption({ icon, title, description, selected, onSelect, disabled }) {
  return (
    <button
      type="button"
      className={`${styles.orderTypeCard} ${selected ? styles.orderTypeCardActive : ''} ${disabled ? styles.orderTypeCardDisabled : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      disabled={disabled}
    >
      <span className={styles.orderTypeIcon} aria-hidden="true">{icon}</span>
      <span className={styles.orderTypeText}>
        <span className={styles.orderTypeTitle}>{title}</span>
        <span className={styles.orderTypeDesc}>{description}</span>
      </span>
      <span className={`${styles.orderTypeRadio} ${selected ? styles.orderTypeRadioOn : ''}`} aria-hidden="true" />
    </button>
  );
}

/**
 * Shows what the customer will pay for delivery, the moment their PIN code
 * is complete — and, if we don't deliver there, says so plainly and offers
 * them a way to reach us.
 */
function DeliveryZoneStatus({ pincode, zone, unservable, pickupAvailable, isPickup }) {
  if (unservable) {
    const wa = whatsappLink(
      `Hi Subwikha's Hub! I'd love to order a gift, but I'm not sure you deliver to PIN code ${pincode}. Could you check?`,
    );
    return (
      <div className={styles.zoneAlert}>
        <p className={styles.zoneAlertText}>😔 {NOT_SERVICEABLE_MESSAGE}</p>
        {wa ? (
          <a className={styles.zoneContact} href={wa} target="_blank" rel="noreferrer">💬 Chat on WhatsApp</a>
        ) : (
          <Link className={styles.zoneContact} to="/contact">💬 Contact us about delivery</Link>
        )}
      </div>
    );
  }
  if (isPickup) {
    return (
      <div className={styles.zoneBadge}>
        <span className={styles.zoneBadgeItem}>📍 {pincode}</span>
        <span className={styles.zoneBadgeItem}>🏠 Store Pickup</span>
        <span className={styles.zoneCharge}>Delivery Charge: FREE</span>
      </div>
    );
  }
  if (!zone) return null;
  return (
    <div className={styles.zoneBadge}>
      <span className={styles.zoneBadgeItem}>📍 {pincode}</span>
      <span className={styles.zoneBadgeItem}>🚚 {zone.name}</span>
      <span className={styles.zoneCharge}>Delivery Charge: {formatCharge(zone.charge)}</span>
      {pickupAvailable && (
        <span className={styles.zoneBadgeNote}>· 🏠 collection from our studio is free too</span>
      )}
    </div>
  );
}
