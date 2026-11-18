// Shared delivery-zone configuration + helpers.
//
// Imported by BOTH the browser (checkout, admin panel) and the server
// (api/create-order.js), so the zone lookup that shows the customer a price is
// the same lookup that decides what they are actually charged. Keep this file
// free of browser-only and Node-only APIs.
//
// The authoritative configuration lives in Firestore (the `deliveryZones` and
// `deliverySettings` collections) and is managed from /admin/delivery — no
// pincode or charge is hardcoded in the frontend. The constants below are
// only the STARTER configuration, used until the owner creates their own
// zones in the admin panel (and by the "Create starter zones" button there).

// Imported (not just re-exported) so this module can use it, and re-exported
// so the delivery code and the form validation can never disagree about what
// a valid pincode is.
import { isValidPincode } from './validators.js';
export { isValidPincode };

export const DELIVERY_METHOD = {
  HOME: 'DELIVERY',
  PICKUP: 'PICKUP',
};

/** Firestore collection holding one document per delivery zone. */
export const DELIVERY_ZONES_COLLECTION = 'deliveryZones';

/** Firestore collection holding the single delivery settings document. */
export const DELIVERY_SETTINGS_COLLECTION = 'deliverySettings';
export const DELIVERY_SETTINGS_DOC = 'main';

export const ZONE_TYPE = {
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
};

/** Normalises a pincode to its canonical form (6 digits, no spaces). */
export function normalizePincode(pincode) {
  return (pincode || '').toString().replace(/\D/g, '').slice(0, 6);
}

/**
 * The starter zones.
 *
 * ⚠️ These are STARTING VALUES, not verified truth — the owner should edit the
 * pincode lists in /admin/delivery to match the areas they actually deliver
 * to. Until the first zone is created in the admin panel, these are what both
 * the checkout and the server use, so the site works from day one.
 *
 * The "main area" — Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti and
 * the surrounding pockets — is both the local delivery zone AND the list of
 * PIN codes allowed to collect from the studio. Customers outside it can still
 * get home delivery (at the outer-zone charge) but not collect, because the
 * studio is out of their way.
 *
 * Beyond Coimbatore we deliver across Tamil Nadu and across India. A whole
 * state is far too many PIN codes to list, so a zone can also carry PIN-code
 * PREFIXES — the Tamil Nadu zone matches every PIN code starting with 6, which
 * is the whole state (600001–643999) — and a zone can be a CATCH-ALL, which
 * covers every PIN code no earlier zone matched (the rest of India). Zones are
 * matched in order, so the specific Coimbatore zones are always found before
 * the state-wide one.
 */
const MAIN_AREA_PINCODES = [
  '641005', // Singanallur
  '641010', // Perur / Kurichi
  '641011', // Selvapuram
  '641012', // Vedapatti
  '641029', // Thondamuthur
  '641030', // Thondamuthur / Iyyapuram
  '641031', // Eachoor
  '641032', // Vadavalli
];
// Every PIN code in the Coimbatore district starts with 641, so the outer zone
// is matched with a prefix instead of a hand-written list — that way no PIN
// code in the district can fall through to the state-wide charge by accident.
export const COIMBATORE_PINCODE_PREFIXES = ['641'];

/**
 * Every Tamil Nadu PIN code starts with 6, so one prefix covers the state.
 */
export const TAMIL_NADU_PINCODE_PREFIXES = ['6'];

