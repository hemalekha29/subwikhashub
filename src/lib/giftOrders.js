// Shared constants + pure helpers for the Gift Order / Surprise Delivery feature.
//
// Imported by BOTH the browser (Checkout, OrderSuccess, admin panel) and the
// server (api/create-order.js, api/verify-payment.js), so both sides agree on
// what an order type is and on the privacy rules that go with it. Keep this file
// free of any browser-only or Node-only APIs.

export const ORDER_TYPE = {
  SELF: 'SELF_ORDER',
  GIFT: 'GIFT_ORDER',
};

// A gift message is printed on a small note that travels with the gift, so it has
// to stay short enough to look good on paper. Self orders keep the longer limit
// they have always had (the message is emailed to the shop, not printed).
export const MAX_GIFT_MESSAGE_LENGTH = 250;
export const MAX_SELF_GIFT_MESSAGE_LENGTH = 1000;

export const MAX_LANDMARK_LENGTH = 120;
export const MAX_NAME_LENGTH = 80;
export const MAX_ADDRESS_LENGTH = 400;

/**
 * Orders placed before the gift feature existed have no `orderType` field at all.
 * Normalising every read through this helper keeps those old records working
 * exactly as before — they are simply self orders.
 */
export function normalizeOrderType(value) {
  return value === ORDER_TYPE.GIFT ? ORDER_TYPE.GIFT : ORDER_TYPE.SELF;
}

export function isGiftOrder(order) {
  return normalizeOrderType(order?.orderType) === ORDER_TYPE.GIFT;
}

export function isSelfOrder(order) {
  return !isGiftOrder(order);
}

/** True only for gift orders that the buyer marked as a surprise. */
export function isSurpriseGiftOrder(order) {
  return isGiftOrder(order) && order?.isSurpriseGift === true;
}

/**
 * True when the buyer asked us to keep their identity hidden. Only meaningful
 * for a surprise gift — a non-surprise gift always reveals the sender.
 */
export function hidesSenderIdentity(order) {
  return isSurpriseGiftOrder(order) && order?.hideSenderIdentity === true;
}

/* ══════════════════════════════════════════════════════════════
   The gift-recipient table
   ══════════════════════════════════════════════════════════════
   A gift order has two people in it: the buyer (who pays, who we talk to —
   stored on the order as `customer`) and the recipient (where the parcel goes).
   The recipient's own details live in a separate collection so they stay
   separable from the order and payment data — they can be listed on their own,
   audited on their own, and erased on their own once the gift has been
   delivered, without touching the order record or the money.
   ══════════════════════════════════════════════════════════════════════ */

/** Firestore collection that holds the recipient record for every gift order. */
export const GIFT_RECIPIENTS_COLLECTION = 'giftRecipients';

/**
 * The recipient document id IS the order id, so joining an order to its
 * recipient record is a direct document read — no query, no index, no
 * ambiguity.
 */
export function giftRecipientId(orderId) {
  return orderId || '';
}

/**
 * The recipient's details have been erased from the store (after delivery),
 * leaving only the record that a gift was sent there.
 */
export function isRecipientPurged(recipient) {
  return Boolean(recipient?.purgedAt);
}

/** A recipient record that still holds usable contact details. */
export function hasRecipientContact(recipient) {
  return Boolean(recipient?.name || recipient?.phone || recipient?.address);
}

/**
 * Builds the gift-recipient record. The shape of the table is defined here, in
 * one place, so the server that writes it and the admin panel that reads it
 * can never drift apart.
 *
 * `createdAt` is passed in (the server passes a Firestore serverTimestamp()).
 * `deliveredAt` / `purgedAt` are the delivery lifecycle: the first is stamped
 * when the order is marked delivered, the second when the recipient's contact
 * details are erased.
 */
export function buildGiftRecipientRecord({ orderId, recipient, createdAt }) {
  return {
    orderId,
    name: recipient.name,
    phone: recipient.phone,
    address: recipient.address,
    city: recipient.city,
    state: recipient.state,
    pincode: recipient.pincode,
    landmark: recipient.landmark,
    createdAt,
    deliveredAt: null,
    purgedAt: null,
  };
}

/**
 * Recipient-facing delivery messages.
 *
 * These are deliberately neutral: no sender name, no order total, no product
 * names, no order id. A surprise gift must not be spoiled by the courier's
 * WhatsApp message, and a gift recipient has no business knowing what the
 * parcel cost. The wording is identical whether or not the sender's identity is
 * hidden — that way the courier never has to make a judgement call.
 */
export const RECIPIENT_DELIVERY_MESSAGES = {
  paid: "Hi! You have a special delivery arriving soon from Subwikha's Hub. 🎁",
  processing: "A special delivery for you is being handcrafted and will be on its way soon! 🎀",
  shipped: 'Good news — a special delivery is on its way to you! 🚚',
  delivered: 'Your special delivery has arrived. We hope it makes your day! ✨',
};

export function recipientDeliveryMessage(status) {
  return RECIPIENT_DELIVERY_MESSAGES[status] || 'You have a special delivery arriving soon! 🎁';
}

/** Formats a stored "YYYY-MM-DD" delivery preference for display. */
export function formatDeliveryDate(value) {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Today in local time as "YYYY-MM-DD" — used as the minimum for the date input. */
export function todayIsoDate() {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Trims + collapses whitespace and caps the length. Used for every user string. */
export function cleanText(value, maxLength = MAX_NAME_LENGTH) {
  return (value || '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Keeps newlines (a gift message is written as prose) but strips control chars. */
export function cleanMultiline(value, maxLength = MAX_GIFT_MESSAGE_LENGTH) {
  return (value || '')
    .toString()
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/** A delivery date is only accepted as a real, non-past calendar day. */
export function isValidDeliveryDate(value) {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  // Reject dates that JavaScript would silently roll over (e.g. 2026-02-31).
  if (d.getMonth() + 1 !== Number(value.slice(5, 7))) return false;
  if (d.getDate() !== Number(value.slice(8, 10))) return false;
  return d.getTime() >= new Date(`${todayIsoDate()}T00:00:00`).getTime();
}
