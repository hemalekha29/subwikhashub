// Head + structured-data builders shared by two consumers:
//   1. scripts/prerender.mjs  — writes them into the static HTML of every route
//   2. src/components/Seo     — renders the SAME object via react-helmet-async at runtime
// Because both come from one object, the crawler-visible <head> and the in-browser <head>
// can't disagree (no duplicate/conflicting canonicals, titles or schema).
//
// Plain ES module, no browser APIs — importable from Node.
import { products } from '../data/products.js';
import {
  SITE, BASE, abs, rupee, priceOf, PRICE_RANGE, PRICE_MIN, PRICE_MAX, SUMMARY, CITY_LINE, DELIVERY_SUMMARY, goodImages,
} from '../data/site.js';
import { categoryPages, giftPages, blogPosts, buildProductFaqs } from '../data/seoContent.js';

const suffix = ` | ${SITE.name}`;

// ───────────────────────── JSON-LD builders ─────────────────────────
export function orgAndStoreSchema() {
  const sameAs = [SITE.instagramUrl];
  const contactPoint = {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: SITE.email,
    areaServed: SITE.country,
    availableLanguage: ['English', 'Tamil'],
    hoursAvailable: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '10:00',
      closes: '19:00',
    },
    ...(SITE.phone ? { telephone: SITE.phone } : {}),
  };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': abs('/#organization'),
        name: SITE.name,
        url: BASE,
        logo: { '@type': 'ImageObject', url: abs(SITE.logo) },
        image: abs(SITE.ogImage),
        description: SUMMARY,
        slogan: SITE.tagline,
        foundingDate: String(SITE.founded),
        founder: { '@type': 'Person', name: SITE.founder, ...(SITE.founderStory ? { description: SITE.founderStory } : {}) },
        email: SITE.email,
        ...(SITE.phone ? { telephone: SITE.phone } : {}),
        address: { '@type': 'PostalAddress', addressLocality: SITE.city, addressRegion: SITE.region, addressCountry: SITE.country },
        areaServed: { '@type': 'Country', name: SITE.countryName },
        sameAs,
        contactPoint,
        knowsAbout: ['Handmade gifts', 'Chocolate bouquets', 'Resin art', 'Personalized photo frames', 'Custom keychains', 'Night lights', 'Memory keepsakes'],
      },
      {
        '@type': 'Store',
        '@id': abs('/#store'),
        name: SITE.name,
        url: BASE,
        image: abs(SITE.ogImage),
        logo: abs(SITE.logo),
        description: SUMMARY,
        slogan: SITE.tagline,
        priceRange: PRICE_RANGE,
        currenciesAccepted: 'INR',
        paymentAccepted: 'UPI, Credit Card, Debit Card, Net Banking, Wallets',
        email: SITE.email,
        ...(SITE.phone ? { telephone: SITE.phone } : {}),
        address: { '@type': 'PostalAddress', addressLocality: SITE.city, addressRegion: SITE.region, addressCountry: SITE.country },
        areaServed: { '@type': 'Country', name: SITE.countryName },
        openingHoursSpecification: [{
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '10:00',
          closes: '19:00',
        }],
        parentOrganization: { '@id': abs('/#organization') },
        sameAs,
      },
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#website'),
    name: SITE.name,
    url: BASE,
    inLanguage: 'en-IN',
    publisher: { '@id': abs('/#organization') },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/shop?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function itemListSchema(list, name, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: abs(path),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: list.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: abs(`/product/${p.slug}`),
        name: p.name,
      })),
    },
  };
}

// Merchant-listing details that are true of every product on the site (see the Shipping and
// Returns pages): delivery charged by PIN-code zone (from ₹45, or free collection from the
// studio), courier ~3–4 days, no returns on customized items, damaged/incorrect items replaced
// or refunded if reported within 48h.
//
// There is deliberately no `shippingRate` here any more: the delivery charge now depends on
// the customer's PIN code, and a single flat rate in the schema would be a lie. The shipping
// page explains the zones instead.
function shippingDetails(p) {
  const [minMake, maxMake] = String(p.deliveryDays || '3-5').split('-').map(Number);
  return {
    '@type': 'OfferShippingDetails',
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: SITE.country },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: minMake, maxValue: maxMake, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 4, unitCode: 'DAY' },
    },
  };
}

const returnPolicy = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: SITE.country,
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
  merchantReturnLink: abs('/returns'),
};