export const DEFAULT_DELIVERY_ZONES = [
  {
    id: 'local',
    type: ZONE_TYPE.DELIVERY,
    name: 'Local Delivery',
    areas: 'Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti & nearby areas',
    charge: 45,
    pincodes: MAIN_AREA_PINCODES,
    pincodePrefixes: [],
    catchAll: false,
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'outer',
    type: ZONE_TYPE.DELIVERY,
    name: 'Outer Coimbatore Delivery',
    areas: 'Ukkadam & other outer Coimbatore areas',
    charge: 90,
    // The whole Coimbatore district (every PIN code starting 641) except the
    // local zone above, which is matched first.
    pincodes: [],
    pincodePrefixes: COIMBATORE_PINCODE_PREFIXES,
    catchAll: false,
    enabled: true,
    sortOrder: 2,
  },
  {
    id: 'tamil-nadu',
    type: ZONE_TYPE.DELIVERY,
    name: 'Tamil Nadu Delivery',
    areas: 'Everywhere else in Tamil Nadu',
    charge: 150,
    pincodes: [],
    pincodePrefixes: TAMIL_NADU_PINCODE_PREFIXES,
    catchAll: false,
    enabled: true,
    sortOrder: 3,
  },
  {
    id: 'rest-of-india',
    type: ZONE_TYPE.DELIVERY,
    name: 'Rest of India Delivery',
    areas: 'Everywhere else in India',
    charge: 200,
    pincodes: [],
    pincodePrefixes: [],
    // The catch-all: any valid Indian PIN code that no earlier zone matched.
    catchAll: true,
    enabled: true,
    sortOrder: 4,
  },
  {
    id: 'pickup',
    type: ZONE_TYPE.PICKUP,
    name: 'Store Pickup',
    areas: "Subwikha's Hub, Thondamuthur",
    charge: 0,
    pincodes: [],
    // Only customers in the main area may collect from the studio.
    pickupPincodes: MAIN_AREA_PINCODES,
    location: "Subwikha's Hub, Thondamuthur, Coimbatore, Tamil Nadu",
    instructions:
      'Place your order online and choose Direct Pickup. We will have it ready within your product\'s making time — message us on WhatsApp with your order ID once it is ready, and we will share the exact pickup timing and directions.',
    enabled: true,
    sortOrder: 5,
  },
];

/** The starter delivery settings. `freeDeliveryAbove: 0` means "never free automatically". */
export const DEFAULT_DELIVERY_SETTINGS = {
  // Rupees. 0 = delivery is never free automatically — the zone charge always
  // applies (the referral perk and returning-customer perk can still waive it).
  freeDeliveryAbove: 0,
  // Set to true once the owner manages their own zones, so an empty zone
  // collection then means "no delivery configured" rather than "fall back to
  // the starter zones".
  configured: false,
};

/** Shown when a pincode isn't covered by any enabled delivery zone. */
export const NOT_SERVICEABLE_MESSAGE =
  "Sorry! We currently don't deliver to this location. Please contact us to check delivery availability or choose direct pickup.";

/** Shown when the shop has no pickup zone enabled. */
export const PICKUP_UNAVAILABLE_MESSAGE =
  'Direct pickup is not available right now. Please choose home delivery or contact us.';

/**
 * Shown when the customer wants to collect from the studio but their PIN code
 * is outside the main area we offer collection in.
 */
export const PICKUP_NOT_IN_AREA_MESSAGE =
  'Direct pickup is only available for customers in our main delivery area (Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti & nearby). Please choose home delivery, or contact us and we will see what we can do.';

/**
 * Normalises whatever comes out of Firestore into a consistent zone list.
 * Unknown/missing fields get sensible defaults so a half-filled zone in the
 * admin panel can never crash the checkout.
 */
