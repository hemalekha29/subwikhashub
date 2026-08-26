import crypto from 'crypto';
import admin from 'firebase-admin';
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../src/lib/emailjsConfig.js';

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
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
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      customer, giftMessage, photos,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ ok: false, error: 'Missing payment confirmation details.' });
      return;
    }

    // This is the actual security check: only Razorpay (who holds the matching secret)
    // could have produced a signature that verifies against these exact order/payment
    // ids. Nothing about "the browser said the payment succeeded" is trusted anywhere
    // in this file.
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const signatureValid =
      expectedSignature.length === razorpay_signature?.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!signatureValid) {
      res.status(400).json({ ok: false, error: 'Payment could not be verified. If you were charged, contact us with your payment ID.' });
      return;
    }

    if (!customer?.firstName || !customer?.lastName || !isValidEmail(customer?.email) || !isValidPhone(customer?.phone) || !customer?.address) {
      res.status(400).json({ ok: false, error: 'Delivery details are incomplete.' });
      return;
    }

    const db = getDb();
    const pendingRef = db.collection('pendingOrders').doc(razorpay_order_id);
    const orderRef = db.collection('orders').doc();

    // The whole consumed-check -> stock-check -> order-create -> consumed-flip sequence
    // runs as ONE transaction. Previously this was a plain read-then-branch outside any
    // transaction (only the stock decrement itself was atomic) — two near-simultaneous
    // calls for the same payment (a retried webhook + a client retry landing within the
    // same window) could both observe consumed:false before either wrote it, and both
    // create a separate order + double-decrement stock. A transaction makes Firestore
    // serialize these instead: the second one always sees the first one's write.
    let pending, stockIssue = false, alreadyProcessed = false, existingGrandTotal = null;
    try {
      await db.runTransaction(async (tx) => {
        const pendingSnap = await tx.get(pendingRef);
        if (!pendingSnap.exists) throw new Error('PENDING_NOT_FOUND');
        pending = pendingSnap.data();

        if (pending.consumed) {
          alreadyProcessed = true;
          existingGrandTotal = pending.grandTotal;
          return; // no writes — nothing left to do, already processed by an earlier call
        }

        // All reads must happen before any writes in a Firestore transaction.
        const targets = pending.decrementTargets || [];
        const refs = targets.map(t => db.collection('products').doc(t.firestoreId));
        const snaps = targets.length ? await Promise.all(refs.map(r => tx.get(r))) : [];
        snaps.forEach((snap, i) => {
          const have = snap.data()?.stock;
          if (typeof have === 'number' && have < targets[i].qty) stockIssue = true;
        });

        // Payment is already captured by Razorpay at this point, so an oversell is
        // recorded rather than silently dropped — the order is still created so the
        // money is accounted for, flagged for a human to resolve.
        snaps.forEach((snap, i) => {
          tx.update(refs[i], { stock: admin.firestore.FieldValue.increment(-targets[i].qty) });
        });

        tx.set(orderRef, {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
          },
          items: pending.items,
          subtotal: pending.subtotal,
          discount: pending.discountAmount,
          discountPercent: pending.discountPercent,
          shipping: pending.shipping,
          grandTotal: pending.grandTotal,
          giftMessage: (giftMessage || '').slice(0, 1000),
          photos: photos && typeof photos === 'object' ? photos : {},
          status: 'paid',
          stockIssue,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(pendingRef, { consumed: true });
      });
    } catch (err) {
      if (err.message === 'PENDING_NOT_FOUND') {
        res.status(400).json({ ok: false, error: 'This order could not be found. Please contact us with your payment ID.' });
        return;
      }
      throw err;
    }

    if (alreadyProcessed) {
      res.status(200).json({ ok: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id, alreadyProcessed: true, grandTotal: existingGrandTotal });
      return;
    }

    if (pending.referralCode) {
      const refSnap = await db.collection('referrals').where('code', '==', pending.referralCode).limit(1).get();
      if (!refSnap.empty) await refSnap.docs[0].ref.update({ uses: admin.firestore.FieldValue.increment(1) });
    }

    try {
      const itemsList = pending.items.map(i => `${i.name}${i.variant ? ` (${i.variant})` : ''} × ${i.qty} = ₹${i.price * i.qty}`).join('\n');
      const photoSection = photos && Object.entries(photos).length > 0
        ? '\n\n━━━ CUSTOMER PHOTOS ━━━\n' + Object.entries(photos).map(([name, urls]) => `📎 ${name}:\n${(urls || []).join('\n')}`).join('\n\n')
        : '';
      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            name: 'Order Alert',
            email: 'enistechteam@gmail.com',
            subject: `New Order ${razorpay_order_id}: ₹${pending.grandTotal}${stockIssue ? ' ⚠ STOCK ISSUE' : ''}`,
            message: `New order received!\n\nOrder ID: ${razorpay_order_id}\nPayment ID: ${razorpay_payment_id}\n${stockIssue ? '\n⚠ One or more items may be oversold — check stock before confirming.\n' : ''}\nCustomer: ${customer.firstName} ${customer.lastName}\nEmail: ${customer.email}\nPhone: ${customer.phone}\nAddress: ${customer.address}\n\nItems:\n${itemsList}\n\nSubtotal: ₹${pending.subtotal}\nDiscount: ₹${pending.discountAmount}\nShipping: ₹${pending.shipping}\nTotal: ₹${pending.grandTotal}\n\nGift Message: ${giftMessage || 'None'}${photoSection}`,
          },
        }),
      });
    } catch (err) {
      console.error('Order email notification failed:', err);
    }

    res.status(200).json({ ok: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id, grandTotal: pending.grandTotal });
  } catch (err) {
    console.error('verify-payment failed:', err);
    res.status(500).json({ ok: false, error: 'Payment succeeded but we hit an error saving your order. Please contact us with your payment ID.' });
  }
}
