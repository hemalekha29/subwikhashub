import { getDb } from '../src/lib/server/orderCreation.js';
import { sendNotification, sendCustomerEmail } from '../src/lib/server/emailService.js';
import { renderFeedbackEmail } from '../src/lib/server/emailTemplates.js';
import { NOTIFICATION_TYPE } from '../src/lib/emailConfig.js';
import { SITE } from '../src/data/site.js';
import {
  FEEDBACK_STATUS,
  feedbackCategoryConfig,
  generateFeedbackReference,
} from '../src/lib/feedback.js';

const COLLECTION = 'feedbacks';
const MAX_MESSAGE_LENGTH = 4000;
const MAX_NAME_LENGTH = 80;
const MAX_ATTACHMENTS = 4;

// ── Rate limiting ────────────────────────────────────────────────────────
// A tiny in-memory limiter: at most a handful of submissions per IP per hour.
// Serverless instances are short-lived, so this is best-effort — it stops a
// bored script, not a determined one, which is exactly what we want here.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 6;
const rateLimit = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (rateLimit.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    rateLimit.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateLimit.set(ip, hits);
  // Keep the map from growing without bound.
  if (rateLimit.size > 5000) rateLimit.clear();
  return false;
}

function clean(value, max = MAX_MESSAGE_LENGTH) {
  return (value || '')
    .toString()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

function isValidPhone(phone) {
  return /^\d{10}$/.test((phone || '').trim());
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

/**
 * Accepts feedback from anywhere on the site.
 *
 * Everything is validated and sanitised here — the browser's copy is never
 * trusted, and nothing is written to Firestore by the browser at all (see
 * firestore.rules).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    res.status(429).json({ ok: false, error: 'You have sent several messages already. Please try again later.' });
    return;
  }

  try {
    const {
      category, name, phone, email, rating, message,
      productId, productName, orderId, sourcePage, isAnonymous,
      attachmentUrls, details, categoryConfig,
    } = req.body || {};

    const config = feedbackCategoryConfig(category);
    if (!config) {
      res.status(400).json({ ok: false, error: 'Please choose a feedback category.' });
      return;
    }

    const anonymous = isAnonymous === true && config.allowAnonymous;
    const cleanName = clean(name, MAX_NAME_LENGTH);
    const cleanPhone = clean(phone, 20);
    const cleanEmail = clean(email, MAX_NAME_LENGTH);
    const cleanMessage = clean(message, MAX_MESSAGE_LENGTH);

    // ── Validation ───────────────────────────────────────────────────────
    if (!anonymous && !cleanName) {
      res.status(400).json({ ok: false, error: 'Please tell us your name.' });
      return;
    }
    if (cleanPhone && !isValidPhone(cleanPhone)) {
      res.status(400).json({ ok: false, error: 'Please enter a valid 10-digit phone number.' });
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
      return;
    }
    const numericRating = parseInt(rating, 10);
    if (rating !== undefined && rating !== null && rating !== '' && !(numericRating >= 1 && numericRating <= 5)) {
      res.status(400).json({ ok: false, error: 'Please choose a rating between 1 and 5.' });
      return;
    }

    // The category's own fields, each validated against its own rules.
    const sanitizedDetails = {};
    for (const field of config.fields) {
      const value = clean(details?.[field.key], field.type === 'textarea' ? MAX_MESSAGE_LENGTH : 200);
      if (field.required && !value) {
        res.status(400).json({ ok: false, error: `Please fill in "${field.label}".` });
        return;
      }
      if (field.type === 'rating' && value && !(parseInt(value, 10) >= 1 && parseInt(value, 10) <= 5)) {
        sanitizedDetails[field.key] = null;
      } else if (value) {
        sanitizedDetails[field.key] = value;
      }
    }

    // The customer has to say something — either in the main message or in one
    // of the category's own fields.
    if (!cleanMessage && Object.keys(sanitizedDetails).length === 0) {
      res.status(400).json({ ok: false, error: 'Please share a little more with us.' });
      return;
    }

    // ── Attachments ──────────────────────────────────────────────────────
    // Only images already uploaded to our own Cloudinary account are accepted,
    // and never more than a handful of them.
    const attachments = (Array.isArray(attachmentUrls) ? attachmentUrls : [])
      .filter(u => typeof u === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(u))
      .slice(0, MAX_ATTACHMENTS);

    const db = getDb();

    // ── Duplicate guard ──────────────────────────────────────────────────
    // The same message from the same phone within the hour is almost always a
    // double submit.
    if (cleanPhone) {
      const recent = await db.collection(COLLECTION)
        .where('customer_phone', '==', cleanPhone)
        .limit(5)
        .get();
      const duplicate = recent.docs.find(d => {
        const data = d.data();
        if (data.feedback_message !== cleanMessage) return false;
        const created = data.created_at?.toDate?.();
        return created && Date.now() - created.getTime() < 60 * 60 * 1000;
      });
      if (duplicate) {
        res.status(200).json({ ok: true, duplicate: true, reference: duplicate.data().feedback_reference });
        return;
      }
    }

    // ── Store ────────────────────────────────────────────────────────────
    const reference = generateReference(db);
    const record = {
      feedback_reference: reference,
      feedback_category: category,
      feedback_type: categoryConfig?.label || config.label,
      customer_name: anonymous ? '' : cleanName,
      customer_phone: cleanPhone,
      customer_email: cleanEmail,
      rating: numericRating >= 1 && numericRating <= 5 ? numericRating : null,
      feedback_message: cleanMessage,
      details: sanitizedDetails,
      product_id: clean(productId, 120) || null,
      product_name: clean(productName, MAX_NAME_LENGTH) || null,
      order_id: clean(orderId, 120) || null,
      source_page: clean(sourcePage, 200) || 'unknown',
      is_anonymous: anonymous,
      attachment_urls: attachments,
      status: FEEDBACK_STATUS.NEW,
      admin_reply: '',
      internal_notes: '',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection(COLLECTION).doc(reference).set(record);

    // ── Notifications ────────────────────────────────────────────────────
    const feedbackEmail = renderFeedbackEmail({
      reference,
      category: config.label,
      rating: record.rating,
      message: cleanMessage,
      customer: {
        name: anonymous ? 'Anonymous' : cleanName,
        email: cleanEmail,
        phone: cleanPhone,
      },
      orderId: record.order_id,
      sourcePage: record.source_page,
    }, { adminUrl: `${SITE.url}/admin/feedback` });

    await sendNotification(db, {
      // One notification per piece of feedback.
      key: `feedback_${reference}`,
      type: NOTIFICATION_TYPE.FEEDBACK_RECEIVED,
      subject: feedbackEmail.subject,
      html: feedbackEmail.html,
      text: feedbackEmail.text,
    });

    // A courtesy confirmation, only if they gave us an email address.
    if (!anonymous && cleanEmail) {
      await sendCustomerEmail(db, {
        to: cleanEmail,
        name: cleanName,
        subject: `Thank you for your feedback 💝 (${reference})`,
        message: `Hi ${cleanName},\n\nThank you for sharing your experience with Subwikha's Hub! `
          + `Your feedback helps us make every gift more special.\n\n`
          + `Your reference: ${reference}\n\n`
          + `With love,\nSubwikha's Hub — Where Memories Become Gifts`,
      });
    }

    res.status(200).json({ ok: true, reference });
  } catch (err) {
    console.error('submit-feedback failed:', err);
    res.status(500).json({ ok: false, error: 'We could not save your feedback. Please try again.' });
  }
}

// A reference that is not already taken.
async function generateReference(db) {
  for (let i = 0; i < 5; i++) {
    const reference = generateFeedbackReference();
    const snap = await db.collection(COLLECTION).doc(reference).get();
    if (!snap.exists) return reference;
  }
  return `FB-${Date.now().toString(36).toUpperCase()}`;
}
