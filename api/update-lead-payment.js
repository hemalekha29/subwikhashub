import { getDb } from '../src/lib/server/orderCreation.js';
import { markLeadPaymentStatus } from '../src/lib/server/leads.js';
import { sendNotification, resolveEmailSettings } from '../src/lib/server/emailService.js';
import { renderPaymentFailedEmail } from '../src/lib/server/emailTemplates.js';
import { PAYMENT_STATUS } from '../src/lib/checkoutLeads.js';
import { NOTIFICATION_TYPE } from '../src/lib/emailConfig.js';
import { SITE } from '../src/data/site.js';

/**
 * Records the outcome of a payment the customer abandoned.
 *
 * The browser tells us when Razorpay reports a failure or when the customer
 * closes the payment window, so the lead shows the truth in the admin panel
 * instead of sitting on "payment pending" forever.
 *
 * This can only move a lead to FAILED or CANCELLED — it can never mark a
 * payment as successful. Only the verified payment callback and the
 * Razorpay webhook can do that.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { razorpayOrderId, status, reason } = req.body || {};
    const allowed = [PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED];
    if (!razorpayOrderId || !allowed.includes(status)) {
      res.status(400).json({ ok: false, error: 'Invalid request.' });
      return;
    }

    const db = getDb();
    const result = await markLeadPaymentStatus(db, {
      razorpayOrderId: String(razorpayOrderId).slice(0, 100),
      status,
      reason,
    });

    // Optional admin notification for a failed payment. Off by default — a
    // payment failing is not usually news, but the shop can turn it on.
    if (result.ok && !result.alreadySucceeded) {
      try {
        const settings = await resolveEmailSettings(db);
        if (settings.paymentFailureNotificationsEnabled && settings.adminEmail) {
          const email = renderPaymentFailedEmail({
            orderId: razorpayOrderId,
            status,
            reason,
            customer: result.customer || {},
          }, { adminUrl: `${SITE.url}/admin/leads` });
          await sendNotification(db, {
            key: `payfail_${razorpayOrderId}`,
            type: NOTIFICATION_TYPE.PAYMENT_FAILED,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
        }
      } catch (err) {
        // A notification problem must never affect the checkout.
        console.error('Could not send the payment-failed notification:', err);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('update-lead-payment failed:', err);
    res.status(500).json({ ok: false, error: 'Could not record the payment status.' });
  }
}
