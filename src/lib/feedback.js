// The central feedback configuration.
//
// ONE registry drives everything: the form's category list, the extra fields
// each category shows, the admin filters and the backend validation. Adding a
// category means adding an entry here (and optionally letting the admin turn
// it on from the dashboard) — not editing a dozen components.
//
// Shared by the browser (the form, the admin panel) and the server
// (api/submit-feedback.js), so what a customer can submit is exactly what the
// server accepts.

export const FEEDBACK_CATEGORIES = {
  PRODUCT: 'product',
  DELIVERY: 'delivery',
  PACKAGING: 'packaging',
  CUSTOMER_SERVICE: 'customer_service',
  WEBSITE: 'website',
  GIFT_EXPERIENCE: 'gift_experience',
  COMPLAINT: 'complaint',
  SUGGESTION: 'suggestion',
  OTHER: 'other',
};

export const FEEDBACK_STATUS = {
  NEW: 'NEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

export const FEEDBACK_STATUS_LABELS = {
  NEW: 'New',
  UNDER_REVIEW: 'Under review',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const RATING_LABELS = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

/**
 * Every category, its extra fields, and what it allows.
 *
 * Field types: 'text' | 'textarea' | 'rating' | 'select'
 * A field marked `required: true` must be filled in for that category.
 */
export const FEEDBACK_CATEGORY_CONFIG = [
  {
    key: FEEDBACK_CATEGORIES.PRODUCT,
    label: 'Product Feedback',
    icon: '🎁',
    description: 'Tell us what you think about the product itself.',
    allowAttachment: true,
    allowAnonymous: true,
    fields: [
      { key: 'productName', label: 'Which product?', type: 'text', required: false, placeholder: 'e.g. Resin Keychain' },
      { key: 'productQuality', label: 'Product quality', type: 'rating', required: false },
      { key: 'productFeedback', label: 'What did you like or dislike?', type: 'textarea', required: false },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.DELIVERY,
    label: 'Delivery Feedback',
    icon: '🚚',
    description: 'How was the delivery? Was it on time, well packed, delivered politely?',
    allowAttachment: true,
    allowAnonymous: true,
    fields: [
      { key: 'deliveryExperience', label: 'Delivery experience', type: 'rating', required: false },
      { key: 'deliveryComments', label: 'Anything we should know about the delivery?', type: 'textarea', required: false },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.PACKAGING,
    label: 'Packaging Feedback',
    icon: '📦',
    description: 'Was everything packed beautifully and safely?',
    allowAttachment: true,
    allowAnonymous: true,
    fields: [
      { key: 'packagingRating', label: 'Packaging quality', type: 'rating', required: false },
      { key: 'packagingComments', label: 'How was it packed?', type: 'textarea', required: false },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.CUSTOMER_SERVICE,
    label: 'Customer Service Feedback',
    icon: '💬',
    description: 'Tell us how we looked after you.',
    allowAttachment: false,
    allowAnonymous: true,
    fields: [
      { key: 'serviceRating', label: 'How were we to deal with?', type: 'rating', required: false },
      { key: 'serviceComments', label: 'Tell us more', type: 'textarea', required: false },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.WEBSITE,
    label: 'Website Experience',
    icon: '🌐',
    description: 'How was your experience on our website?',
    allowAttachment: true,
    allowAnonymous: true,
    fields: [
      { key: 'usabilityRating', label: 'How easy was the site to use?', type: 'rating', required: false },
      { key: 'usabilitySuggestions', label: 'How can we improve the site?', type: 'textarea', required: false },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.GIFT_EXPERIENCE,
    label: 'Gift Experience',
    icon: '💝',
    description: 'Was it a gift? How was the experience of giving or receiving it?',
    allowAttachment: true,
    allowAnonymous: true,
    fields: [
      { key: 'giftRating', label: 'The gifting experience', type: 'rating', required: false },
      { key: 'giftComments', label: 'Tell us about it', type: 'textarea', required: false },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.COMPLAINT,
    label: 'Complaint',
    icon: '😔',
    description: 'Something went wrong — we want to fix it.',
    allowAttachment: true,
    allowAnonymous: false,
    fields: [
      { key: 'issueCategory', label: 'What is the issue about?', type: 'select', required: true, options: ['Product quality', 'Delivery delay', 'Damaged on arrival', 'Wrong item received', 'Payment problem', 'Website problem', 'Something else'] },
      { key: 'complaintDescription', label: 'Tell us what happened', type: 'textarea', required: true },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.SUGGESTION,
    label: 'General Suggestion',
    icon: '💡',
    description: 'What should we do next? We read every one of these.',
    allowAttachment: false,
    allowAnonymous: true,
    fields: [
      { key: 'suggestionDetails', label: 'Your idea', type: 'textarea', required: true },
    ],
  },
  {
    key: FEEDBACK_CATEGORIES.OTHER,
    label: 'Other',
    icon: '✉️',
    description: 'Anything else you would like us to know.',
    allowAttachment: true,
    allowAnonymous: true,
    fields: [
      { key: 'otherDetails', label: 'Your feedback', type: 'textarea', required: true },
    ],
  },
];

/** The config for one category, or null when the key isn't a known category. */
export function feedbackCategoryConfig(key) {
  return FEEDBACK_CATEGORY_CONFIG.find(c => c.key === key) || null;
}

/** The list of categories that are switched on (the admin can disable some). */
export function enabledCategories(disabledKeys = []) {
  return FEEDBACK_CATEGORY_CONFIG.filter(c => !disabledKeys.includes(c.key));
}

/** A short, readable reference — e.g. "FB-K7M2QX". */
export function generateFeedbackReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FB-${code}`;
}
