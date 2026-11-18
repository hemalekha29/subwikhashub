import admin from 'firebase-admin';
import { products as staticProducts } from '../src/data/products.js';
import { RAZORPAY_KEY_ID } from '../src/lib/razorpayConfig.js';
import {
  ORDER_TYPE,
  normalizeOrderType,
  cleanText,
  cleanMultiline,
  isValidDeliveryDate,
  MAX_GIFT_MESSAGE_LENGTH,
  MAX_SELF_GIFT_MESSAGE_LENGTH,
  MAX_LANDMARK_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from '../src/lib/giftOrders.js';
import {
  DEFAULT_DELIVERY_ZONES,
  DEFAULT_DELIVERY_SETTINGS,
  DELIVERY_METHOD,
  DELIVERY_SETTINGS_COLLECTION,
  DELIVERY_SETTINGS_DOC,
  DELIVERY_ZONES_COLLECTION,
  normalizeZones,
  resolveDelivery,
} from '../src/lib/delivery.js';
import { CHECKOUT_STATUS, FOLLOW_UP_STATUS, PAYMENT_STATUS } from '../src/lib/checkoutLeads.js';
import { upsertCheckoutLead } from '../src/lib/server/leads.js';

const BUNDLE_DISCOUNT = 0.1; // must match src/pages/Hamper/HamperBuilder.jsx
const MAX_DISCOUNT_PERCENT = 15; // must match the ceiling in src/pages/Game/Game.jsx (finalPercent capped at 15)
const MAX_ITEMS = 30;
const MAX_QTY_PER_ITEM = 20;

/**
 * Loads the delivery zones the owner configured in the admin panel.
 *
 * The admin panel is the source of truth — but until they create their first
 * zone the built-in starter zones are used, so the site can take orders from
 * day one. Once `configured` is set, an empty collection means "no delivery
 * configured" and is respected as-is.
 */
async function loadDeliveryConfig(db) {
  let settings = { ...DEFAULT_DELIVERY_SETTINGS };
  try {
    const snap = await db.collection(DELIVERY_SETTINGS_COLLECTION).doc(DELIVERY_SETTINGS_DOC).get();
    if (snap.exists()) settings = { ...DEFAULT_DELIVERY_SETTINGS, ...snap.data() };
  } catch (err) {
    console.error('Could not load delivery settings:', err);
  }

  let zones = [];
  try {
    const snap = await db.collection(DELIVERY_ZONES_COLLECTION).get();
    zones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Could not load delivery zones:', err);
  }

  if (zones.length === 0 && settings.configured !== true) {
    return { zones: DEFAULT_DELIVERY_ZONES, settings };
  }
  return { zones: normalizeZones(zones), settings };
}

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

async function getTrustedProducts(db) {
  const snap = await db.collection('products').get();
  const fsProducts = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  // Same precedence + hidden-filtering rule as src/hooks/useAllProducts.js: Firestore
  // products win over the static catalog by slug, and a `hidden: true` doc (how the
  // admin panel "deletes" a built-in product it can't remove from source, or hides an
  // admin-created one) must block the static fallback too, not just disappear from the
  // list — otherwise a "deleted" product would still be directly orderable via the API
  // even though it's invisible in the Shop. Previously this function didn't filter
  // hidden products at all, unlike the hook it's meant to mirror.
  const visible = fsProducts.filter(p => !p.hidden);
  return [...visible, ...staticProducts.filter(sp => !fsProducts.some(fp => fp.slug === sp.slug))];
}

function resolveUnitPrice(product, variantLabel) {
  if (product.priceVariants?.length) {
    const match = product.priceVariants.find(v => v.label === variantLabel);
    return (match || product.priceVariants[0]).price;
  }
  return product.price;
}

/**
 * The personalization the customer made in the studio: the photos they
 * uploaded (already hosted on Cloudinary) with the crop they chose, and the
 * text they wrote.
 *
 * Only what the makers need is kept — an https URL, which slot of the frame
 * the photo belongs in, and the crop. Anything else the browser sends is
 * dropped, so a crafted request can never write arbitrary data into an order.
 */
function sanitizePersonalization(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const photos = Array.isArray(raw.photos)
    ? raw.photos.slice(0, 8).map(p => ({
      url: (typeof p?.url === 'string' && p.url.startsWith('https://') ? p.url : '').slice(0, 500),
      slot: (typeof p?.slot === 'string' ? p.slot : '').slice(0, 40),
      slotLabel: (typeof p?.slotLabel === 'string' ? p.slotLabel : '').slice(0, 60),
      name: (typeof p?.name === 'string' ? p.name : '').slice(0, 120),
      transform: {
        x: Math.max(-1, Math.min(1, Number(p?.transform?.x) || 0)),
        y: Math.max(-1, Math.min(1, Number(p?.transform?.y) || 0)),
        scale: Math.max(1, Math.min(4, Number(p?.transform?.scale) || 1)),
      },
    })).filter(p => p.url)
    : [];

  const fields = {};
  if (raw.fields && typeof raw.fields === 'object') {
    Object.entries(raw.fields).slice(0, 12).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        fields[String(key).slice(0, 40)] = value.slice(0, 500);
      }
    });
  }

  if (!photos.length && !Object.keys(fields).length) return null;
  return { photos, fields };
}

