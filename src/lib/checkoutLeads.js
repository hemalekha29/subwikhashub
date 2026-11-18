// Shared model for checkout leads — the records we keep of customers who
// filled in the checkout but never paid.
//
// Imported by the server (api/create-order.js, api/verify-payment.js) and by
// the admin panel, so the statuses and the follow-up rules are defined once.

/** Firestore collection holding one document per checkout lead. */
export const CHECKOUT_LEADS_COLLECTION = 'checkoutLeads';

/** Firestore collection holding the single checkout-leads settings document. */
export const CHECKOUT_SETTINGS_COLLECTION = 'checkoutSettings';
export const CHECKOUT_SETTINGS_DOC = 'main';

/** How far the payment got. Only the server may write this. */
export const PAYMENT_STATUS = {
  NOT_INITIATED: 'NOT_INITIATED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  SUCCESS: 'SUCCESS',
  CANCELLED: 'CANCELLED',
};

/** How far the checkout itself got. */
export const CHECKOUT_STATUS = {
  STARTED: 'CHECKOUT_STARTED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  ABANDONED: 'ABANDONED',
  COMPLETED: 'COMPLETED',
};

/** Where the lead is in the follow-up workflow. The admin panel owns this. */
export const FOLLOW_UP_STATUS = {
  NOT_CONTACTED: 'NOT_CONTACTED',
  CONTACTED: 'CONTACTED',
  FOLLOW_UP_REQUIRED: 'FOLLOW_UP_REQUIRED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
};

export const PAYMENT_STATUS_LABELS = {
  NOT_INITIATED: 'Not initiated',
  PENDING: 'Payment pending',
  FAILED: 'Payment failed',
  SUCCESS: 'Paid',
  CANCELLED: 'Cancelled',
};

export const CHECKOUT_STATUS_LABELS = {
  CHECKOUT_STARTED: 'Checkout started',
  PAYMENT_PENDING: 'Payment pending',
  ABANDONED: 'Abandoned',
  COMPLETED: 'Completed',
};

export const FOLLOW_UP_STATUS_LABELS = {
  NOT_CONTACTED: 'Not contacted',
  CONTACTED: 'Contacted',
  FOLLOW_UP_REQUIRED: 'Follow-up required',
  CONVERTED: 'Converted',
  LOST: 'Lost',
};

/**
 * The admin-configurable settings for lead handling.
 *
 * `inactivityMinutes` — how long a checkout can sit without completing before
 * it counts as abandoned. Deliberately generous: a payment can sit open in the
 * Razorpay window for a while, and marking a live payment "abandoned" would be
 * wrong. Nothing is marked abandoned purely because payment is pending.
 *
 * `retentionDays` — how long we keep a lead that never converted. After this
 * the cleanup job deletes it. Set to 0 to keep leads forever.
 */
export const DEFAULT_LEAD_SETTINGS = {
  inactivityMinutes: 180,
  retentionDays: 90,
};

/** A lead that hasn't converted and hasn't been written off. */
export function isOpenLead(lead) {
  if (!lead) return false;
  if (lead.paymentStatus === PAYMENT_STATUS.SUCCESS) return false;
  return lead.followUpStatus !== FOLLOW_UP_STATUS.LOST;
}

/** The revenue a lead is worth if it converts — what it was about to spend. */
export function leadValue(lead) {
  return Math.max(0, Number(lead?.grandTotal) || 0);
}

/**
 * The status the admin panel shows for a lead.
 *
 * A lead is only "abandoned" once it has been sitting untouched for longer
 * than the configured inactivity window — never just because a payment is
 * pending, which is what a customer sitting in the Razorpay window looks like.
 */
export function effectiveCheckoutStatus(lead, settings = DEFAULT_LEAD_SETTINGS) {
  if (!lead) return CHECKOUT_STATUS.STARTED;
  if (lead.paymentStatus === PAYMENT_STATUS.SUCCESS || lead.checkoutStatus === CHECKOUT_STATUS.COMPLETED) {
    return CHECKOUT_STATUS.COMPLETED;
  }
  const inactivityMinutes = Math.max(1, Number(settings?.inactivityMinutes) || DEFAULT_LEAD_SETTINGS.inactivityMinutes);
  const lastActivity = lead.lastActivityAt?.toDate?.() || lead.updatedAt?.toDate?.() || lead.createdAt?.toDate?.();
  if (lastActivity && Date.now() - lastActivity.getTime() > inactivityMinutes * 60000) {
    return CHECKOUT_STATUS.ABANDONED;
  }
  return lead.checkoutStatus || CHECKOUT_STATUS.PAYMENT_PENDING;
}

/** "3h ago", "2 days ago" — how long ago the customer last did something. */
export function timeAgo(ts) {
  const date = ts?.toDate?.() || (ts ? new Date(ts) : null);
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * The prefilled WhatsApp message for a follow-up.
 *
 * Nothing is sent automatically — the admin presses the button, edits the
 * message if they want, and sends it themselves. The message never mentions
 * the amount or the recipient of a surprise gift.
 */
export function followUpMessage(lead) {
  const name = (lead?.customer?.name || '').trim().split(' ')[0] || 'there';
  return `Hi ${name} 😊 You were checking out some lovely gifts from Subwikha's Hub. `
    + `We noticed your order wasn't completed. If you need any help with your order or payment, `
    + `feel free to reply here. We'd be happy to help! 💝`;
}