export function productSchema(p, { outOfStock } = {}) {
  const oos = outOfStock ?? p.inStock === false;
  const availability = oos ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock';
  const url = abs(`/product/${p.slug}`);
  const common = {
    priceCurrency: 'INR',
    availability,
    url,
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': abs('/#organization') },
    shippingDetails: shippingDetails(p),
    hasMerchantReturnPolicy: returnPolicy,
  };
  const { low, high } = priceOf(p);
  const offers = low === high
    ? { '@type': 'Offer', price: String(low), ...common }
    : { '@type': 'AggregateOffer', lowPrice: String(low), highPrice: String(high), offerCount: p.priceVariants.length, ...common };
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    sku: p.slug,
    ...(goodImages(p).length ? { image: goodImages(p).map(abs) } : {}),
    brand: { '@type': 'Brand', name: SITE.name },
    category: p.category,
    offers,
    // No aggregateRating / review: none of the numbers in products.js are verified customer
    // reviews, and Google penalises fabricated ratings. Add only when real reviews exist.
  };
}

export function articleSchema(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    image: abs(post.image),
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: abs(`/blog/${post.slug}`),
    author: { '@type': 'Organization', name: SITE.name, url: BASE },
    publisher: { '@type': 'Organization', name: SITE.name, logo: { '@type': 'ImageObject', url: abs(SITE.logo) } },
  };
}

// ───────────────────────── Head objects ─────────────────────────
function head({ title, description, path, image, imageAlt, type = 'website', robots, jsonLd = [], preload }) {
  return {
    title,
    description,
    path,
    canonical: abs(path === '/' ? '/' : path),
    image: abs(image || SITE.ogImage),
    imageAlt: imageAlt || `${SITE.name} — ${SITE.tagline}`,
    isDefaultImage: !image,
    type,
    robots,
    jsonLd,
    preload,
  };
}

const crumb = (name, path) => ({ name, path });
const HOME = crumb('Home', '/');

export const staticHeads = {
  home: () => head({
    title: `Handmade Customized Gifts in Coimbatore${suffix}`,
    description: `Handmade customized gifts from ${SITE.city}: chocolate bouquets, resin art, photo frames, keychains and night lights from ${rupee(PRICE_MIN)}. Delivered across ${SITE.countryName}.`,
    path: '/',
    // The homepage hero's first slide (HeroShowcase SLIDE_IDS[0] = product id 8) is the LCP
    // element; preloading it here (homepage only) instead of on every route in index.html.
    preload: '/images/bouquet-1.webp',
    jsonLd: [orgAndStoreSchema(), websiteSchema()],
  }),
  shop: () => head({
    title: `Shop Handmade Gifts Online in India${suffix}`,
    description: `Browse all handmade gifts: chocolate bouquets, resin keychains, photo frames, night lights and flower bouquets from ${rupee(PRICE_MIN)}. Delivery charges are worked out from your PIN code at checkout.`,
    path: '/shop',
    jsonLd: [breadcrumbSchema([HOME, crumb('Shop', '/shop')])],
  }),
  about: () => head({
    title: `Our Story: Handmade Gifts from Coimbatore${suffix}`,
    description: `The story of ${SITE.name}: a handmade gift studio in ${SITE.city} founded in ${SITE.founded} by ${SITE.founder}, with ${SITE.ordersDelivered} orders delivered and every gift made by hand.`,
    path: '/about',
    jsonLd: [breadcrumbSchema([HOME, crumb('Our Story', '/about')])],
  }),
  contact: () => head({
    title: `Contact Custom Gift Makers in Coimbatore${suffix}`,
    description: `Contact ${SITE.name} in ${SITE.city} for custom gift orders and questions: Instagram ${SITE.instagramHandle}, email or the contact form. We reply within 24 hours, Mon–Sat.`,
    path: '/contact',
    jsonLd: [breadcrumbSchema([HOME, crumb('Contact', '/contact')])],
  }),
  faq: (faqs) => head({
    title: `FAQs: Ordering, Shipping & Custom Gifts${suffix}`,
    description: `Answers on ordering custom gifts, resin art timelines, photo customization, delivery across India, payment, returns and gift ideas under ₹1000.`,
    path: '/faq',
    jsonLd: [faqSchema(faqs), breadcrumbSchema([HOME, crumb('FAQ', '/faq')])],
  }),
  shipping: () => head({
    title: `Shipping, Delivery Time & Charges in India${suffix}`,
    description: `How shipping works at ${SITE.name}: making time by product, ${SITE.transitTime} courier delivery across India, and delivery charges worked out from your PIN code — ${rupee(SITE.deliveryChargeFrom)} for local areas around ${SITE.city}, ${rupee(SITE.deliveryChargeOuter)} for outer ${SITE.city}, ${rupee(SITE.deliveryChargeState)} elsewhere in ${SITE.region}, ${rupee(SITE.deliveryChargeIndia)} elsewhere in India, or free collection from our studio.`,
    path: '/shipping',
    jsonLd: [breadcrumbSchema([HOME, crumb('Shipping', '/shipping')])],
  }),
  returns: () => head({
    title: `Returns, Exchange & Refund Policy${suffix}`,
    description: `Returns policy: no returns on customized handmade items, replacement or refund for damaged items reported within 48 hours, and cancellation within 12 hours.`,
    path: '/returns',
    jsonLd: [breadcrumbSchema([HOME, crumb('Returns & Exchange', '/returns')])],
  }),
  privacy: () => head({
    title: `Privacy Policy: How We Handle Your Data${suffix}`,
    description: `How ${SITE.name} collects, uses and protects your name, email, phone and address, and how Razorpay secures payments. We never sell your data for marketing.`,
    path: '/privacy',
    jsonLd: [breadcrumbSchema([HOME, crumb('Privacy Policy', '/privacy')])],
  }),
  terms: () => head({
    title: `Terms of Service for Orders & Payments${suffix}`,
    description: `Terms of service for ${SITE.name}: made-to-order gifts, Razorpay payments, custom order terms, cancellations, delivery and how damaged items are handled.`,
    path: '/terms',
    jsonLd: [breadcrumbSchema([HOME, crumb('Terms of Service', '/terms')])],
  }),
  hamper: () => head({
    title: `Build a Custom Gift Hamper, Get 10% Off${suffix}`,
    description: `Build your own custom gift hamper: pick 2 to 4 handmade gifts from ${SITE.name} and the bundle gets an automatic 10% discount. Made to order in ${SITE.city}.`,
    path: '/hamper',
    jsonLd: [breadcrumbSchema([HOME, crumb('Build a Hamper', '/hamper')])],
  }),
  giftFinder: () => head({
    title: `Gift Finder Quiz: Find the Perfect Gift${suffix}`,
    description: `Not sure what to gift? Answer 3 quick questions about the occasion and budget and get a handmade gift recommendation from ${SITE.name} in seconds.`,
    path: '/gift-finder',
    jsonLd: [breadcrumbSchema([HOME, crumb('Gift Finder', '/gift-finder')])],
  }),
  game: () => head({
    title: `Play & Win Up to 10% Off Handmade Gifts${suffix}`,
    description: `Play quick mini-games like Memory Match, Word Scramble and the Gift Quiz on ${SITE.name} and win up to 10% off your next handmade gift order.`,
    path: '/game',
    jsonLd: [breadcrumbSchema([HOME, crumb('Play & Win', '/game')])],
  }),
  blog: () => head({
    title: `Gift Guides & Handmade Gift Ideas${suffix}`,
    description: `Gift guides from ${SITE.name}: chocolate vs flower bouquets, anniversary gift ideas in India and how resin art gifts are made by hand in ${SITE.city}.`,
    path: '/blog',
    jsonLd: [breadcrumbSchema([HOME, crumb('Blog', '/blog')])],
  }),
  notFound: () => head({
    title: `Page Not Found${suffix}`,
    description: `This page could not be found. Browse handmade gifts, chocolate bouquets, resin art and photo frames from ${SITE.name}.`,
    path: '/404',
    robots: 'noindex, follow',
  }),
};

