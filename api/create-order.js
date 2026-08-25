import admin from 'firebase-admin';
import { products as staticProducts } from '../src/data/products.js';
import { RAZORPAY_KEY_ID } from '../src/lib/razorpayConfig.js';

const BUNDLE_DISCOUNT = 0.1; // must match src/pages/Hamper/HamperBuilder.jsx
const MAX_DISCOUNT_PERCENT = 15; // must match the ceiling in src/pages/Game/Game.jsx (finalPercent capped at 15)
const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_FEE = 80;
const MAX_ITEMS = 30;
const MAX_QTY_PER_ITEM = 20;

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
  // Same precedence rule as src/hooks/useAllProducts.js: Firestore products win over
  // the static catalog by slug, so price checks here can never disagree with what a
  // shopper actually saw on the site.
  return [...fsProducts, ...staticProducts.filter(sp => !fsProducts.find(fp => fp.slug === sp.slug))];
}

function resolveUnitPrice(product, variantLabel) {
  if (product.priceVariants?.length) {
    const match = product.priceVariants.find(v => v.label === variantLabel);
    return (match || product.priceVariants[0]).price;
  }
  return product.price;
}

function isValidPhone(phone) {
  return /^\d{10}$/.test((phone || '').trim());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { items, phone, referralCode, discountPercent } = req.body || {};

    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
      res.status(400).json({ ok: false, error: 'Your cart looks invalid. Please refresh and try again.' });
      return;
    }

    const db = getDb();
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

    let freeShippingReason = null;
    if (subtotal - discountAmount >= FREE_SHIPPING_THRESHOLD) {
      freeShippingReason = 'amount';
    } else if (referralCode) {
      const refSnap = await db.collection('referrals').where('code', '==', referralCode).limit(1).get();
      if (!refSnap.empty) freeShippingReason = 'referral';
    }
    if (!freeShippingReason && isValidPhone(phone)) {
      const priorSnap = await db.collection('orders').where('customer.phone', '==', phone.trim()).limit(1).get();
      if (!priorSnap.empty) freeShippingReason = 'loyalty';
    }
    const shipping = freeShippingReason ? 0 : SHIPPING_FEE;
    const grandTotal = subtotal - discountAmount + shipping;

    if (grandTotal < 1) {
      res.status(400).json({ ok: false, error: 'Order total is invalid.' });
      return;
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

    // The only thing verify-payment.js will trust for pricing/stock is this document —
    // never anything the client sends after payment succeeds.
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
      consumed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      ok: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: RAZORPAY_KEY_ID,
      breakdown: { subtotal, discountAmount, discountPercent: clampedDiscountPercent, shipping, freeShippingReason, grandTotal },
    });
  } catch (err) {
    console.error('create-order failed:', err);
    res.status(500).json({ ok: false, error: 'Something went wrong starting your order. Please try again.' });
  }
}
