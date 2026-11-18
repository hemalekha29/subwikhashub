// Server-only helpers shared by the order-creation endpoints.
//
// Lives in src/lib/server/ rather than api/ so it is never turned into a
// serverless function of its own, and is only ever pulled into the client
// bundle if some client file imports it — none do.
//
// The order creation lives here (rather than inside api/verify-payment.js) so
// that BOTH the browser's payment callback and the Razorpay webhook can run
// exactly the same code. That matters: if a customer closes the browser right
// after paying, the webhook is what saves the order — and both paths must
// produce the same order, exactly once.
import admin from 'firebase-admin';
import {
  ORDER_TYPE,
  normalizeOrderType,
  cleanText,
  cleanMultiline,
  isValidDeliveryDate,
  giftRecipientId,
  buildGiftRecipientRecord,
  GIFT_RECIPIENTS_COLLECTION,
  MAX_GIFT_MESSAGE_LENGTH,
  MAX_SELF_GIFT_MESSAGE_LENGTH,
  MAX_LANDMARK_LENGTH,
  MAX_NAME_LENGTH,
  MAX_ADDRESS_LENGTH,
} from '../giftOrders.js';
import { DELIVERY_METHOD } from '../delivery.js';
import { CHECKOUT_LEADS_COLLECTION, PAYMENT_STATUS, CHECKOUT_STATUS, FOLLOW_UP_STATUS } from '../checkoutLeads.js';

export function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}
export function isValidPhone(phone) {
  return /^\d{10}$/.test((phone || '').trim());
}
export function isValidPincode(pincode) {
  return /^\d{6}$/.test((pincode || '').trim());
}

export function sanitizeBuyer(buyer) {
  return {
    firstName: cleanText(buyer?.firstName, MAX_NAME_LENGTH),
    lastName: cleanText(buyer?.lastName, MAX_NAME_LENGTH),
    email: cleanText(buyer?.email, MAX_NAME_LENGTH),
    phone: cleanText(buyer?.phone, 20),
    address: cleanText(buyer?.address, MAX_ADDRESS_LENGTH),
    city: cleanText(buyer?.city, MAX_NAME_LENGTH),
    state: cleanText(buyer?.state, MAX_NAME_LENGTH),
    pincode: cleanText(buyer?.pincode, 10),
  };
}

export function sanitizeRecipient(recipient) {
  return {
    name: cleanText(recipient?.name, MAX_NAME_LENGTH),
    phone: cleanText(recipient?.phone, 20),
    address: cleanText(recipient?.address, MAX_ADDRESS_LENGTH),
    city: cleanText(recipient?.city, MAX_NAME_LENGTH),
    state: cleanText(recipient?.state, MAX_NAME_LENGTH),
    pincode: cleanText(recipient?.pincode, 10),
    landmark: cleanText(recipient?.landmark, MAX_LANDMARK_LENGTH),
  };
}

/** "12 Main St, Coimbatore, Tamil Nadu - 641029" — the one-line address we store and show. */
export function formatAddressLine(parts) {
  if (!parts?.address) return '';
  const tail = [parts.city, parts.state].filter(Boolean).join(', ');
  return tail ? `${parts.address}, ${tail} - ${parts.pincode}` : `${parts.address} - ${parts.pincode}`;
}

/**
 * The delivery details of a gift order must be complete before we take the
 * money — a parcel that can't be addressed is a parcel that can't be sent.
 *
 * A pickup order is collected from the studio, so the recipient needs no
 * address — just who they are and how to reach them.
 */
export function recipientProblem(recipient, deliveryMethod) {
  if (!recipient?.name) return 'Recipient name is required.';
  if (!isValidPhone(recipient.phone)) return 'Recipient phone must be a 10-digit number.';
  if (deliveryMethod === DELIVERY_METHOD.PICKUP) return null;
  if (!recipient.address) return 'Recipient address is required.';
  if (!recipient.city) return 'Recipient city is required.';
  if (!recipient.state) return 'Recipient state is required.';
  if (!isValidPincode(recipient.pincode)) return 'Recipient PIN code must be 6 digits.';
  return null;
}

/**
 * Creates the paid order for a captured payment.
 *
 * Everything comes from the pending order — the document api/create-order.js
 * wrote when the customer pressed Pay, after validating their details and
 * pricing the delivery. Nothing the browser sends at this point is trusted.
 *
 * Runs as ONE Firestore transaction so the order, the gift-recipient record
 * and the checkout lead all land together (or not at all), and so two
 * simultaneous calls (the browser callback and the webhook) can never both
 * create an order: the second one sees `consumed: true` and does nothing.
 */
