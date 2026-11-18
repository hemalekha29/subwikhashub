import crypto from 'crypto';
import { getDb, createPaidOrder } from '../src/lib/server/orderCreation.js';
import { sendOrderNotifications } from './verify-payment.js';

/**
 * Razorpay webhook — the safety net for the order.
 *
 * The browser calls api/verify-payment.js after the payment modal closes, but
 * a customer can close the tab the instant they press Pay. When that happens
 * Razorpay has captured the money and nobody told us — until this webhook
 * arrives. It creates the order from the same pending order the browser would
 * have used, so the two paths produce identical results.
 *
 * Duplicate protection: api/verify-payment.js and this webhook both call
 * createPaidOrder(), which runs one Firestore transaction keyed on the pending
 * order's `consumed` flag. Whichever arrives first creates the order; the
 * other sees the flag and does nothing. No duplicate orders, no duplicate
 * stock decrements, no duplicate emails.
 *
 * To turn this on: in the Razorpay dashboard add a webhook for
 * `payment.captured` pointing at <your-domain>/api/razorpay-webhook, set a
 * secret, and add RAZORPAY_WEBHOOK_SECRET to the environment. Until that
 * secret is set this endpoint refuses to create anything.
 */

function rawBodyCandidates(req) {
  // Vercel parses the JSON body for us, so the exact bytes Razorpay signed
  // are not always available. We try the raw body first (some runtimes keep
  // it) and then the re-serialised JSON, which matches Razorpay's own
  // whitespace-free payload.
  const candidates = [];
  if (typeof req.body === 'string') candidates.push(req.body);
  if (req.rawBody) {
    candidates.push(Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : String(req.rawBody));
  }
  if (req.body && typeof req.body === 'object') candidates.push(JSON.stringify(req.body));
  return candidates;
}

function signatureMatches(candidates, signature, secret) {
  for (const body of candidates) {
    try {
      const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
      if (expected.length === signature.length
        && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
        return true;
      }
    } catch {
      // try the next candidate
    }
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Without the secret we cannot tell a real webhook from a forged one, so
    // we do nothing at all. The browser's verify-payment path still works.
    console.warn('razorpay-webhook: RAZORPAY_WEBHOOK_SECRET is not set — ignoring webhook.');
    res.status(503).json({ ok: false, error: 'Webhook not configured.' });
    return;
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    res.status(400).json({ ok: false, error: 'Missing signature.' });
    return;
  }
  if (!signatureMatches(rawBodyCandidates(req), signature, secret)) {
    res.status(400).json({ ok: false, error: 'Invalid signature.' });
    return;
  }

  const event = req.body?.event;
  const payment = req.body?.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  if (!event || !orderId || !paymentId) {
    // An event we don't act on (e.g. payment.failed, refund.created) — ack it
    // so Razorpay stops retrying.
    res.status(200).json({ ok: true, ignored: event || 'unknown' });
    return;
  }

  const isCaptured = event === 'payment.captured' || event === 'order.paid';
  if (!isCaptured) {
    res.status(200).json({ ok: true, ignored: event });
    return;
  }

  try {
    const db = getDb();
    const result = await createPaidOrder(db, {
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      photos: null, // the browser uploads these; the webhook has no way to know them
    });

    if (!result.alreadyProcessed) {
      await sendOrderNotifications({
        db,
        pending: result.pending,
        orderDetails: result.orderDetails,
        stockIssue: result.stockIssue,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
      });
    }

    res.status(200).json({ ok: true, orderId, alreadyProcessed: result.alreadyProcessed });
  } catch (err) {
    if (err.userMessage) {
      // The pending order is missing or incomplete — nothing we can create.
      console.error('razorpay-webhook: could not create the order:', err.userMessage);
      res.status(200).json({ ok: false, error: err.userMessage });
      return;
    }
    console.error('razorpay-webhook failed:', err);
    // A 500 makes Razorpay retry, which is what we want for a transient fault.
    res.status(500).json({ ok: false, error: 'Could not create the order.' });
  }
}
