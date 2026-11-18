import { getDb } from '../src/lib/server/orderCreation.js';
import { sweepCheckoutLeads } from '../src/lib/server/leads.js';
import { sendNotification, resolveEmailSettings } from '../src/lib/server/emailService.js';
import { renderLeadsSummaryEmail } from '../src/lib/server/emailTemplates.js';
import { NOTIFICATION_TYPE } from '../src/lib/emailConfig.js';
import { CHECKOUT_STATUS, PAYMENT_STATUS } from '../src/lib/checkoutLeads.js';
import { SITE } from '../src/data/site.js';
import {
  CHECKOUT_SETTINGS_COLLECTION,
  CHECKOUT_SETTINGS_DOC,
  DEFAULT_LEAD_SETTINGS,
} from '../src/lib/checkoutLeads.js';

/**
 * The checkout-lead housekeeping job (Vercel cron).
 *
 * 1. Marks checkouts that have sat untouched for longer than the configured
 *    inactivity window as ABANDONED — and only those. A payment that is
 *    simply still pending is never called abandoned.
 * 2. Deletes the details of leads that never converted once they are older
 *    than the retention window, so a customer's details aren't kept forever.
 * 3. Sends the daily summary of abandoned checkouts (optional — switchable in
 *    the email settings), so the shop knows who to follow up with.
 *
 * Both the inactivity window and the retention period are configurable in the
 * admin panel (/admin/leads).
 */
export default async function handler(req, res) {
  try {
    const db = getDb();

    let settings = { ...DEFAULT_LEAD_SETTINGS };
    try {
      const snap = await db.collection(CHECKOUT_SETTINGS_COLLECTION).doc(CHECKOUT_SETTINGS_DOC).get();
      if (snap.exists()) settings = { ...DEFAULT_LEAD_SETTINGS, ...snap.data() };
    } catch (err) {
      console.error('Could not read the lead settings:', err);
    }

    const summary = await sweepCheckoutLeads(db, settings);
    console.log('Lead sweep:', summary);

    // ── The daily abandoned-checkout summary ────────────────────────────
    // The key includes the date, so one summary goes out per day however
    // often the cron runs.
    try {
      const emailSettings = await resolveEmailSettings(db);
      if (emailSettings.abandonedSummaryEnabled && emailSettings.adminEmail) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const snap = await db.collection('checkoutLeads')
          .where('checkoutStatus', '==', CHECKOUT_STATUS.ABANDONED)
          .limit(100)
          .get();
        const leads = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(l => {
            const at = l.updatedAt?.toDate?.() || l.createdAt?.toDate?.();
            return at && at >= since && l.paymentStatus !== PAYMENT_STATUS.SUCCESS;
          })
          .map(l => ({
            leadId: l.leadId || l.id,
            name: l.customer?.name || '—',
            phone: l.customer?.phone || '',
            value: Number(l.grandTotal) || 0,
          }));

        if (leads.length > 0) {
          const date = new Date().toISOString().slice(0, 10);
          const email = renderLeadsSummaryEmail({
            date,
            leads,
            totalValue: leads.reduce((s, l) => s + l.value, 0),
            window: '24 hours',
          }, { adminUrl: `${SITE.url}/admin/leads` });
          await sendNotification(db, {
            key: `leads_summary_${date}`,
            type: NOTIFICATION_TYPE.LEADS_ABANDONED_SUMMARY,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
        }
      }
    } catch (err) {
      // A summary problem must never fail the sweep.
      console.error('Could not send the abandoned-checkout summary:', err);
    }

    res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error('sweep-leads failed:', err);
    res.status(500).json({ ok: false, error: 'Sweep failed.' });
  }
}
