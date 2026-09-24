// Single source of truth for business facts. Everything that states a fact about the
// business — the homepage summary, llms.txt, JSON-LD, the footer NAP block, FAQ answers —
// imports from here, so the wording can never drift between pages.
//
// Plain ES module with no browser APIs, so scripts/prerender.mjs can import it in Node.
import { products } from './products.js';

export const SITE = {
  name: "Subwikha's Hub",
  tagline: 'Where Memories Become Gifts',
  // Change this ONE value when the custom domain goes live (e.g. https://subwikhahub.in) —
  // canonicals, sitemap, schema, og tags and llms.txt all derive from it.
  url: 'https://subwikhahub.vercel.app',
  city: 'Coimbatore',
  region: 'Tamil Nadu',
  country: 'IN',
  countryName: 'India',
  // Founder named in the business brief. TODO(owner): add a one-line founder story in
  // `founderStory` below (real details only) — About page and Organization schema use it
  // automatically once it's filled in.
  founder: 'Hema',
  founderStory: '',
  founded: 2024,
  email: 'dreamcraftersevents@gmail.com',
  // TODO(owner): no phone number was provided. Add one (e.g. '+91XXXXXXXXXX') and it
  // appears in the footer NAP block, Contact page and schema. Left null so nothing
  // fake is published.
  phone: null,
  instagramUrl: 'https://www.instagram.com/subwikhahub',
  instagramHandle: '@subwikhahub',
  ordersDelivered: '50+',
  supportHours: 'Monday to Saturday, 10am–7pm IST',
  // Order channel: website checkout (Razorpay) + Instagram DM for customization details.
  freeShippingAbove: 500,
  shippingFee: 80,
  // Courier transit after dispatch, and typical turnaround for custom photo pieces (from the
  // business brief). Per-product making time lives in products.js `deliveryDays`.
  transitTime: '3–4 days',
  customizationTime: '6 days',
  logo: '/logo.png',
  ogImage: '/og-image.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
};

export const BASE = SITE.url;
export const abs = (path = '/') => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

export const rupee = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Real catalog price range, computed — the business brief quoted ₹99–₹1099 but the live
// catalog runs ₹49 to ₹699 (Large chocolate bouquet), so the site states what it really sells.
const allPrices = products.flatMap((p) => [p.price, ...(p.priceVariants || []).map((v) => v.price)]);
export const PRICE_MIN = Math.min(...allPrices);
export const PRICE_MAX = Math.max(...allPrices);
export const PRICE_RANGE = `${rupee(PRICE_MIN)}–${rupee(PRICE_MAX)}`;

export const liveProducts = products.filter((p) => p.inStock !== false);

// Image files referenced in products.js that don't exist in public/images yet (see the note on
// the Custom Fridge Magnet in products.js). Static pages skip these instead of shipping a broken
// <img>/og:image; scripts/prerender.mjs verifies this list against the disk on every build, so it
// can't silently go stale — delete an entry once the photo is uploaded.
export const MISSING_IMAGES = new Set(['/images/magnet-1.webp']);
export const goodImages = (p) => [...new Set((p.images || []).filter((src) => !MISSING_IMAGES.has(src)))];

export function priceOf(p) {
  return p.priceVariants?.length
    ? { low: Math.min(...p.priceVariants.map((v) => v.price)), high: Math.max(...p.priceVariants.map((v) => v.price)) }
    : { low: p.price, high: p.price };
}

export function priceText(p) {
  const { low, high } = priceOf(p);
  return low === high ? rupee(low) : `${rupee(low)}–${rupee(high)}`;
}

export function daysText(p) {
  return `${String(p.deliveryDays || '3-5').replace('-', '–')} business days`;
}

export const CITY_LINE = `${SITE.city}, ${SITE.region}, ${SITE.countryName}`;

// Plain-language summary quoted by AI answer engines. Used verbatim under the homepage H1,
// at the top of llms.txt, and in the Organization schema description.
export const SUMMARY =
  `${SITE.name} is a handmade gift studio in ${SITE.city}, ${SITE.region}, founded in ${SITE.founded}. ` +
  `We make customized chocolate bouquets, resin art, personalized photo frames, keychains, night lights and memory keepsakes to order, ` +
  `priced from ${rupee(PRICE_MIN)} to ${rupee(PRICE_MAX)} and delivered across ${SITE.countryName}. ` +
  `Order on this website (secure Razorpay checkout) and send customization details on Instagram ${SITE.instagramHandle}.`;

export const DELIVERY_SUMMARY =
  `Gifts are made to order in ${SITE.city}: about 2–7 business days depending on the product (around ${SITE.customizationTime} for custom photo pieces), ` +
  `then ${SITE.transitTime} courier delivery across ${SITE.countryName}. Free shipping above ${rupee(SITE.freeShippingAbove)}, ${rupee(SITE.shippingFee)} below.`;