// Product titles/descriptions are generated per product, so pick the wording variant that
// lands inside the recommended 50–60 / 140–160 character windows for THIS product's name.
function fitToRange(variants, min, max) {
  return variants.find((v) => v.length >= min && v.length <= max)
    || [...variants].sort((a, b) => Math.abs(a.length - (min + max) / 2) - Math.abs(b.length - (min + max) / 2))[0];
}

export function productHead(p, opts = {}) {
  const { low, high } = priceOf(p);
  const priceLine = low === high ? rupee(low) : `${rupee(low)}–${rupee(high)}`;
  const days = `${String(p.deliveryDays || '3-5').replace('-', '–')} business days`;
  const tag = (p.tagline || '').replace(/[.!]+$/, '').replace(/:\s*/g, ' – ');
  const titles = [
    `${p.name} Online in India${suffix}`,
    `Buy ${p.name} Online in India${suffix}`,
    `${p.name}: Handmade Gift Online${suffix}`,
    `Buy ${p.name}: Handmade in ${SITE.city}${suffix}`,
    `${p.name}: Handmade Gift in India${suffix}`,
    `${p.name} Online${suffix}`,
  ];
  const lead = tag ? `${p.name}: ${tag}.` : `${p.name}.`;
  const descs = [
    `${lead} Handmade to order in ${SITE.city}, ${priceLine}, ready in ${days}. Delivered across India.`,
    `${lead} Handmade to order in ${SITE.city}, ${priceLine}, ready in ${days}. Delivered across India with secure checkout.`,
    `${lead} Handmade to order in ${SITE.city} from ${priceLine}, ready in ${days}. Delivery charge worked out from your PIN code.`,
    `${lead} Handmade in ${SITE.city}, ${priceLine}, ready in ${days}, delivered across India. Secure Razorpay checkout.`,
    `${lead} Handmade to order in ${SITE.city}, ${priceLine}, ready in ${days}. Delivery charges by PIN-code zone across India.`,
    `${lead} Handmade to order in ${SITE.city}, ${priceLine}, ready in ${days}. Delivered across India. Secure Razorpay checkout.`,
  ];
  return head({
    title: fitToRange(titles, 50, 60),
    description: fitToRange(descs, 140, 160),
    path: `/product/${p.slug}`,
    image: goodImages(p)[0],
    imageAlt: productImageAlt(p, 0),
    type: 'product',
    jsonLd: [
      // Google requires `image` on Product rich results, so a product with no usable photo
      // (the Custom Fridge Magnet, until its photo is uploaded — see MISSING_IMAGES) gets no
      // Product schema rather than an invalid one.
      ...(goodImages(p).length ? [productSchema(p, opts)] : []),
      breadcrumbSchema([HOME, crumb('Shop', '/shop'), crumb(p.name, `/product/${p.slug}`)]),
      faqSchema(buildProductFaqs(p)),
    ],
  });
}

