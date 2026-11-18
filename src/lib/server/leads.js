// Server-only helpers for checkout leads — the records of customers who
// started a checkout but never paid.
//
// A lead is created BEFORE the payment gateway is opened, so the details
// survive whatever happens next: the customer closing the tab, the payment
// failing, or simply running out of time.
import admin from 'firebase-admin';
import {
  CHECKOUT_LEADS_COLLECTION,
  CHECKOUT_STATUS,
  DEFAULT_LEAD_SETTINGS,
  FOLLOW_UP_STATUS,
  PAYMENT_STATUS,
} from '../checkoutLeads.js';

// No I/O/0/1 — these codes get read out over the phone to customers.
const LEAD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A short, readable, unique lead reference — e.g. "SUB-K7M2QX". */
export function generateLeadId() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += LEAD_ALPHABET[Math.floor(Math.random() * LEAD_ALPHABET.length)];
  }
  return `SUB-${code}`;
}

/**
 * Creates the checkout lead, or updates the existing one for this checkout
 * session.
 *
 * The session id lets a customer who abandons a checkout and comes back
 * later update their existing lead instead of littering the table with
 * near-duplicates. A lead that already converted is never reused.
 */
export async function upsertCheckoutLead(db, details) {
  const sessionId = details.checkoutSessionId || null;
  let existing = null;

  if (sessionId) {
    const snap = await db.collection(CHECKOUT_LEADS_COLLECTION)
      .where('checkoutSessionId', '==', sessionId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      if (doc.data().paymentStatus !== PAYMENT_STATUS.SUCCESS) existing = doc;
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    ...details,
    updatedAt: now,
    lastActivityAt: now,
  };
  delete payload.checkoutSessionId;
  delete payload.leadId;

  if (existing) {
    await existing.ref.set(payload, { merge: true });
    return { leadId: existing.id, created: false };
  }

  // A fresh reference — retry on the (very unlikely) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const leadId = generateLeadId();
    const ref = db.collection(CHECKOUT_LEADS_COLLECTION).doc(leadId);
    const snap = await ref.get();
    if (snap.exists) continue;
    await ref.set({
      leadId,
      checkoutSessionId: sessionId,
      createdAt: now,
      ...payload,
    });
    return { leadId, created: true };
  }
  throw new Error('Could not allocate a lead id');
}

/**
 * Records what the payment gateway told us about a lead — the browser reports
 * a failed or cancelled payment so the admin can see it.
 *
 * A lead that already succeeded is never downgraded.
 */
export async function markLeadPaymentStatus(db, { razorpayOrderId, status, reason }) {
  if (!razorpayOrderId) return { ok: false };
  const snap = await db.collection(CHECKOUT_LEADS_COLLECTION)
    .where('razorpayOrderId', '==', razorpayOrderId)
    .limit(1)
    .get();
  if (snap.empty) return { ok: false };

  const doc = snap.docs[0];
  const lead = doc.data();
  if (lead.paymentStatus === PAYMENT_STATUS.SUCCESS) {
    return { ok: true, alreadySucceeded: true };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await doc.ref.set({
    paymentStatus: status,
    paymentFailureReason: reason ? String(reason).slice(0, 300) : null,
    // A failed or cancelled payment still leaves a checkout worth following
    // up on — it is never "completed", and it is never marked abandoned here
    // (that is the inactivity timer's job).
    checkoutStatus: CHECKOUT_STATUS.PAYMENT_PENDING,
    updatedAt: now,
    lastActivityAt: now,
  }, { merge: true });

  // The customer's details, so a failure notification can name them.
  return { ok: true, leadId: doc.id, customer: lead.customer || {} };
}

/**
 * The cleanup job.
 *
 * Two jobs in one pass:
 *   1. mark checkouts that have sat untouched for longer than the configured
 *      inactivity window as ABANDONED — and only those, never a payment that
 *      is simply still pending,
 *   2. delete leads that never converted and are older than the retention
 *      window, so we don't keep a customer's details forever.
 *
 * Returns a summary of what it did.
 */
export async function sweepCheckoutLeads(db, settings = DEFAULT_LEAD_SETTINGS) {
  const inactivityMs = Math.max(1, Number(settings.inactivityMinutes) || DEFAULT_LEAD_SETTINGS.inactivityMinutes) * 60000;
  const retentionDays = Math.max(0, Number(settings.retentionDays) || 0);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const summary = { markedAbandoned: 0, purged: 0, scanned: 0 };

  // 1. Abandoned checkouts — only those that have been quiet long enough.
  try {
    const snap = await db.collection(CHECKOUT_LEADS_COLLECTION)
      .where('checkoutStatus', 'in', [CHECKOUT_STATUS.STARTED, CHECKOUT_STATUS.PAYMENT_PENDING])
      .limit(300)
      .get();

    for (const doc of snap.docs) {
      summary.scanned += 1;
      const lead = doc.data();
      if (lead.paymentStatus === PAYMENT_STATUS.SUCCESS) continue;
      const last = lead.lastActivityAt?.toDate?.() || lead.updatedAt?.toDate?.() || lead.createdAt?.toDate?.();
      if (!last || Date.now() - last.getTime() < inactivityMs) continue;
      await doc.ref.set({
        checkoutStatus: CHECKOUT_STATUS.ABANDONED,
        // A checkout nobody paid for is exactly the one worth a phone call.
        followUpStatus: lead.followUpStatus === FOLLOW_UP_STATUS.NOT_CONTACTED
          ? FOLLOW_UP_STATUS.FOLLOW_UP_REQUIRED
          : lead.followUpStatus,
        updatedAt: now,
      }, { merge: true });
      summary.markedAbandoned += 1;
    }
  } catch (err) {
    console.error('Lead sweep: could not mark abandoned checkouts:', err);
  }

  // 2. Retention — drop the details of leads that never converted.
  if (retentionDays > 0) {
    try {
      const cutoff = new Date(Date.now() - retentionDays * 86400000);
      const snap = await db.collection(CHECKOUT_LEADS_COLLECTION)
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(cutoff))
        .limit(300)
        .get();
      for (const doc of snap.docs) {
        const lead = doc.data();
        if (lead.paymentStatus === PAYMENT_STATUS.SUCCESS) continue; // a real order — keep it
        if (lead.followUpStatus === FOLLOW_UP_STATUS.FOLLOW_UP_REQUIRED) continue; // still being worked
        await doc.ref.delete();
        summary.purged += 1;
      }
    } catch (err) {
      console.error('Lead sweep: could not purge old leads:', err);
    }
  }

  return summary;
}
