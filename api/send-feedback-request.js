import { getDb } from '../src/lib/server/orderCreation.js';
import { sendFeedbackRequest } from '../src/lib/server/emailService.js';
import { requireAdmin } from '../src/lib/server/adminAuth.js';
import { products as staticProducts } from '../src/data/products.js';
import { SITE } from '../src/data/site.js';

/**
 * Sends the feedback form to the buyer — AFTER the gift has been delivered.
 *
 * The admin panel calls this the moment an order is marked "delivered": the
 * customer gets an email with a link to the feedback form, with their order
 * and their gift already filled in, so all they have to do is tell us how the
 * product, the packaging and the delivery were.
 *
 * Rules:
 *  • the order must already be marked delivered — the form is about a gift the
 *    customer has actually received;
 *  • only the BUYER is ever emailed. The recipient of a surprise gift is
 *    never contacted, and never learns that a form exists;
 *  • the notification key is the order id, so it goes out exactly once — even
 *    if the status is changed twice, or the webhook fires again.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    res.status(401).json({ ok: false, error: 'Not authorised.' });
    return;
  }

  try {
    const { orderId } = req.body || {};
    if (!orderId) {
      res.status(400).json({ ok: false, error: 'Which order?' });
      return;
    }

    const db = getDb();
    const snap = await db.collection('orders').doc(String(orderId)).get();
    if (!snap.exists) {
      res.status(404).json({ ok: false, error: 'That order no longer exists.' });
      return;
    }

    const order = snap.data();

    if (order.status !== 'delivered') {
      res.status(409).json({
        ok: false,
        error: 'The feedback form goes out after the order is marked delivered.',
      });
      return;
    }

    const to = (order.customer?.email || '').trim();
    if (!to) {
      res.status(400).json({
        ok: false,
        error: 'This order has no email address — send the form by hand instead.',
      });
      return;
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const single = items.length === 1 ? items[0] : null;
    const productId = single?.slug
      ? (staticProducts.find(p => p.slug === single.slug)?.id ?? null)
      : null;

    // The link carries the order (and the gift, when there is just one), so
    // the form opens knowing what it is about.
    const feedbackUrl = new URL(`${SITE.url}/feedback`);
    feedbackUrl.searchParams.set('order', String(orderId));
    if (productId) feedbackUrl.searchParams.set('product', String(productId));
    if (single?.name) feedbackUrl.searchParams.set('name', single.name);

    const firstName = (order.customer?.name || '').trim().split(' ')[0] || '';

    const result = await sendFeedbackRequest(db, {
      to,
      name: firstName,
      orderId: String(orderId),
      productName: single?.name || '',
      productId,
      feedbackUrl: feedbackUrl.toString(),
    });

    if (result.sent) {
      res.status(200).json({ ok: true, sent: true, to });
      return;
    }
    res.status(200).json({
      ok: true,
      sent: false,
      skipped: Boolean(result.skipped),
      reason: result.reason || result.error || 'The email could not be sent.',
    });
  } catch (err) {
    console.error('send-feedback-request failed:', err);
    res.status(500).json({ ok: false, error: 'Could not send the feedback form.' });
  }
}
