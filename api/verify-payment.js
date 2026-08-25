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
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      res.status(400).json({ ok: false, error: 'This order could not be found. Please contact us with your payment ID.' });
      return;
    }
    const pending = pendingSnap.data();
    if (pending.consumed) {
      // Already processed (e.g. a duplicate callback/retry) — return the existing
      // order instead of creating a second one for the same payment.
      const existing = await db.collection('orders').where('orderId', '==', razorpay_order_id).limit(1).get();
      res.status(200).json({ ok: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id, alreadyProcessed: true, grandTotal: existing.docs[0]?.data()?.grandTotal ?? pending.grandTotal });
      return;
    }

    // Stock is re-checked and decremented atomically here (not at create-order time)
    // to close the race window between two customers buying the last unit at once.
    // Payment has already been captured by Razorpay at this point, so an oversell is
    // recorded rather than silently dropped — the order is still created so the
    // money is accounted for, flagged for a human to resolve.
    let stockIssue = false;
    if (pending.decrementTargets?.length) {
      try {
        await db.runTransaction(async (tx) => {
          const refs = pending.decrementTargets.map(t => db.collection('products').doc(t.firestoreId));
          const snaps = await Promise.all(refs.map(r => tx.get(r)));
          snaps.forEach((snap, i) => {
            const need = pending.decrementTargets[i].qty;
            const have = snap.data()?.stock;
            if (typeof have === 'number' && have < need) throw new Error('INSUFFICIENT_STOCK');
          });
          snaps.forEach((snap, i) => {
            tx.update(refs[i], { stock: admin.firestore.FieldValue.increment(-pending.decrementTargets[i].qty) });
          });
        });
      } catch (err) {
        if (err.message === 'INSUFFICIENT_STOCK') stockIssue = true;
        else throw err;
      }
    }

    const orderData = {
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
    };

    await db.collection('orders').add(orderData);
    await pendingRef.update({ consumed: true });

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
