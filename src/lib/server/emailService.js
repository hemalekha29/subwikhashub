// Server-only email notification service.
//
// One place that knows how to send an email, how to prove it only sent once,
// and how to record what happened. Every notification in the app goes through
// here: new orders, failed payments, abandoned-checkout summaries, feedback,
// and the test email from the admin panel.
//
// Design rules (from the brief):
//   • the backend sends, never the browser;
//   • a notification key makes sending idempotent — the same key can never
//     produce two emails, no matter how many times a webhook fires;
//   • a failure never breaks a paid order: every error is caught, logged and
//     written to the delivery log;
//   • the recipient, the provider and the sender are all configurable — nothing
//     personal is hardcoded.
import admin from 'firebase-admin';
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../emailjsConfig.js';
import { renderFeedbackRequestEmail } from './emailTemplates.js';
import {
  DEFAULT_EMAIL_SETTINGS,
  EMAIL_DELIVERY_STATUS,
  EMAIL_LOG_COLLECTION,
  EMAIL_PROVIDER,
  EMAIL_SETTINGS_COLLECTION,
  EMAIL_SETTINGS_DOC,
  NOTIFICATION_TYPE,
} from '../emailConfig.js';
import { SITE } from '../site.js';

/**
 * Resolves the effective email settings.
 *
 * Order of precedence: the admin panel's saved settings win, then the
 * environment, then the built-in defaults. The API key is never readable from
 * the admin panel — it comes from the environment only.
 */
export async function resolveEmailSettings(db) {
  let saved = {};
  try {
    const snap = await db.collection(EMAIL_SETTINGS_COLLECTION).doc(EMAIL_SETTINGS_DOC).get();
    if (snap.exists()) saved = snap.data() || {};
  } catch (err) {
    console.error('Could not read the email settings:', err);
  }

  const settings = { ...DEFAULT_EMAIL_SETTINGS, ...saved };

  const provider = String(
    process.env.EMAIL_PROVIDER || settings.provider || DEFAULT_EMAIL_SETTINGS.provider,
  ).toLowerCase();

  // The admin's own address: whatever they set in the panel, else the
  // environment, else the business address already published on the site.
  const adminEmail = (
    settings.adminEmail
    || process.env.ADMIN_NOTIFICATION_EMAIL
    || SITE.email
    || ''
  ).trim();

  const senderEmail = (
    settings.senderEmail
    || process.env.EMAIL_FROM
    || ''
  ).trim();

  return {
    ...settings,
    provider: Object.values(EMAIL_PROVIDER).includes(provider) ? provider : EMAIL_PROVIDER.EMAILJS,
    adminEmail,
    senderEmail,
    senderName: settings.senderName || SITE.name,
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailjsServiceId: EMAILJS_SERVICE_ID,
    emailjsTemplateId: EMAILJS_TEMPLATE_ID,
    emailjsPublicKey: EMAILJS_PUBLIC_KEY,
  };
}

/** The public-facing view of the settings (no secrets). */
export function publicEmailSettings(settings) {
  return {
    provider: settings.provider,
    adminEmail: settings.adminEmail,
    senderName: settings.senderName,
    senderEmail: settings.senderEmail,
    orderNotificationsEnabled: settings.orderNotificationsEnabled,
    feedbackNotificationsEnabled: settings.feedbackNotificationsEnabled,
    paymentFailureNotificationsEnabled: settings.paymentFailureNotificationsEnabled,
    abandonedSummaryEnabled: settings.abandonedSummaryEnabled,
    retryLimit: settings.retryLimit,
    // Whether a provider is actually usable — the admin page shows a warning
    // when it is not, instead of silently failing.
    ready: isProviderReady(settings),
  };
}

/** Is the configured provider actually able to send? */
export function isProviderReady(settings) {
  if (settings.provider === EMAIL_PROVIDER.NONE) return false;
  if (settings.provider === EMAIL_PROVIDER.RESEND) return Boolean(settings.resendApiKey);
  if (settings.provider === EMAIL_PROVIDER.EMAILJS) {
    return Boolean(settings.emailjsServiceId && settings.emailjsTemplateId);
  }
  return false;
}

/**
 * Sends one email, exactly once per `key`.
 *
 * `key` is the idempotency key — for an order it is derived from the order
 * id, so a webhook that fires three times still produces one email.
 *
 * Returns { sent, skipped, error } and never throws: a notification problem
 * must not affect a paid order.
 */