export async function createPaidOrder(db, { razorpayOrderId, razorpayPaymentId, photos, fallbackCustomer, fallbackRecipient }) {
  const pendingRef = db.collection('pendingOrders').doc(razorpayOrderId);
  // The order's document id IS the Razorpay order id, so a second call (or a
  // retry) can find the same order instead of creating a duplicate.
  const orderRef = db.collection('orders').doc(razorpayOrderId);

  let pending, stockIssue = false, alreadyProcessed = false, existingGrandTotal = null;
  let orderDetails = null;

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

      // ── Resolve the final buyer / recipient ───────────────────────────
      // The pending order holds the copy of these details that the server
      // validated when the order was created (before payment). It wins over
      // whatever the browser sends now — a tampered request can't rewrite
      // the recipient or the surprise flags after the money has moved.
      const pendingIsNewStyle = typeof pending.orderType === 'string';
      // Whether this pending order carries the delivery information added with
      // the PIN-code delivery feature. An older pending order (started before a
      // deploy, paid after it) simply keeps its original flat shipping charge
      // rather than failing for want of an address.
      const pendingHasDelivery = typeof pending.deliveryMethod === 'string';
      const finalOrderType = pendingIsNewStyle
        ? normalizeOrderType(pending.orderType)
        : (pending.orderType || ORDER_TYPE.SELF);
      const finalGiftOrder = finalOrderType === ORDER_TYPE.GIFT;

      const finalBuyer = pending.buyer?.firstName
        ? pending.buyer
        : sanitizeBuyer(fallbackCustomer || pending.buyer);
      const finalRecipient = finalGiftOrder
        ? (pending.recipient?.name ? pending.recipient : sanitizeRecipient(fallbackRecipient || pending.recipient))
        : null;

      // Re-validate the values we are about to persist.
      if (!finalBuyer.firstName || !finalBuyer.lastName || !isValidPhone(finalBuyer.phone)) {
        throw new Error('INVALID_BUYER');
      }
      if (finalBuyer.email && !isValidEmail(finalBuyer.email)) {
        throw new Error('INVALID_BUYER');
      }

      // ── Delivery ──────────────────────────────────────────────────────
      // The pending order already carries the delivery decision the server
      // made (method, zone, charge) after validating the pincode against the
      // owner's zone configuration. We inherit it — the browser never gets a
      // say in the price, only in the method.
      const finalDeliveryMethod = pending.deliveryMethod === DELIVERY_METHOD.PICKUP
        ? DELIVERY_METHOD.PICKUP
        : DELIVERY_METHOD.HOME;

      // Who the parcel goes to: the recipient for a gift order, the buyer
      // otherwise.
      const deliveryTarget = finalGiftOrder ? finalRecipient : finalBuyer;

      if (pendingHasDelivery && finalDeliveryMethod === DELIVERY_METHOD.HOME) {
        if (!deliveryTarget?.address || !deliveryTarget?.city || !deliveryTarget?.state
          || !isValidPincode(deliveryTarget?.pincode)) {
          throw new Error('INVALID_ADDRESS');
        }
      }
      if (finalGiftOrder && recipientProblem(finalRecipient, finalDeliveryMethod)) {
        throw new Error('INVALID_RECIPIENT');
      }

      // A surprise gift is the only thing that can hide the sender, and only
      // a surprise gift is allowed to keep the buyer's name off the note.
      const finalSurprise = finalGiftOrder && pending.isSurpriseGift === true;
      const finalHideIdentity = finalSurprise && pending.hideSenderIdentity === true;

      const finalGiftMessage = cleanMultiline(
        pending.giftMessage, finalGiftOrder ? MAX_GIFT_MESSAGE_LENGTH : MAX_SELF_GIFT_MESSAGE_LENGTH,
      );
      const finalDeliveryDate = finalGiftOrder && isValidDeliveryDate(pending.preferredDeliveryDate)
        ? pending.preferredDeliveryDate
        : '';

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

      orderDetails = {
        orderType: finalOrderType,
        buyer: finalBuyer,
        recipient: finalRecipient,
        isSurpriseGift: finalSurprise,
        hideSenderIdentity: finalHideIdentity,
        giftMessage: finalGiftMessage,
        preferredDeliveryDate: finalDeliveryDate,
        deliveryMethod: finalDeliveryMethod,
        deliveryZoneName: pending.deliveryZoneName || '',
        deliveryCharge: pending.shipping || 0,
        addressLine: formatAddressLine(deliveryTarget),
      };

      tx.set(orderRef, {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        // ── Order type ──
        orderType: finalOrderType,
        // ── Buyer (who pays, who we talk to) ──
        customer: {
          name: `${finalBuyer.firstName} ${finalBuyer.lastName}`,
          email: finalBuyer.email,
          phone: finalBuyer.phone,
          // A gift order is delivered to somebody else, so the buyer has no
          // delivery address of their own on this order. A pickup order is
          // collected from the studio, so nobody needs one either.
          address: (finalGiftOrder || finalDeliveryMethod === DELIVERY_METHOD.PICKUP)
            ? ''
            : (formatAddressLine(finalBuyer) || cleanText(fallbackCustomer?.address, MAX_ADDRESS_LENGTH)),
        },
        // ── Recipient ──
        // The recipient's own details live in their own table (giftRecipients)
        // so they stay separable from the order and payment data. This is just
        // the pointer — the document id is the order id, so reading it is a
        // direct get, never a query. Null on a self order.
        recipientId: finalGiftOrder ? giftRecipientId(razorpayOrderId) : null,
        // ── Surprise handling ──
        isSurpriseGift: finalSurprise,
        hideSenderIdentity: finalHideIdentity,
        items: pending.items,
        subtotal: pending.subtotal,
        discount: pending.discountAmount,
        discountPercent: pending.discountPercent,
        // ── Delivery ──
        // `shipping` is the delivery charge the server worked out from the
        // pincode and the owner's zone configuration. It is 0 for pickup.
        shipping: pending.shipping,
        deliveryMethod: finalDeliveryMethod,
        deliveryZoneId: pending.deliveryZoneId || '',
        deliveryZoneName: pending.deliveryZoneName || '',
        deliveryAreas: pending.deliveryAreas || '',
        deliveryPincode: pending.deliveryPincode || '',
        pickupLocation: pending.pickupLocation || '',
        pickupInstructions: pending.pickupInstructions || '',
        grandTotal: pending.grandTotal,
        giftMessage: finalGiftMessage,
        preferredDeliveryDate: finalDeliveryDate,
        photos: photos && typeof photos === 'object' ? photos : {},
        status: 'paid',
        stockIssue,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── The gift-recipient record ──
      // Written in the same transaction as the order, so a gift order can
      // never exist without its recipient record (or the other way round).
      if (finalGiftOrder) {
        tx.set(db.collection(GIFT_RECIPIENTS_COLLECTION).doc(giftRecipientId(razorpayOrderId)), {
          ...buildGiftRecipientRecord({
            orderId: razorpayOrderId,
            recipient: finalRecipient,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        });
      }

      // ── The checkout lead ──
      // The lead was created BEFORE the payment started (that is the whole
      // point of it — so an abandoned checkout is never lost). Now it is
      // converted: paid, completed, and linked to the order it became.
      if (pending.leadId) {
        tx.set(db.collection(CHECKOUT_LEADS_COLLECTION).doc(pending.leadId), {
          paymentStatus: PAYMENT_STATUS.SUCCESS,
          checkoutStatus: CHECKOUT_STATUS.COMPLETED,
          followUpStatus: FOLLOW_UP_STATUS.CONVERTED,
          linkedOrderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          paymentFailureReason: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      tx.update(pendingRef, { consumed: true });
    });
  } catch (err) {
    if (err.message === 'PENDING_NOT_FOUND') {
      const e = new Error('PENDING_NOT_FOUND');
      e.userMessage = 'This order could not be found. Please contact us with your payment ID.';
      throw e;
    }
    if (err.message === 'INVALID_BUYER') {
      const e = new Error('INVALID_BUYER');
      e.userMessage = 'Your details are incomplete. Please contact us with your payment ID.';
      throw e;
    }
    if (err.message === 'INVALID_RECIPIENT') {
      const e = new Error('INVALID_RECIPIENT');
      e.userMessage = "The recipient's delivery details are incomplete. Please contact us with your payment ID.";
      throw e;
    }
    if (err.message === 'INVALID_ADDRESS') {
      const e = new Error('INVALID_ADDRESS');
      e.userMessage = 'The delivery address is incomplete. Please contact us with your payment ID.';
      throw e;
    }
    throw err;
  }

  // The order already existed (the webhook got there first, or the customer
  // double-tapped). The photos the customer uploaded are the one thing the
  // browser knows and the server does not, so attach them if they are missing.
  if (alreadyProcessed && photos && Object.keys(photos).length > 0) {
    try {
      await db.collection('orders').doc(razorpayOrderId).set(
        { photos: { ...photos }, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true },
      );
    } catch (err) {
      console.error('Could not attach photos to an existing order:', err);
    }
  }

  return {
    pending,
    orderDetails,
    alreadyProcessed,
    existingGrandTotal,
    stockIssue,
  };
}