export function categoryHead(c, list) {
  return head({
    title: c.metaTitle,
    description: c.metaDescription,
    path: `/category/${c.slug}`,
    image: list[0]?.images[0],
    jsonLd: [
      itemListSchema(list, c.h1, `/category/${c.slug}`),
      breadcrumbSchema([HOME, crumb('Shop', '/shop'), crumb(c.name, `/category/${c.slug}`)]),
      faqSchema(c.faqs || []),
    ],
  });
}

export function giftHead(g, list) {
  return head({
    title: g.metaTitle,
    description: g.metaDescription,
    path: `/gifts/${g.slug}`,
    image: list[0]?.images[0],
    jsonLd: [
      itemListSchema(list, g.h1, `/gifts/${g.slug}`),
      breadcrumbSchema([HOME, crumb('Shop', '/shop'), crumb(g.name, `/gifts/${g.slug}`)]),
    ],
  });
}

export function blogHead(post) {
  return head({
    title: post.metaTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
    image: post.image,
    imageAlt: post.imageAlt,
    type: 'article',
    jsonLd: [
      articleSchema(post),
      breadcrumbSchema([HOME, crumb('Blog', '/blog'), crumb(post.title, `/blog/${post.slug}`)]),
    ],
  });
}

// Descriptive alt text, built from real product fields (name + what it is + where it's
// made) rather than "image1". Image 0 is the hero shot; later ones say which view they are.
export function productImageAlt(p, i = 0) {
  const base = `${p.name}${p.tagline ? ` — ${p.tagline.toLowerCase()}` : ''}, handmade in ${SITE.city}`;
  return i === 0 ? base : `${base} (photo ${i + 1})`;
}

// ───────────────────────── <head> HTML for prerender ─────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const scriptJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// data-rh="true" is react-helmet-async's marker: when the SPA boots, Helmet takes ownership
// of these exact tags and swaps them for its own identical ones, so no duplicates.
export function headToHtml(h) {
  const tags = [
    `<title data-rh="true">${esc(h.title)}</title>`,
    `<meta data-rh="true" name="description" content="${esc(h.description)}" />`,
    h.robots ? `<meta data-rh="true" name="robots" content="${esc(h.robots)}" />` : '',
    `<link data-rh="true" rel="canonical" href="${esc(h.canonical)}" />`,
    `<meta data-rh="true" property="og:type" content="${esc(h.type)}" />`,
    `<meta data-rh="true" property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta data-rh="true" property="og:locale" content="en_IN" />`,
    `<meta data-rh="true" property="og:title" content="${esc(h.title)}" />`,
    `<meta data-rh="true" property="og:description" content="${esc(h.description)}" />`,
    `<meta data-rh="true" property="og:url" content="${esc(h.canonical)}" />`,
    `<meta data-rh="true" property="og:image" content="${esc(h.image)}" />`,
    `<meta data-rh="true" property="og:image:alt" content="${esc(h.imageAlt)}" />`,
    h.isDefaultImage ? `<meta data-rh="true" property="og:image:width" content="${SITE.ogImageWidth}" />` : '',
    h.isDefaultImage ? `<meta data-rh="true" property="og:image:height" content="${SITE.ogImageHeight}" />` : '',
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${esc(h.title)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${esc(h.description)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${esc(h.image)}" />`,
    h.preload ? `<link rel="preload" as="image" href="${esc(h.preload)}" fetchpriority="high" />` : '',
    ...h.jsonLd.map((o) => `<script data-rh="true" type="application/ld+json">${scriptJson(o)}</script>`),
  ];
  return tags.filter(Boolean).join('\n    ');
}

export { PRICE_MAX, CITY_LINE, DELIVERY_SUMMARY, categoryPages, giftPages, blogPosts, products };