export async function sendNotification(db, {
  key, type, to, subject, html, text, orderId = null, leadId = null, allowRetry = false,
  useCustomerTemplate = false,
}) {
  const settings = await resolveEmailSettings(db);

  if (!settings.adminEmail) {
    console.warn('Email notification skipped: no admin email address is configured.');
    return { sent: false, skipped: true, reason: 'No admin email address configured' };
  }
  const recipient = to || settings.adminEmail;

  const logRef = db.collection(EMAIL_LOG_COLLECTION).doc(key);
  const now = admin.firestore.FieldValue.serverTimestamp();

  // ── Claim the key ──────────────────────────────────────────────────────
  // `create` fails if the document already exists, which makes claiming
  // atomic: two simultaneous sends can never both win.
  let claimed = false;
  let attempts = 1;
  try {
    await logRef.create({
      key,
      type: type || NOTIFICATION_TYPE.TEST,
      channel: 'email',
      provider: settings.provider,
      recipient,
      subject: subject || '',
      html: html || '',
      text: text || '',
      status: EMAIL_DELIVERY_STATUS.SENDING,
      attempts: 1,
      lastError: null,
      // Remembered so a retry sends the very same email, through the very
      // same template, to the very same person.
      useCustomerTemplate: useCustomerTemplate === true,
      orderId,
      leadId,
      createdAt: now,
      updatedAt: now,
    });
    claimed = true;
  } catch (err) {
    const alreadyExists = err?.code === 6 || err?.code === 'already-exists'
      || /already exists/i.test(err?.message || '');
    if (!alreadyExists) {
      console.error('Could not record the email notification:', err);
      return { sent: false, error: err.message };
    }

    const snap = await logRef.get();
    const previous = snap.data() || {};
    if (previous.status === EMAIL_DELIVERY_STATUS.SENT) {
      // Already sent — this is the webhook firing again. Nothing to do.
      return { sent: false, skipped: true, reason: 'Already sent' };
    }
    if (!allowRetry) {
      return { sent: false, skipped: true, reason: 'Already attempted' };
    }
    attempts = (previous.attempts || 1) + 1;
    await logRef.set({
      status: EMAIL_DELIVERY_STATUS.SENDING,
      attempts,
      lastError: null,
      updatedAt: now,
    }, { merge: true });
    claimed = true;
  }

  if (!claimed) return { sent: false, skipped: true };

  // ── Send ───────────────────────────────────────────────────────────────
  try {
    await dispatch({ settings, recipient, subject, html, text, useCustomerTemplate });
    await logRef.set({
      status: EMAIL_DELIVERY_STATUS.SENT,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      lastError: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { sent: true, attempts };
  } catch (err) {
    const message = (err?.message || 'Unknown error').slice(0, 500);
    console.error(`Email notification "${key}" failed:`, message);
    try {
      await logRef.set({
        status: EMAIL_DELIVERY_STATUS.FAILED,
        lastError: message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (logErr) {
      console.error('Could not record the email failure:', logErr);
    }
    return { sent: false, error: message };
  }
}

/**
 * Sends through the configured provider.
 *
 * Resend is the one that can render our own branded HTML and take a
 * configurable recipient. EmailJS uses the template already set up on the
 * account — its recipient is whichever address that template is configured
 * with, unless it carries a `{{to_email}}` merge tag.
 */
async function dispatch({ settings, recipient, subject, html, text, useCustomerTemplate = false }) {
  if (settings.provider === EMAIL_PROVIDER.NONE) {
    throw new Error('Email notifications are switched off.');
  }

  if (settings.provider === EMAIL_PROVIDER.RESEND) {
    if (!settings.resendApiKey) throw new Error('RESEND_API_KEY is not set.');
    const from = settings.senderEmail
      ? `${settings.senderName} <${settings.senderEmail}>`
      : undefined;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(from ? { from } : {}),
        to: [recipient],
        subject,
        html,
        text,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.message || `Resend responded ${res.status}`);
    return body;
  }

  // EmailJS
  // A customer email uses its own template (EMAILJS_BUYER_TEMPLATE_ID) — the
  // admin template is built for the shop's own inbox.
  const templateId = useCustomerTemplate
    ? (process.env.EMAILJS_BUYER_TEMPLATE_ID || '')
    : settings.emailjsTemplateId;
  if (!templateId) {
    throw new Error('No customer email template is configured (EMAILJS_BUYER_TEMPLATE_ID).');
  }

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: settings.emailjsServiceId,
      template_id: templateId,
      user_id: settings.emailjsPublicKey,
      template_params: {
        to_email: recipient,
        name: settings.senderName,
        email: recipient,
        subject,
        message: text,
        html,
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || `EmailJS responded ${res.status}`);
  }
  // ⚠️ EmailJS answers HTTP 200 even when the send itself failed — the error
  // is only in the body. Checking `res.ok` alone is why notifications used to
  // disappear without a trace.
  if (body && (body.status === 'error' || body.error)) {
    throw new Error(body.message || body.error || 'EmailJS reported an error');
  }
  return body;
}

/**
 * The feedback form, sent to the buyer once their order is in.
 *
 * Only the BUYER ever receives it — the recipient of a gift is never emailed,
 * and never told that a feedback form exists. The link carries the order id
 * (and the product, when the order has a single one), so the form opens
 * already knowing what it is about.
 *
 * It is keyed on the order id, so it goes out exactly once per order however
 * many times the payment gateway tells us about it.
 */
export async function sendFeedbackRequest(db, {
  to, name, orderId, productName = '', productId = null, feedbackUrl,
}) {
  if (!to) return { sent: false, skipped: true, reason: 'No email address for the customer' };

  const settings = await resolveEmailSettings(db);
  if (!settings.feedbackRequestEnabled) {
    return { sent: false, skipped: true, reason: 'Feedback requests are switched off' };
  }

  const email = renderFeedbackRequestEmail({ name, orderId, productName, productId, feedbackUrl });

  return sendNotification(db, {
    key: `feedback_request_${orderId}`,
    type: NOTIFICATION_TYPE.ORDER_FEEDBACK_REQUEST,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    orderId,
    useCustomerTemplate: true,
  });
}

/**
 * The customer's own order confirmation.
 *
 * A different template from the admin notification: it goes to the BUYER's
 * address only (never to a gift recipient), and only when the shop has
 * configured a customer template whose To field is `{{to_email}}`. Without
 * one this is a no-op rather than a second copy landing in the admin inbox.
 */
export async function sendCustomerEmail(db, { to, name, subject, message }) {
  const customerTemplateId = process.env.EMAILJS_BUYER_TEMPLATE_ID;
  if (!customerTemplateId || !to) return false;
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: customerTemplateId,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: to,
          name: name || 'Customer',
          email: to,
          subject,
          message,
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.status === 'error') {
      console.error('Customer email failed:', body?.message || body?.error || `HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Customer email failed:', err);
    return false;
  }
}

/**
 * Re-sends a notification that previously failed, using the exact content
 * that was logged. This is what the admin's "Retry" button calls.
 */
export async function retryNotification(db, key) {
  const logRef = db.collection(EMAIL_LOG_COLLECTION).doc(key);
  const snap = await logRef.get();
  if (!snap.exists()) return { sent: false, error: 'That notification no longer exists.' };
  const previous = snap.data();
  if (previous.status === EMAIL_DELIVERY_STATUS.SENT) {
    return { sent: false, skipped: true, reason: 'It already went out.' };
  }

  const settings = await resolveEmailSettings(db);
  const limit = Math.max(1, Number(settings.retryLimit) || 3);
  if ((previous.attempts || 1) >= limit) {
    return { sent: false, error: `It has already been tried ${previous.attempts} times.` };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await logRef.set({
    status: EMAIL_DELIVERY_STATUS.SENDING,
    attempts: (previous.attempts || 1) + 1,
    lastError: null,
    updatedAt: now,
  }, { merge: true });

  try {
    await dispatch({
      settings,
      recipient: previous.recipient || settings.adminEmail,
      subject: previous.subject,
      html: previous.html,
      text: previous.text,
      useCustomerTemplate: previous.useCustomerTemplate === true,
    });
    await logRef.set({
      status: EMAIL_DELIVERY_STATUS.SENT,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      lastError: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { sent: true };
  } catch (err) {
    const message = (err?.message || 'Unknown error').slice(0, 500);
    await logRef.set({
      status: EMAIL_DELIVERY_STATUS.FAILED,
      lastError: message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { sent: false, error: message };
  }
}