export function normalizeZones(rawZones) {
  if (!Array.isArray(rawZones)) return [];
  return rawZones
    .map((z, i) => ({
      id: z?.id || `zone_${i}`,
      type: z?.type === ZONE_TYPE.PICKUP ? ZONE_TYPE.PICKUP : ZONE_TYPE.DELIVERY,
      name: (z?.name || 'Delivery Zone').toString().slice(0, 60),
      areas: (z?.areas || '').toString().slice(0, 200),
      // A pickup zone is always free — the customer collects it themselves.
      charge: z?.type === ZONE_TYPE.PICKUP ? 0 : Math.max(0, parseInt(z?.charge, 10) || 0),
      pincodes: Array.isArray(z?.pincodes)
        ? z.pincodes.map(normalizePincode).filter(p => p.length === 6)
        : [],
      // PIN-code prefixes cover whole stretches of PIN codes (e.g. "6" for
      // everywhere in Tamil Nadu) without listing them one by one.
      pincodePrefixes: Array.isArray(z?.pincodePrefixes)
        ? z.pincodePrefixes
            .map(p => (p || '').toString().replace(/\D/g, ''))
            .filter(p => p.length >= 1 && p.length <= 6)
        : [],
      // A catch-all zone covers every PIN code no earlier zone matched.
      catchAll: z?.catchAll === true,
      location: (z?.location || '').toString().slice(0, 300),
      instructions: (z?.instructions || '').toString().slice(0, 1000),
      // The PIN codes allowed to collect from the studio. Only meaningful for
      // a pickup zone.
      pickupPincodes: Array.isArray(z?.pickupPincodes)
        ? z.pickupPincodes.map(normalizePincode).filter(p => p.length === 6)
        : [],
      enabled: z?.enabled !== false,
      sortOrder: Number.isFinite(z?.sortOrder) ? z.sortOrder : i,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The zone used for collection from the studio, if there is one. */
export function findPickupZone(zones) {
  return normalizeZones(zones).find(z => z.type === ZONE_TYPE.PICKUP && z.enabled) || null;
}

/**
 * Does this zone cover the pincode — either because the PIN code is listed
 * outright, or because it starts with one of the zone's prefixes?
 */
export function zoneCoversPincode(zone, pincode) {
  const p = normalizePincode(pincode);
  if (!isValidPincode(p)) return false;
  if (zone.catchAll) return true;
  if (zone.pincodes.includes(p)) return true;
  return zone.pincodePrefixes.some(prefix => p.startsWith(prefix));
}

/**
 * The delivery zone that covers a pincode, or null when the pincode is not
 * serviceable. Only enabled home-delivery zones are considered.
 *
 * Zones are checked in their configured order, so the specific Coimbatore
 * zones are always matched before the state-wide Tamil Nadu zone.
 */
export function findZoneForPincode(zones, pincode) {
  const p = normalizePincode(pincode);
  if (!isValidPincode(p)) return null;
  return normalizeZones(zones).find(
    z => z.type === ZONE_TYPE.DELIVERY && z.enabled && zoneCoversPincode(z, p)
  ) || null;
}

/** Every pincode that appears in more than one zone — a misconfiguration. */
export function duplicatePincodes(zones) {
  const seen = new Map();
  const dupes = new Set();
  normalizeZones(zones).forEach(zone => {
    if (zone.type !== ZONE_TYPE.DELIVERY) return;
    zone.pincodes.forEach(p => {
      if (seen.has(p) && seen.get(p) !== zone.id) dupes.add(p);
      seen.set(p, zone.id);
    });
  });
  return [...dupes];
}

/** "₹45" / "FREE" */
export function formatCharge(charge) {
  const n = Math.max(0, parseInt(charge, 10) || 0);
  return n === 0 ? 'FREE' : `₹${n.toLocaleString('en-IN')}`;
}

/** "6 pincodes" / "1 pincode" */
export function pincodeCountLabel(count) {
  return `${count} pincode${count === 1 ? '' : 's'}`;
}

/**
 * Can this customer collect from the studio?
 *
 * Collection is only offered to customers whose PIN code is in the pickup
 * zone's eligible list — the main area around the studio. Somebody further out
 * can still have the gift delivered, but the studio is out of their way.
 */
export function isPickupEligible(zones, pincode) {
  const pickupZone = findPickupZone(zones);
  if (!pickupZone) return false;
  const clean = normalizePincode(pincode);
  if (!isValidPincode(clean)) return false;
  return pickupZone.pickupPincodes.includes(clean);
}

/**
 * Works out how an order is delivered and what it costs.
 *
 * This is the single decision point for delivery pricing, and BOTH the
 * checkout (to show the customer) and api/create-order.js (to actually charge
 * them) call it with the same zone list — so the price on screen is the price
 * on the payment.
 *
 * `pincode` must be the pincode the parcel is going TO: the recipient's for a
 * gift order, the buyer's for a self order. The same PIN code decides whether
 * collection from the studio is available.
 *
 * Returns `{ error }` when the order can't be delivered as asked.
 */
export function resolveDelivery({ method, zones, pincode }) {
  const pickupZone = findPickupZone(zones);

  if (method === DELIVERY_METHOD.PICKUP) {
    if (!pickupZone) {
      return { error: PICKUP_UNAVAILABLE_MESSAGE };
    }
    const clean = normalizePincode(pincode);
    if (!isValidPincode(clean)) {
      return { error: 'Please enter a valid 6-digit PIN code.' };
    }
    if (!pickupZone.pickupPincodes.includes(clean)) {
      return { error: PICKUP_NOT_IN_AREA_MESSAGE };
    }
    return {
      method: DELIVERY_METHOD.PICKUP,
      zone: pickupZone,
      charge: 0,
      pincode: clean,
    };
  }

  const clean = normalizePincode(pincode);
  if (!isValidPincode(clean)) {
    return { error: 'Please enter a valid 6-digit PIN code.' };
  }
  const zone = findZoneForPincode(zones, clean);
  if (!zone) {
    return { error: NOT_SERVICEABLE_MESSAGE };
  }
  return {
    method: DELIVERY_METHOD.HOME,
    zone,
    charge: zone.charge,
    pincode: clean,
  };
}
