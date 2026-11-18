// Shared email-notification configuration.
//
// Imported by the server (the notification service, the test/retry APIs) and by
// the admin panel (the email settings page), so both agree on the providers,
// the notification types and the defaults.

export const EMAIL_PROVIDER = {
  EMAILJS: 'emailjs',
  RESEND: 'resend',
  NONE: 'none',
};

export const NOTIFICATION_TYPE = {
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_FEEDBACK_REQUEST: 'ORDER_FEEDBACK_REQUEST',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  LEADS_ABANDONED_SUMMARY: 'LEADS_ABANDONED_SUMMARY',
  FEEDBACK_RECEIVED: 'FEEDBACK_RECEIVED',
  TEST: 'TEST',
};

export const NOTIFICATION_TYPE_LABELS = {
  ORDER_CONFIRMED: 'New order',
  ORDER_FEEDBACK_REQUEST: 'Feedback form sent to the customer',
  PAYMENT_FAILED: 'Payment failed',
  LEADS_ABANDONED_SUMMARY: 'Abandoned checkouts summary',
  FEEDBACK_RECEIVED: 'New feedback',
  TEST: 'Test email',
};

/** Firestore collection holding the email settings document. */
export const EMAIL_SETTINGS_COLLECTION = 'emailSettings';
export const EMAIL_SETTINGS_DOC = 'main';

/**
 * Firestore collection holding one document per notification — the delivery
 * log. The document id IS the notification key, which is what makes sending
 * idempotent: the same key can never produce two emails.
 */
export const EMAIL_LOG_COLLECTION = 'emailNotifications';

export const EMAIL_DELIVERY_STATUS = {
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
};

/**
 * The defaults. `adminEmail` and `senderEmail` are deliberately empty: the
 * owner's real address comes from the admin settings page or from the
 * environment — it is never hardcoded here.
 */
export const DEFAULT_EMAIL_SETTINGS = {
  provider: EMAIL_PROVIDER.EMAILJS,
  adminEmail: '',
  senderName: "Subwikha's Hub",
  senderEmail: '',
  orderNotificationsEnabled: true,
  // Send the buyer a link to the feedback form after their order.
  feedbackRequestEnabled: true,
  feedbackNotificationsEnabled: true,
  paymentFailureNotificationsEnabled: false,
  abandonedSummaryEnabled: true,
  retryLimit: 3,
};