function isValidPhone(phone) {
  return /^\d{10}$/.test((phone || '').trim());
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

function isValidPincode(pincode) {
  return /^\d{6}$/.test((pincode || '').trim());
}

/**
 * Sanitises the buyer + recipient details a gift order carries.
 *
 * The buyer is whoever pays and is talked to about the order. The recipient is
 * whoever the parcel goes to. They are kept strictly apart — the buyer's
 * contact details are never mixed into the delivery details and vice versa.
 */
function sanitizeBuyer(buyer) {
  return {
    firstName: cleanText(buyer?.firstName, MAX_NAME_LENGTH),
    lastName: cleanText(buyer?.lastName, MAX_NAME_LENGTH),
    email: cleanText(buyer?.email, MAX_NAME_LENGTH),
    phone: cleanText(buyer?.phone, 20),
    // Delivery address — only filled in for a self order being delivered to
    // the buyer. A gift order delivers to the recipient, so the buyer has no
    // address of their own on the order.
    address: cleanText(buyer?.address, MAX_ADDRESS_LENGTH),
    city: cleanText(buyer?.city, MAX_NAME_LENGTH),
    state: cleanText(buyer?.state, MAX_NAME_LENGTH),
    pincode: cleanText(buyer?.pincode, 10),
  };
}

function sanitizeRecipient(recipient) {
  return {
    name: cleanText(recipient?.name, MAX_NAME_LENGTH),
    phone: cleanText(recipient?.phone, 20),
    address: cleanText(recipient?.address, MAX_ADDRESS_LENGTH),
    city: cleanText(recipient?.city, MAX_NAME_LENGTH),
    state: cleanText(recipient?.state, MAX_NAME_LENGTH),
    pincode: cleanText(recipient?.pincode, 10),
    landmark: cleanText(recipient?.landmark, MAX_LANDMARK_LENGTH),
  };
}

/**
 * Validates the buyer + recipient details for the given order type.
 * Returns a customer-facing error message, or null when everything is fine.
 *
 * `deliveryMethod` matters: a pickup order is collected from the studio, so
 * nobody needs a delivery address — not the buyer, and not the gift recipient.
 */
function validateOrderDetails(orderType, deliveryMethod, buyer, recipient) {
  if (!buyer.firstName || !buyer.lastName) {
    return 'Please tell us your name.';
  }
  if (!isValidPhone(buyer.phone)) {
    return 'Please enter a valid 10-digit phone number.';
  }
  // A gift order may leave the email empty (WhatsApp updates only), but an
  // email that IS provided must be well formed.
  if (buyer.email && !isValidEmail(buyer.email)) {
    return 'Please enter a valid email address.';
  }

  const isGift = orderType === ORDER_TYPE.GIFT;
  const pickup = deliveryMethod === DELIVERY_METHOD.PICKUP;

  if (isGift) {
    if (!recipient.name) return "Please tell us who the gift is for.";
    if (!isValidPhone(recipient.phone)) return "Please enter the recipient's valid 10-digit phone number.";
    if (pickup) return null; // collected from the studio — no address needed
    if (!recipient.address) return "Please enter the recipient's complete address.";
    if (!recipient.city) return "Please enter the recipient's city.";
    if (!recipient.state) return "Please enter the recipient's state.";
    if (!isValidPincode(recipient.pincode)) return "Please enter the recipient's 6-digit PIN code.";
    return null;
  }

  if (pickup) return null; // collected from the studio — no address needed
  if (!buyer.address) return 'Please enter your complete address.';
  if (!buyer.city) return 'Please enter your city.';
  if (!buyer.state) return 'Please enter your state.';
  if (!isValidPincode(buyer.pincode)) return 'Please enter your 6-digit PIN code.';
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const {
      items, phone, referralCode, discountPercent,
      orderType, buyer, recipient, isSurpriseGift, hideSenderIdentity,
      preferredDeliveryDate, giftMessage, deliveryMethod, checkoutSessionId,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      res.status(400).json({ ok: false, error: 'Your cart looks invalid. Please refresh and try again.' });
      return;
    }

    // ── Order type + who is who ──────────────────────────────────────────
    // Anything that isn't explicitly GIFT_ORDER is treated as a self order,
    // which keeps requests from older clients working exactly as before.
    const resolvedOrderType = normalizeOrderType(orderType);
    const giftOrder = resolvedOrderType === ORDER_TYPE.GIFT;

    // ── Delivery method ──────────────────────────────────────────────────
    // Only the METHOD comes from the browser. The charge is worked out here
    // from the owner's own zone configuration — a client can ask for pickup or
    // home delivery, but it can never ask for a price.
    const resolvedDeliveryMethod = deliveryMethod === DELIVERY_METHOD.PICKUP
      ? DELIVERY_METHOD.PICKUP
      : DELIVERY_METHOD.HOME;

    const safeBuyer = sanitizeBuyer(buyer || { phone });
    // Older clients only send `phone`; keep it as the buyer's phone fallback.
    if (!safeBuyer.phone) safeBuyer.phone = cleanText(phone, 20);
    const safeRecipient = giftOrder ? sanitizeRecipient(recipient) : null;

    const detailsError = validateOrderDetails(resolvedOrderType, resolvedDeliveryMethod, safeBuyer, safeRecipient);
    if (detailsError) {
      res.status(400).json({ ok: false, error: detailsError });
      return;
    }

    // A delivery-date preference is optional; if it's malformed or in the past
    // we drop it rather than failing the order over it.
    const safeDeliveryDate = giftOrder && isValidDeliveryDate(preferredDeliveryDate)
      ? preferredDeliveryDate
      : '';

    const db = getDb();

    // ── Delivery zone + charge (authoritative) ───────────────────────────
    // The pincode that decides the charge is the one the parcel is going TO:
    // the recipient's for a gift order, the buyer's for a self order. A
    // gift sent to someone else is priced on where it is delivered, never on
    // where the buyer happens to live.
    const { zones, settings } = await loadDeliveryConfig(db);
    const deliveryPincode = giftOrder ? safeRecipient.pincode : safeBuyer.pincode;
    const delivery = resolveDelivery({
      method: resolvedDeliveryMethod,
      zones,
      pincode: deliveryPincode,
    });
    if (delivery.error) {
      res.status(400).json({ ok: false, error: delivery.error });
      return;
    }

    const products = await getTrustedProducts(db);
    const byId = new Map(products.map(p => [p.id, p]));
    const bySlug = new Map(products.map(p => [p.slug, p]));

    let subtotal = 0;
    const resolvedItems = [];
    const decrementTargets = [];
    // Keyed by firestoreId so a product needed via more than one line item (bought
    // standalone AND inside a hamper, or duplicated within one hamper) can be validated
    // against its true combined requirement below, not per-entry against the same
    // original stock value twice — see the consolidation step after this loop.
    const stockInfoById = new Map();

    for (const raw of items) {
      const qty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, parseInt(raw?.qty, 10) || 0));
      if (!qty) {
        res.status(400).json({ ok: false, error: 'One of your cart items has an invalid quantity.' });
        return;
      }

      if (raw?.isBundle) {
        const components = Array.isArray(raw.components) ? raw.components.slice(0, 4) : [];
        if (components.length < 2) {
          res.status(400).json({ ok: false, error: 'A hamper needs at least 2 gifts.' });
          return;
        }
        let componentSum = 0;
        const resolvedComponents = [];
        for (const c of components) {
          const cp = bySlug.get(c.slug);
          if (!cp) {
            res.status(400).json({ ok: false, error: 'One of the gifts in your hamper is no longer available.' });
            return;
          }
          const cQty = Math.max(1, Math.min(MAX_QTY_PER_ITEM, parseInt(c.qty, 10) || 1));
          componentSum += cp.price * cQty;
          resolvedComponents.push({ name: cp.name, slug: cp.slug, qty: cQty, price: cp.price });
          if (cp.firestoreId && typeof cp.stock === 'number') {
            stockInfoById.set(cp.firestoreId, { name: cp.name, stock: cp.stock });
            decrementTargets.push({ firestoreId: cp.firestoreId, qty: cQty * qty });
          }
        }
        const bundleUnitPrice = Math.round(componentSum * (1 - BUNDLE_DISCOUNT));
        subtotal += bundleUnitPrice * qty;
        resolvedItems.push({
          name: `Custom Hamper (${components.length} gifts)`,
          isBundle: true,
          qty,
          price: bundleUnitPrice,
          components: resolvedComponents,
        });
      } else {
        const product = bySlug.get(raw?.slug) || byId.get(raw?.id);
        if (!product) {
          res.status(400).json({ ok: false, error: 'One of your cart items is no longer available.' });
          return;
        }
        const unitPrice = resolveUnitPrice(product, raw?.variant);
        subtotal += unitPrice * qty;
        resolvedItems.push({
          name: product.name,
          slug: product.slug,
          qty,
          price: unitPrice,
          variant: raw?.variant || null,
          customization: raw?.customization || null,
          personalization: sanitizePersonalization(raw?.personalization),
        });
        if (product.firestoreId && typeof product.stock === 'number') {
          stockInfoById.set(product.firestoreId, { name: product.name, stock: product.stock });
          decrementTargets.push({ firestoreId: product.firestoreId, qty });
        }
      }
    }

    // Consolidate by firestoreId — a product needed via more than one line item must be
    // checked against its true COMBINED requirement, not validated per-entry against the
    // same original stock value twice (which would let two "need 3, have 5" checks both
    // pass individually while the real combined need of 6 oversells past zero).
    const mergedQtyById = new Map();
    for (const t of decrementTargets) {
      mergedQtyById.set(t.firestoreId, (mergedQtyById.get(t.firestoreId) || 0) + t.qty);
    }
    const consolidatedTargets = [...mergedQtyById.entries()].map(([firestoreId, qty]) => ({ firestoreId, qty }));

    const outOfStock = consolidatedTargets
      .filter(t => stockInfoById.get(t.firestoreId).stock < t.qty)
      .map(t => stockInfoById.get(t.firestoreId).name);

    if (outOfStock.length > 0) {
      res.status(409).json({
        ok: false,
        error: `Sorry, we don't have enough stock for: ${[...new Set(outOfStock)].join(', ')}.`,
      });
      return;
    }

    // Discount is never trusted at face value — it's clamped to the maximum any
    // legitimate mechanism (welcome popup: 5%, game + streak bonus: up to 15%) can
    // actually produce, so a tampered localStorage value can't buy more than that.
    const clampedDiscountPercent = Math.max(0, Math.min(MAX_DISCOUNT_PERCENT, parseInt(discountPercent, 10) || 0));
    const discountAmount = Math.floor(subtotal * clampedDiscountPercent / 100);

    // ── Delivery charge ──────────────────────────────────────────────────
    // The zone charge comes from the owner's configuration. Three things can
    // waive it, in this order:
    //   1. a free-delivery-above threshold the owner set in the admin panel
    //      (off by default — 0),
    //   2. a valid referral code (the existing "referral perk"),
    //   3. the buyer is a returning customer (the existing "loyalty perk").
    // A pickup order is free by definition, so none of this applies to it.
    let freeShippingReason = null;
    const eligibleAmount = subtotal - discountAmount;
    const freeAbove = Math.max(0, parseInt(settings.freeDeliveryAbove, 10) || 0);
    if (delivery.charge > 0 && freeAbove > 0 && eligibleAmount >= freeAbove) {
      freeShippingReason = 'amount';
    } else if (delivery.charge > 0 && referralCode) {
      const refSnap = await db.collection('referrals').where('code', '==', referralCode).limit(1).get();
      if (!refSnap.empty) freeShippingReason = 'referral';
    }
    if (!freeShippingReason && delivery.charge > 0 && isValidPhone(safeBuyer.phone)) {
      // Loyalty free-shipping is keyed on the BUYER's phone, never the
      // recipient's — a gift order shouldn't inherit (or leak) the recipient's
      // order history.
      const priorSnap = await db.collection('orders').where('customer.phone', '==', safeBuyer.phone).limit(1).get();
      if (!priorSnap.empty) freeShippingReason = 'loyalty';
    }
    const shipping = freeShippingReason ? 0 : delivery.charge;
    const grandTotal = subtotal - discountAmount + shipping;

    if (grandTotal < 1) {
      res.status(400).json({ ok: false, error: 'Order total is invalid.' });
      return;
    }

    // ── Save the checkout lead BEFORE the payment gateway opens ─────────
    // Everything the customer typed is captured here, so a checkout that is
    // abandoned, fails, or is closed halfway through still leaves us a lead
    // to follow up on. Nothing sensitive is stored — no card, no UPI PIN, no
    // CVV (Razorpay handles all of that and we never see it).
    const deliveryTarget = giftOrder ? safeRecipient : safeBuyer;
    let leadId = null;
    try {
      const lead = await upsertCheckoutLead(db, {
        checkoutSessionId: checkoutSessionId || null,
        orderType: resolvedOrderType,
        // Buyer
        customer: {
          name: `${safeBuyer.firstName} ${safeBuyer.lastName}`.trim(),
          email: safeBuyer.email,
          phone: safeBuyer.phone,
        },
        buyerAddress: {
          address: safeBuyer.address,
          city: safeBuyer.city,
          state: safeBuyer.state,
          pincode: safeBuyer.pincode,
        },
        // Recipient (gift orders only)
        recipient: giftOrder ? {
          name: safeRecipient.name,
          phone: safeRecipient.phone,
          address: safeRecipient.address,
          city: safeRecipient.city,
          state: safeRecipient.state,
          pincode: safeRecipient.pincode,
          landmark: safeRecipient.landmark,
        } : null,
        // Products
        items: resolvedItems.map(i => ({
          name: i.name,
          slug: i.slug || null,
          qty: i.qty,
          price: i.price,
          variant: i.variant || null,
          // A hamper's individual gifts, so a follow-up call knows what the
          // customer had chosen.
          components: i.components ? i.components.map(c => c.name) : null,
        })),
        itemCount: resolvedItems.reduce((n, i) => n + i.qty, 0),
        subtotal,
        discount: discountAmount,
        discountPercent: clampedDiscountPercent,
        // Delivery
        deliveryMethod: delivery.method,
        deliveryZoneId: delivery.zone.id,
        deliveryZoneName: delivery.zone.name,
        deliveryAreas: delivery.zone.areas,
        deliveryCharge: shipping,
        deliveryPincode: delivery.pincode,
        deliveryAddress: {
          address: deliveryTarget?.address || '',
          city: deliveryTarget?.city || '',
          state: deliveryTarget?.state || '',
          pincode: deliveryTarget?.pincode || '',
        },
        pickupLocation: delivery.method === DELIVERY_METHOD.PICKUP ? delivery.zone.location : '',
        pickupInstructions: delivery.method === DELIVERY_METHOD.PICKUP ? delivery.zone.instructions : '',
        // Gift
        isSurpriseGift: giftOrder && isSurpriseGift === true,
        hideSenderIdentity: giftOrder && isSurpriseGift === true && hideSenderIdentity === true,
        giftMessage: cleanMultiline(giftMessage, giftOrder ? MAX_GIFT_MESSAGE_LENGTH : MAX_SELF_GIFT_MESSAGE_LENGTH),
        // Money
        grandTotal,
        // Payment — not started yet
        paymentStatus: PAYMENT_STATUS.NOT_INITIATED,
        paymentId: null,
        razorpayOrderId: null,
        paymentFailureReason: null,
        // Checkout
        checkoutStatus: CHECKOUT_STATUS.STARTED,
        // Follow-up
        followUpStatus: FOLLOW_UP_STATUS.NOT_CONTACTED,
        followUpNotes: '',
        lastContactedAt: null,
        nextFollowUpAt: null,
        linkedOrderId: null,
      });
      leadId = lead.leadId;
    } catch (err) {
      // A lead we can't save must never block a customer from paying.
      console.error('Could not save the checkout lead:', err);
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: grandTotal * 100,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
      }),
    });
    const rzpOrder = await rzpRes.json();
    if (!rzpRes.ok || !rzpOrder.id) {
      console.error('Razorpay order creation failed:', rzpOrder);
      res.status(502).json({ ok: false, error: 'Unable to start payment right now. Please try again.' });
      return;
    }

    // Link the lead to the payment that is about to start.
    if (leadId) {
      try {
        await db.collection('checkoutLeads').doc(leadId).set({
          razorpayOrderId: rzpOrder.id,
          paymentStatus: PAYMENT_STATUS.PENDING,
          checkoutStatus: CHECKOUT_STATUS.PAYMENT_PENDING,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('Could not link the checkout lead to the payment:', err);
      }
    }

    // The only thing verify-payment.js will trust for pricing/stock is this document —
    // never anything the client sends after payment succeeds. The buyer and
    // recipient details are captured here too, so the copy that ends up in the
    // final order is the one the server validated when the order was created.
    await db.collection('pendingOrders').doc(rzpOrder.id).set({
      items: resolvedItems,
      decrementTargets: consolidatedTargets,
      subtotal,
      discountPercent: clampedDiscountPercent,
      discountAmount,
      shipping,
      freeShippingReason,
      referralCode: freeShippingReason === 'referral' ? referralCode : null,
      grandTotal,
      // The checkout lead this pending order belongs to. When the payment is
      // captured, the lead is converted and linked to the order in the same
      // transaction that creates the order.
      leadId,
      // ── Delivery (server-validated; the final order inherits this) ──
      deliveryMethod: delivery.method,
      deliveryZoneId: delivery.zone.id,
      deliveryZoneName: delivery.zone.name,
      deliveryAreas: delivery.zone.areas,
      deliveryPincode: delivery.pincode,
      pickupLocation: delivery.method === DELIVERY_METHOD.PICKUP ? delivery.zone.location : '',
      pickupInstructions: delivery.method === DELIVERY_METHOD.PICKUP ? delivery.zone.instructions : '',
      orderType: resolvedOrderType,
      buyer: safeBuyer,
      recipient: safeRecipient,
      isSurpriseGift: giftOrder && isSurpriseGift === true,
      // Hiding the sender's identity only makes sense for a surprise gift.
      hideSenderIdentity: giftOrder && isSurpriseGift === true && hideSenderIdentity === true,
      giftMessage: cleanMultiline(giftMessage, giftOrder ? MAX_GIFT_MESSAGE_LENGTH : MAX_SELF_GIFT_MESSAGE_LENGTH),
      preferredDeliveryDate: safeDeliveryDate,
      consumed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      ok: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: RAZORPAY_KEY_ID,
      // Lets the checkout page tell the customer honestly whether a buyer
      // confirmation email is actually going to be sent (see
      // EMAILJS_BUYER_TEMPLATE_ID in the README).
      buyerEmailEnabled: Boolean(process.env.EMAILJS_BUYER_TEMPLATE_ID),
      // The checkout lead — the admin can follow this up if the payment is
      // never completed.
      leadId,
      breakdown: {
        subtotal,
        discountAmount,
        discountPercent: clampedDiscountPercent,
        shipping,
        freeShippingReason,
        grandTotal,
        // The delivery decision the server made — the checkout shows these so
        // the customer sees exactly what they are paying for.
        deliveryMethod: delivery.method,
        deliveryZoneId: delivery.zone.id,
        deliveryZoneName: delivery.zone.name,
        deliveryCharge: shipping,
      },
    });
  } catch (err) {
    console.error('create-order failed:', err);
    res.status(500).json({ ok: false, error: 'Something went wrong starting your order. Please try again.' });
  }
}
