import crypto from 'crypto';
import admin from 'firebase-admin';
import { ORDER_TYPE } from '../src/lib/giftOrders.js';
import { getDb, createPaidOrder } from '../src/lib/server/orderCreation.js';
import { sendNotification, sendCustomerEmail } from '../src/lib/server/emailService.js';
import { renderOrderEmail } from '../src/lib/server/emailTemplates.js';
import { NOTIFICATION_TYPE } from '../src/lib/emailConfig.js';
import { SITE } from '../src/data/site.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature, photos,
      customer, recipient,
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

    const db = getDb();

    // The order itself is created from the PENDING order — the copy the server
    // validated when the customer pressed Pay. Nothing the browser sends here
    // is trusted for anything except the photos it uploaded to Cloudinary.
    const result = await createPaidOrder(db, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      photos,
      // Only used for pending orders created before the server began capturing
      // the buyer's details itself (i.e. a checkout started before a deploy).
      fallbackCustomer: customer,
      fallbackRecipient: recipient,
    });

    if (result.alreadyProcessed) {
      // The webhook (or an earlier call) already created this order. Do nothing
      // again — no duplicate order, no duplicate stock decrement, and no
      // duplicate email: the notification key is the order id.
      res.status(200).json({
        ok: true,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        alreadyProcessed: true,
        grandTotal: result.existingGrandTotal,
      });
      return;
    }

    const { pending, orderDetails, stockIssue } = result;

    if (pending.referralCode) {
      const refSnap = await db.collection('referrals').where('code', '==', pending.referralCode).limit(1).get();
      if (!refSnap.empty) await refSnap.docs[0].ref.update({ uses: admin.firestore.FieldValue.increment(1) });
    }

    // Notifications never block or break a paid order: the order is already
    // written, and every email problem is caught and logged.
    await sendOrderNotifications({
      db,
      pending,
      orderDetails,
      stockIssue,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    res.status(200).json({ ok: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id, grandTotal: pending.grandTotal });
  } catch (err) {
    if (err.userMessage) {
      res.status(400).json({ ok: false, error: err.userMessage });
      return;
    }
    console.error('verify-payment failed:', err);
    res.status(500).json({ ok: false, error: 'Payment succeeded but we hit an error saving your order. Please contact us with your payment ID.' });
  }
}

/**
 * The order notifications.
 *
 * Two, and only two, people can ever receive them:
 *   - the shop (the admin notification, with everything), and
 *   - the BUYER (their own confirmation, never the recipient of a gift).
 *
 * The admin notification's key is the order id, so a webhook that fires twice
 * still produces exactly one email.
 */
export async function sendOrderNotifications({
  db, pending, orderDetails, stockIssue, razorpayOrderId, razorpayPaymentId,
}) {
  const isGift = orderDetails?.orderType === ORDER_TYPE.GIFT;
  const adminUrl = `${SITE.url}/admin/orders/${razorpayOrderId}`;

  const email = renderOrderEmail({
    orderId: razorpayOrderId,
    createdAt: new Date().toLocaleString('en-IN', {
      dateStyle: 'medium', timeStyle: 'short',
    }),
    customer: {
      name: orderDetails?.buyer
        ? `${orderDetails.buyer.firstName} ${orderDetails.buyer.lastName}`.trim()
        : '',
      phone: orderDetails?.buyer?.phone,
      email: orderDetails?.buyer?.email,
      address: orderDetails?.addressLine,
    },
    items: pending.items,
    subtotal: pending.subtotal,
    discount: pending.discountAmount,
    deliveryCharge: pending.shipping,
    grandTotal: pending.grandTotal,
    paymentId: razorpayPaymentId,
    paymentStatus: stockIssue ? 'Paid (⚠ stock issue — please check)' : 'Paid',
    deliveryMethod: pending.deliveryMethod,
    deliveryZoneName: pending.deliveryZoneName,
    deliveryPincode: pending.deliveryPincode,
    pickupLocation: pending.pickupLocation,
    orderType: orderDetails?.orderType,
    isSurpriseGift: orderDetails?.isSurpriseGift,
    hideSenderIdentity: orderDetails?.hideSenderIdentity,
    giftMessage: orderDetails?.giftMessage,
    recipient: isGift ? {
      name: orderDetails.recipient.name,
      phone: orderDetails.recipient.phone,
      address: [
        orderDetails.recipient.address,
        orderDetails.recipient.city,
        orderDetails.recipient.state,
        orderDetails.recipient.pincode,
      ].filter(Boolean).join(', '),
    } : null,
  }, { adminUrl });

  await sendNotification(db, {
    // The idempotency key: one notification per order, however many times
    // the webhook fires.
    key: `order_${razorpayOrderId}`,
    type: NOTIFICATION_TYPE.ORDER_CONFIRMED,
    subject: email.subject,
    html: email.html,
    text: email.text,
    orderId: razorpayOrderId,
  });

  // The buyer only. The recipient is never emailed.
  if (orderDetails?.buyer?.email) {
    const giftLine = isGift
      ? `\n\n🎁 This is a GIFT order.\nDelivering to: ${orderDetails.recipient.name}${orderDetails.recipient.city ? `, ${orderDetails.recipient.city}` : ''}\nSurprise gift: ${orderDetails.isSurpriseGift ? 'Yes — we will not reveal your name' : 'No'}\nPreferred delivery date: ${orderDetails.preferredDeliveryDate || 'As soon as possible'}\n\nYour gift message:\n"${orderDetails.giftMessage || '—'}"`
      : `\n\n${pending.deliveryMethod === 'PICKUP' ? 'Collection from our studio' : `Delivering to:\n${orderDetails.addressLine || ''}`}`;

    await sendCustomerEmail(db, {
      to: orderDetails.buyer.email,
      name: orderDetails.buyer.firstName,
      subject: `Your Subwikha's Hub order is confirmed 🎁 (${razorpayOrderId})`,
      message: `Hi ${orderDetails.buyer.firstName},\n\nThank you for your order! We've received it and our team is already getting it ready.\n\n`
        + `Order ID: ${razorpayOrderId}\n`
        + pending.items.map(i => `• ${i.name}${i.variant ? ` (${i.variant})` : ''} × ${i.qty} — ₹${i.price * i.qty}`).join('\n')
        + `\n\nSubtotal: ₹${pending.subtotal}\nDiscount: ₹${pending.discountAmount}\n`
        + `Delivery Charge: ${pending.shipping === 0 ? 'Free' : `₹${pending.shipping}`}\nTotal paid: ₹${pending.grandTotal}${giftLine}\n\n`
        + `We'll keep you posted on WhatsApp${orderDetails.buyer.email ? ' and email' : ''} as it moves along.\n\n`
        + `With love,\nSubwikha's Hub — Where Memories Become Gifts`,
    });

    // ── The feedback form ────────────────────────────────────────────────
    // NOT sent here: the customer is asked how the product, the packaging and
    // the delivery were only AFTER the gift has reached them. The admin panel
    // sends it the moment the order is marked delivered
    // (see api/send-feedback-request.js).
  }
}
