// The personalization studio — the shared model behind the "Personalize" modal.
//
// Every personalized product declares what it needs (how many photos, in what
// shape, which text fields), and the modal renders itself from that
// declaration. Adding a new field or a new product therefore means editing
// ONE table here, never the modal, the product page or the checkout.
//
// The photo layout is expressed as "slots": named areas in the frame that
// hold a photo. A slot can hold one photo (max: 1) or several (a collage).

export const PERSONALIZATION_FIELD_TYPE = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
};

/**
 * The presets, keyed by product slug.
 *
 * `slots`   — the photo areas of the finished frame.
 *             `max` is how many photos the slot accepts (1 = a single photo).
 *             `shape` is 'portrait' | 'square' | 'landscape' — it decides the
 *             aspect ratio of the crop box, so the preview matches the print.
 * `fields`  — the text the customer adds.
 *
 * `replacesCustomOptions` — when true, the product's own plain text fields
 * are hidden on the product page, because the studio collects the same things
 * (names, quotes, links) in one place and the customer should never be asked
 * for them twice.
 */
export const PERSONALIZATION_PRESETS = {
  'custom-photo-frame': {
    title: 'Personalize — Custom Photo Frame',
    subtitle: 'Upload your photos, add a message and a Spotify link to make it truly yours.',
    frame: 'polaroid',
    replacesCustomOptions: true,
    slots: [
      { id: 'main', label: 'Main photo', max: 1, required: true, shape: 'portrait' },
      { id: 'second', label: 'Photo 2', max: 1, required: false, shape: 'portrait' },
      { id: 'third', label: 'Photo 3', max: 1, required: false, shape: 'portrait' },
    ],
    fields: [
      { key: 'title', label: 'Name / Title', placeholder: 'e.g. My Valentine', maxLength: 40 },
      { key: 'message', label: 'Your message', placeholder: 'A few words from your heart', maxLength: 180, type: PERSONALIZATION_FIELD_TYPE.TEXTAREA },
      { key: 'spotify', label: 'Spotify song link', placeholder: 'https://open.spotify.com/track/…', maxLength: 250 },
      { key: 'signature', label: 'Signature', placeholder: 'e.g. Always, Me', maxLength: 30 },
    ],
  },
  'custom-4x4-frame': {
    title: 'Personalize — Custom 4×4 Frame',
    subtitle: 'One photo, one quote — upload it and see it in the frame.',
    frame: 'square',
    replacesCustomOptions: true,
    slots: [
      { id: 'main', label: 'Your photo', max: 1, required: true, shape: 'square' },
    ],
    fields: [
      { key: 'title', label: 'Title', placeholder: 'e.g. Our First Home', maxLength: 40 },
      { key: 'message', label: 'Quote or message', placeholder: 'The words that matter', maxLength: 180, type: PERSONALIZATION_FIELD_TYPE.TEXTAREA },
    ],
  },
  'custom-a4-birthday-frame': {
    title: 'Personalize — Custom A4 Birthday Frame',
    subtitle: 'Add up to six photos, the date and a message for their day.',
    frame: 'collage',
    replacesCustomOptions: true,
    slots: [
      { id: 'collage', label: 'Collage photos', max: 6, required: true, shape: 'landscape' },
    ],
    fields: [
      { key: 'title', label: 'Title', placeholder: 'e.g. Happy Birthday, Me', maxLength: 40 },
      { key: 'date', label: 'Special date', placeholder: 'e.g. 12.08.2026', maxLength: 24 },
      { key: 'message', label: 'Your message', placeholder: 'A few words for them', maxLength: 180, type: PERSONALIZATION_FIELD_TYPE.TEXTAREA },
    ],
  },
  'a4-wedding-couple-frame': {
    title: 'Personalize — A4 Wedding Frame',
    subtitle: 'Your couple photo, your background photos and your names.',
    frame: 'collage',
    replacesCustomOptions: true,
    slots: [
      { id: 'couple', label: 'Couple photo', max: 1, required: true, shape: 'landscape' },
      { id: 'memories', label: 'Background photos', max: 4, required: false, shape: 'square' },
    ],
    fields: [
      { key: 'title', label: 'Names', placeholder: 'e.g. Aarav & Diya', maxLength: 40 },
      { key: 'date', label: 'Wedding date', placeholder: 'e.g. 12.08.2026', maxLength: 24 },
      { key: 'message', label: 'Your message', placeholder: 'A line from the heart', maxLength: 180, type: PERSONALIZATION_FIELD_TYPE.TEXTAREA },
    ],
  },
};

/** The preset for a product, or null when the product isn't personalized. */
export function getPersonalizationPreset(product) {
  if (!product) return null;
  return PERSONALIZATION_PRESETS[product.slug] || null;
}

/** The shape of the crop box for a slot. */
export const SLOT_SHAPES = {
  portrait: { width: 3, height: 4 },
  square: { width: 1, height: 1 },
  landscape: { width: 4, height: 3 },
};

export function slotAspect(slot) {
  const shape = SLOT_SHAPES[slot?.shape] || SLOT_SHAPES.square;
  return shape.width / shape.height;
}

/** The identity of a photo slot — a stable key so photos can be filed away
 *  and put back exactly where the customer left them. */
export function slotKey(slotId, photoId) {
  return `${slotId}:${photoId}`;
}

/**
 * A short, stable fingerprint of a personalization, used to make the cart line
 * its own: two frames with different photos are two different cart lines, the
 * same frame added twice is one.
 */
export function personalizationHash(personalization) {
  if (!personalization) return '';
  const part = JSON.stringify({
    photos: (personalization.photos || []).map(p => ({
      url: p.url || p.localUrl || '',
      slot: p.slot || '',
      // The crop is stored as fractions of the frame, so keep enough
      // precision that two different crops never hash the same.
      x: Math.round((p.transform?.x || 0) * 1000),
      y: Math.round((p.transform?.y || 0) * 1000),
      s: Math.round((p.transform?.scale || 1) * 1000),
    })),
    fields: personalization.fields || {},
  });
  let h = 0;
  for (let i = 0; i < part.length; i++) h = (h * 31 + part.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** A file the browser can actually show us. */
export function isSupportedPhoto(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '');
}

/** Photos are resized in the browser before upload — see prepareImage(). */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
