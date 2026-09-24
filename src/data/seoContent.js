// Content for the crawlable landing pages: category pages (/category/:slug), occasion and
// budget pages (/gifts/:slug) and blog guides (/blog/:slug). Product facts (prices, making
// time, what's included) are always pulled from products.js at render time, never retyped
// here, so a price change in one place updates every page.
//
// Plain ES module (no JSX/browser APIs) so scripts/prerender.mjs can import it in Node.
import { products } from './products.js';
import { SITE, rupee, priceOf, priceText, daysText, PRICE_RANGE } from './site.js';

const live = products.filter((p) => p.inStock !== false);
const bySlug = (slug) => products.find((p) => p.slug === slug);

export function listStats(list) {
  const lows = list.map((p) => priceOf(p).low);
  const highs = list.map((p) => priceOf(p).high);
  const days = list.map((p) => String(p.deliveryDays).split('-').map(Number)).flat();
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  return {
    n: list.length,
    min,
    max,
    range: min === max ? rupee(min) : `${rupee(min)}–${rupee(max)}`,
    days: `${Math.min(...days)}–${Math.max(...days)}`,
  };
}

// ─────────────────────────── Category pages ───────────────────────────
// `match` picks products; `answer` is the 40–60 word direct answer AI engines quote.
export const categoryPages = [
  {
    slug: 'bouquets',
    name: 'Bouquets',
    h1: 'Handmade Chocolate Bouquets & Flower Bouquets in Coimbatore',
    metaTitle: "Chocolate & Handmade Bouquets Online | Subwikha's Hub",
    metaDescription:
      'Order a handmade chocolate bouquet or a pipe cleaner flower bouquet online. Made to order in Coimbatore, customizable, delivered across India from ₹179.',
    match: (p) => p.category === 'bouquets',
    answer: (s) =>
      `A bouquet from ${SITE.name} costs ${s.range}: chocolate bouquets start at ${rupee(299)} (small) and go up to ${rupee(699)} (large), while a pipe cleaner flower bouquet is ${rupee(179)}. Each is made to order in ${SITE.city} in ${s.days} business days and delivered across ${SITE.countryName}, with free shipping above ${rupee(SITE.freeShippingAbove)}.`,
    details: [
      { h: 'Sizes and customization', items: [
        'Chocolate bouquet: Small (from ₹299), Medium (₹499) or Large (₹699) — you choose the chocolates and add a personalized message card.',
        'Pipe cleaner flower bouquet: choose the flower colour, bouquet size (Small, Medium or Large) and wrapping style.',
      ] },
      { h: 'Materials', items: [
        'Chocolate bouquet: red roses, white flowers and baby\'s breath with chocolates of your choice, wrapped in premium black & gold paper with a red ribbon bow.',
        'Pipe cleaner bouquet: a handcrafted pipe cleaner flower with layered petals, green leaves and stem, wrapped in premium paper with a satin ribbon — it never wilts.',
      ] },
      { h: 'Delivery', items: [
        'Both bouquets take 3–5 business days to make, then courier delivery of about 3–4 days across India.',
      ] },
    ],
    faqs: [
      { q: 'How much does a chocolate bouquet cost?', a: `A chocolate bouquet from ${SITE.name} starts at ${rupee(299)} for a small bouquet, ${rupee(499)} for medium and ${rupee(699)} for large. The exact price depends on size and the chocolates you choose.` },
      { q: 'Can I choose the chocolates in my bouquet?', a: `Yes. Chocolates are chosen by you — share your preference with your order or by Instagram DM to ${SITE.instagramHandle}.` },
      { q: 'What is a good bouquet that lasts a long time?', a: `The pipe cleaner flower bouquet (${rupee(179)}) is handcrafted, never wilts and needs no watering, so it works as a lasting keepsake.` },
    ],
  },
  {
    slug: 'photo-frames',
    name: 'Photo Frames',
    h1: 'Personalized Photo Frames Online — Made to Order in Coimbatore',
    metaTitle: "Personalized Photo Frames Online in India | Subwikha's Hub",
    metaDescription: 'Custom photo frames in 4×4, A5 and A4 sizes with your photos, names and message. Wedding, anniversary and birthday frames made in Coimbatore from ₹179.',
    match: (p) => p.category === 'frames',
    answer: (s) =>
      `A personalized photo frame from ${SITE.name} costs ${s.range}: a 4×4 frame is ${rupee(179)}, the A5 Custom Photo Frame is ${rupee(399)}, and A4 birthday or wedding frames are ${rupee(499)}. Each is designed with your photos and text, made in ${s.days} business days, and delivered across ${SITE.countryName}.`,
    details: [
      { h: 'Sizes and options', items: [
        'Custom 4×4 Frame (₹179): compact white frame with a custom printed design, quote or photo.',
        'Custom Photo Frame, A5 (₹399): up to 3 Polaroid-style photos, calligraphy name, personal quote and a Spotify scan code of your song.',
        'Custom A4 Birthday Frame (₹499): birthday calendar with the date highlighted, a collage of up to 6 photos and a custom message, in a dark or pastel theme.',
        'A4 Wedding & Couple Frame (₹499): couple cutout photo on a vintage black & white memory collage with your names printed.',
      ] },
      { h: 'How customization works', items: [
        'Order the frame you want, then send your photos, names, dates and message. Every frame is designed for that order — no two are identical.',
      ] },
      { h: 'Delivery', items: [
        '4×4 frames take 3–5 business days; A5 and A4 designed frames take 5–7 business days, then about 3–4 days courier delivery.',
      ] },
    ],
    faqs: [
      { q: 'What photo frame sizes do you make?', a: 'Custom photo frames are available in 4×4 inch, A5 and A4 sizes, depending on the design you choose.' },
      { q: 'How many photos can I add to a frame?', a: 'The A5 Custom Photo Frame holds up to 3 Polaroid-style photos, and the A4 Birthday Frame supports a collage of up to 6 photos.' },
      { q: 'Which frame is best for an anniversary?', a: 'The A5 Custom Photo Frame (₹399) and the A4 Wedding & Couple Frame (₹499) are the most popular couple gifts.' },
    ],
  },
  {
    slug: 'resin-art',
    name: 'Resin Art',
    h1: 'Handmade Resin Art Gifts — Keychains, Coasters & Photo Keepsakes',
    metaTitle: "Resin Art Gifts, Keychains & Photo Coasters | Subwikha's Hub",
    metaDescription:
      'Handmade resin art gifts made in Coimbatore: resin photo keychains, pressed-flower heart and globe keychains, and custom resin photo coasters from ₹99.',
    match: (p) => ['resin', 'photo', 'coasters'].includes(p.category),
    answer: (s) =>
      `Resin art gifts from ${SITE.name} cost ${s.range}: resin letter, heart and globe keychains are ${rupee(99)}, the resin photo keychain is ${rupee(149)} and the custom resin photo coaster is ${rupee(259)}. Each piece is cast by hand in ${SITE.city} in ${s.days} business days and delivered across ${SITE.countryName}.`,
    details: [
      { h: 'What we make in resin', items: [
        'Resin Letter Keychain (₹99): a personalised resin charm with your initial.',
        'Resin Heart Keychain (₹99): heart-shaped charm with real pressed flowers and golden leaf accents.',
        'Resin Globe Keychain (₹99): dome-shaped charm with a real pressed flower in an amber-tinted globe.',
        'Resin Photo Keychain (₹149): your photo cast inside a clear round resin charm (about 4cm) on a silver keyring.',
        'Custom Resin Photo Coaster (₹259): circular coaster (about 10–12cm) with your photo, gold and silver foil flakes and engraved name or date, on a mini wooden easel.',
      ] },
      { h: 'Making time', items: [
        'Non-photo resin keychains take 3–5 business days. Photo pieces take 5–7 business days because the photo is printed and the resin needs time to cure. Every piece is one of a kind.',
      ] },
    ],
    faqs: [
      { q: 'How long does resin art take to make?', a: 'Resin keychains take 3–5 business days; resin photo keychains and photo coasters take 5–7 business days, plus delivery.' },
      { q: 'Can I put my own photo in resin?', a: 'Yes — the Resin Photo Keychain and Custom Resin Photo Coaster are both made with your own photo.' },
      { q: 'Are resin pieces identical?', a: 'No. Each resin piece is handmade, so small variations in pressed flowers, foil and finish make every piece unique.' },
    ],
  },
  {
    slug: 'keychains',
    name: 'Keychains',
    h1: 'Custom & Handmade Keychains Online — From ₹49',
    metaTitle: "Custom Keychains: Resin, Photo & Metal | Subwikha's Hub",
    metaDescription: 'Shop handmade and custom keychains: resin photo keychains, letter and flower keychains, pipe cleaner roses and bell keychains from ₹49, delivered across India.',
    match: (p) => ['metal', 'resin', 'photo', 'pipe'].includes(p.category),
    answer: (s) =>
      `Keychains at ${SITE.name} cost ${s.range}. Pipe cleaner flower keychains are ${rupee(49)}, resin letter, heart and globe keychains and the evil eye bell keychain are ${rupee(99)}, and the resin photo keychain is ${rupee(149)}. They are handmade in ${SITE.city}, ready in ${s.days} business days, and delivered across ${SITE.countryName}.`,
    details: [
      { h: 'Keychain types', items: [
        'Pipe cleaner keychains (₹49): flower, pink daisy and red rose designs in fabric pots.',
        'Resin keychains (₹99): letter, heart and globe charms.',
        'Resin Photo Keychain (₹149): your own photo cast in clear resin.',
        'Evil Eye Bell Keychain (₹99): antique-finish metal bell with an engraved phoenix, available in Gold, Silver and Bronze.',
      ] },
    ],
    faqs: [
      { q: 'What is the cheapest keychain?', a: 'The pipe cleaner flower, pink daisy and red rose keychains are the most affordable at ₹49 each.' },
      { q: 'Which keychain can hold my photo?', a: 'The Resin Photo Keychain (₹149) is cast with your own photo inside a clear resin circle.' },
    ],
  },
  {
    slug: 'night-lights',
    name: 'Night Lights',
    h1: 'Cute Night Lights & Colour-Changing Lamps as Gifts',
    metaTitle: "Night Lights & Colour-Changing Lamps | Subwikha's Hub",
    metaDescription:
      'Cute silicone animal night lights and a 7-colour panda lamp, USB rechargeable and gift-ready. Order online from ₹129 with delivery across India.',
    match: (p) => p.category === 'lighting',
    answer: (s) =>
      `Night lights from ${SITE.name} cost ${s.range}: the Cute Animal Night Light in panda, bear or unicorn is ${rupee(129)}, and the large Panda Colour-Changing Lamp with 7 light colours is ${rupee(399)}. Both are USB rechargeable, gift-ready, ready in ${s.days} business days and delivered across ${SITE.countryName}.`,
    details: [
      { h: 'Options', items: [
        'Cute Animal Night Light (₹129): soft silicone light with a warm white glow, in Panda, Bear or Unicorn designs.',
        'Panda Colour-Changing Lamp (₹399): large silicone panda in a knit scarf that cycles through white, red, green, blue, yellow, pink and purple.',
      ] },
    ],
    faqs: [
      { q: 'Are the night lights rechargeable?', a: 'Yes, both night lights are USB rechargeable.' },
      { q: 'What colours does the panda lamp show?', a: 'The Panda Colour-Changing Lamp cycles through 7 colours: white, red, green, blue, yellow, pink and purple.' },
    ],
  },
  {
    slug: 'pipe-cleaner-flowers',
    name: 'Pipe Cleaner Flowers',
    h1: 'Handmade Pipe Cleaner Flowers — Bouquets, Pots & Keychains',
    metaTitle: "Pipe Cleaner Flower Bouquets & Pots | Subwikha's Hub",
    metaDescription:
      "Handmade pipe cleaner flowers that never wilt: bouquets, a sunflower pot and flower keychains made to order in Coimbatore. From ₹49, delivered across India.",
    match: (p) => p.category === 'pipe' || p.category === 'pots' || p.slug === 'pipe-cleaner-flower-bouquet',
    answer: (s) =>
      `Pipe cleaner flowers from ${SITE.name} cost ${s.range}: keychains are ${rupee(49)}, the Sunflower Pot is ${rupee(129)} and the Flower Bouquet is ${rupee(179)}. They are handmade in ${SITE.city}, never wilt or need watering, take ${s.days} business days to make, and are delivered across ${SITE.countryName}.`,
    details: [
      { h: 'What is available', items: [
        'Pipe Cleaner Flower Bouquet (₹179): full-bloom flower with layered petals, wrapped in paper with a satin ribbon; choose colour and size.',
        'Pipe Cleaner Sunflower Pot (₹129): yellow sunflower with a maroon centre in a maroon fabric pot.',
        'Flower, Pink Daisy and Red Rose Keychains (₹49 each).',
      ] },
    ],
    faqs: [
      { q: 'Do pipe cleaner flowers wilt?', a: 'No. They are made entirely from pipe cleaners, so they stay fresh-looking, need no watering and last as a keepsake.' },
    ],
  },
];

// ─────────────────── Occasion, recipient and budget pages ───────────────────
// Occasion pages use the `occasion` tags already in products.js. The "for him / for her"
// picks are editorial (products.js has no recipient tags) — TODO(owner): review the slug
// lists below and swap any item you would not recommend for that recipient.
const FOR_HER = ['pipe-cleaner-flower-bouquet', 'chocolate-bouquet', 'resin-heart-keychain', 'red-rose-keychain', 'pink-daisy-keychain', 'panda-colour-changing-lamp', 'pipe-cleaner-sunflower-pot', 'custom-photo-frame'];
const FOR_HIM = ['evil-eye-bell-keychain', 'resin-photo-keychain', 'custom-photo-frame', 'custom-a4-birthday-frame', 'custom-resin-photo-coaster', 'resin-letter-keychain'];

export const giftPages = [
  {
    slug: 'birthday',
    name: 'Birthday Gifts',
    h1: 'Birthday Gifts — Handmade & Customized in Coimbatore',
    metaTitle: "Handmade Birthday Gifts Online in India | Subwikha's Hub",
    metaDescription:
      'Personalized birthday gifts made to order: birthday photo frames, chocolate bouquets, resin keychains and night lights. From ₹49, delivered across India.',
    match: (p) => p.occasion?.includes('Birthday'),
    answer: (s) =>
      `${s.n} handmade birthday gifts are available at ${SITE.name}, priced ${s.range}. Top picks are the Custom A4 Birthday Frame (${rupee(499)}), a Chocolate Bouquet (from ${rupee(299)}) and resin keychains (from ${rupee(99)}). Every gift is made to order in ${SITE.city} and delivered across ${SITE.countryName}.`,
    intro: 'Pick a birthday gift that carries a personal touch — a framed photo collage, a bouquet with their favourite chocolates, or a keychain made just for them.',
  },
  {
    slug: 'anniversary',
    name: 'Anniversary Gifts',
    h1: 'Anniversary Gifts — Personalized Keepsakes for Couples',
    metaTitle: "Handmade Anniversary Gifts for Couples | Subwikha's Hub",
    metaDescription:
      'Personalized anniversary gifts: couple photo frames, chocolate bouquets, resin photo keychains and rose keychains, made to order and delivered across India.',
    match: (p) => p.occasion?.includes('Anniversary'),
    answer: (s) =>
      `${SITE.name} has ${s.n} handmade anniversary gifts priced ${s.range}. Popular choices are the A4 Wedding & Couple Frame (${rupee(499)}), the Custom Photo Frame (${rupee(399)}) and a Chocolate Bouquet (from ${rupee(299)}). Each gift is made to order in ${SITE.city}, ready in ${s.days} business days, and delivered across ${SITE.countryName}.`,
    intro: 'Anniversary gifts work best when they hold your own memories — photos, names and dates — so most of these are personalized for the two of you.',
  },
  {
    slug: 'for-couples',
    name: 'Gifts for Couples',
    h1: 'Gifts for Couples — Photo Keepsakes, Bouquets & More',
    metaTitle: "Gifts for Couples: Photo Frames & Keepsakes | Subwikha's Hub",
    metaDescription: "Handmade gifts for couples: photo frames, resin photo keychains, chocolate bouquets and rose keychains for anniversaries, weddings and Valentine's Day.",
    match: (p) => p.occasion?.some((o) => ['Anniversary', "Valentine's Day", 'Wedding'].includes(o)),
    answer: (s) =>
      `${s.n} handmade gifts for couples are available at ${SITE.name}, priced ${s.range}. They cover anniversaries, weddings and Valentine's Day, from resin photo keychains (${rupee(149)}) and rose keychains (${rupee(49)}) to couple photo frames (${rupee(399)}–${rupee(499)}). All are made to order in ${SITE.city} and delivered across ${SITE.countryName}.`,
    intro: 'For two people, the best gifts are shared ones: a framed photo, matching keychains, or a bouquet you open together.',
  },
  {
    slug: 'for-him',
    name: 'Gifts for Him',
    h1: 'Gifts for Him — Handmade & Personalized Picks',
    metaTitle: "Handmade Gifts for Him: Keychains & Frames | Subwikha's Hub",
    metaDescription: 'Thoughtful handmade gifts for him: evil eye bell keychain, resin photo keychain, photo and birthday frames and photo coasters from ₹99, delivered across India.',
    slugs: FOR_HIM,
    answer: (s) =>
      `${s.n} handmade gift picks for him are available at ${SITE.name}, priced ${s.range}. Favourites include the Evil Eye Bell Keychain (${rupee(99)}), the Resin Photo Keychain (${rupee(149)}) and personalized photo frames (${rupee(399)}–${rupee(499)}). Each is made to order in ${SITE.city} and delivered across ${SITE.countryName}.`,
    intro: 'Useful or sentimental beats generic: a keychain he carries daily, or a frame that puts a shared memory on his desk.',
  },
  {
    slug: 'for-her',
    name: 'Gifts for Her',
    h1: 'Gifts for Her — Bouquets, Keepsakes & Cute Lamps',
    metaTitle: "Handmade Gifts for Her: Bouquets & More | Subwikha's Hub",
    metaDescription: 'Handmade gifts for her: chocolate and pipe cleaner bouquets, resin heart and rose keychains, a panda lamp and a photo frame from ₹49, delivered across India.',
    slugs: FOR_HER,
    answer: (s) =>
      `${s.n} handmade gift picks for her are available at ${SITE.name}, priced ${s.range}. Popular choices are the Chocolate Bouquet (from ${rupee(299)}), the Pipe Cleaner Flower Bouquet (${rupee(179)}), the Resin Heart Keychain (${rupee(99)}) and the Panda Colour-Changing Lamp (${rupee(399)}). Made to order in ${SITE.city}, delivered across ${SITE.countryName}.`,
    intro: 'Flowers that never wilt, a bouquet with chocolates, or a small resin heart with real pressed flowers — gifts made to feel personal.',
  },
  {
    slug: 'under-500',
    name: 'Gifts Under ₹500',
    h1: 'Gifts Under ₹500 — Handmade Keepsakes on a Budget',
    metaTitle: "Handmade Gifts Under ₹500 in India | Subwikha's Hub",
    metaDescription: 'Handmade gifts under ₹500: keychains from ₹49, resin charms, photo frames, night lights and flower bouquets made in Coimbatore, delivered across India.',
    match: (p) => priceOf(p).high < 500,
    answer: (s) =>
      `${s.n} handmade gifts at ${SITE.name} cost under ${rupee(500)} in every size option, ranging ${s.range}. Pipe cleaner keychains start at ${rupee(49)}, resin keychains at ${rupee(99)}, and photo frames, lamps and bouquets stay below ${rupee(500)}. All are made to order in ${SITE.city} and delivered across ${SITE.countryName}.`,
    intro: 'A small budget doesn’t mean a generic gift — everything here is handmade, and many pieces can carry a photo, name or message.',
  },
  {
    slug: 'under-1000',
    name: 'Gifts Under ₹1000',
    h1: 'Gifts Under ₹1000 — Premium Handmade Picks',
    metaTitle: "Premium Handmade Gifts Under ₹1000 in India | Subwikha's Hub",
    metaDescription: 'Premium handmade gifts under ₹1000: personalized frames, chocolate bouquets in three sizes and a colour-changing panda lamp, delivered across India.',
    // The upper-mid tier of the catalog. Every item is under ₹1000 (the top price is ₹699);
    // this page focuses on the ₹300+ pieces so it isn't a duplicate of the under-₹500 page.
    match: (p) => priceOf(p).high >= 300,
    answer: (s) =>
      `${s.n} premium handmade gifts at ${SITE.name} cost under ${rupee(1000)}, priced ${s.range}. They include personalized photo, birthday and wedding frames (${rupee(399)}–${rupee(499)}), the Panda Colour-Changing Lamp (${rupee(399)}) and chocolate bouquets in small, medium and large sizes (${rupee(299)}–${rupee(699)}). Made to order in ${SITE.city}.`,
    intro: 'When the occasion calls for something bigger, these are the statement pieces — still well under ₹1000, and made just for the receiver.',
  },
];

// Resolve a page's product list (live products only, so an out-of-stock item is never
// promoted on a landing page).
export function productsForPage(page) {
  const list = page.slugs ? page.slugs.map(bySlug).filter(Boolean) : live.filter(page.match);
  return list.filter((p) => p.inStock !== false);
}

// ─────────────────────────── Blog guides ───────────────────────────
export const BLOG_DATE = '2026-09-24';

const link = (slug) => `/product/${slug}`;

export const blogPosts = [
  {
    slug: 'chocolate-bouquet-vs-flower-bouquet',
    title: 'Chocolate Bouquet vs Flower Bouquet: Which Gift Is Better?',
    metaTitle: "Chocolate vs Flower Bouquet: Which Wins? | Subwikha's Hub",
    metaDescription: 'Chocolate bouquet or flower bouquet? Compare price, lifespan, customization and best occasions for a chocolate and a pipe cleaner flower bouquet in India.',
    date: BLOG_DATE,
    image: '/images/bouquet-1.webp',
    imageAlt: 'Handmade chocolate bouquet with red roses wrapped in black and gold paper',
    answer:
      `Choose a chocolate bouquet if you want a gift that is part flowers and part treat; choose a pipe cleaner flower bouquet if you want something that never wilts and stays as a keepsake. At ${SITE.name}, chocolate bouquets start at ${rupee(299)} and pipe cleaner flower bouquets cost ${rupee(179)}.`,
    sections: [
      { h: 'The short comparison', table: {
        head: ['', 'Chocolate bouquet', 'Pipe cleaner flower bouquet'],
        rows: [
          ['Price', '₹299 (small), ₹499 (medium), ₹699 (large)', '₹179'],
          ['What is inside', 'Red roses, white flowers, baby\'s breath and chocolates of your choice', 'A handcrafted pipe cleaner flower with layered petals, leaves and stem'],
          ['How long it lasts', 'Fresh flowers last a few days; the chocolates are eaten', 'Never wilts and needs no watering — keeps indefinitely'],
          ['Customization', 'Size, chocolate choice, personalized message card', 'Flower colour, bouquet size, wrapping style'],
          ['Made in', '3–5 business days', '3–5 business days'],
          ['Best for', 'Birthdays, anniversaries, Valentine\'s Day', 'Anniversaries, Valentine\'s Day, birthdays, "just because"'],
        ],
      } },
      { h: 'When a chocolate bouquet is the better gift', paras: [
        'A chocolate bouquet suits moments that call for something to enjoy right away — a birthday surprise, a proposal, an anniversary dinner. It combines the look of a flower bouquet with chocolates the receiver can share, and the personalized message card makes it feel written for them.',
        'It is also the better choice when you want size options: the small bouquet is ₹299, the medium ₹499 and the large ₹699, so you can match the gift to the occasion.',
      ] },
      { h: 'When a pipe cleaner flower bouquet is the better gift', paras: [
        'A pipe cleaner bouquet is handmade from pipe cleaners, so it never wilts. That makes it ideal for long-distance gifting, for people who don\'t have time for flower care, and for anyone who wants to keep the gift on a desk or shelf for years.',
        'At ₹179 it is also the more budget-friendly option, and you can pick the flower colour, size and wrapping style.',
      ] },
      { h: 'Can you give both?', paras: [
        'Yes — the Build a Hamper tool lets you combine 2 to 4 gifts and takes 10% off the bundle, so a chocolate bouquet plus a lasting keepsake is an easy pairing.',
      ] },
    ],
    related: ['chocolate-bouquet', 'pipe-cleaner-flower-bouquet'],
  },
  {
    slug: 'anniversary-gift-ideas-india',
    title: '10 Unique Anniversary Gift Ideas in India (Handmade, Under ₹700)',
    metaTitle: "10 Unique Anniversary Gift Ideas in India | Subwikha's Hub",
    metaDescription:
      'Ten handmade anniversary gift ideas in India under ₹700: photo frames, resin photo keychains, chocolate bouquets, rose keychains and more, all made to order.',
    date: BLOG_DATE,
    image: '/images/frame-6.webp',
    imageAlt: 'A4 wedding and couple photo frame with a vintage black and white memory collage',
    answer:
      `The best anniversary gifts are the ones that carry your shared memories. Ten handmade ideas, all under ${rupee(700)}: a couple photo frame, a resin photo keychain, a chocolate bouquet, a resin heart keychain, a red rose keychain, a pipe cleaner bouquet, a resin photo coaster, a panda lamp, a 4×4 frame and a custom hamper.`,
    sections: [
      { h: 'Photo-based gifts', paras: ['Anything that holds a photo of the two of you is the safest anniversary choice.'], list: [
        { slug: 'a4-wedding-couple-frame', note: 'a large couple cutout on a vintage black & white memory collage with your names printed.' },
        { slug: 'custom-photo-frame', note: 'Polaroid-style photos, a calligraphy title, a quote and a Spotify code for "your song".' },
        { slug: 'resin-photo-keychain', note: 'your photo preserved in clear resin on a keyring you can carry every day.' },
        { slug: 'custom-resin-photo-coaster', note: 'a photo coaster with gold and silver foil, engraved with a date or name, on a mini easel.' },
        { slug: 'custom-4x4-frame', note: 'a small frame with a custom printed photo or quote for a desk or shelf.' },
      ] },
      { h: 'Romantic and sweet gifts', list: [
        { slug: 'chocolate-bouquet', note: 'roses and chocolates in one bouquet, with a personalized message card.' },
        { slug: 'pipe-cleaner-flower-bouquet', note: 'a bouquet that never wilts, so the anniversary flowers last all year.' },
        { slug: 'resin-heart-keychain', note: 'a heart-shaped resin charm with real pressed flowers.' },
        { slug: 'red-rose-keychain', note: 'a layered pipe cleaner rose — a tiny, budget-friendly "I love you".' },
        { slug: 'panda-colour-changing-lamp', note: 'a cuddly lamp that glows in 7 colours for a cosy bedside.' },
      ] },
      { h: 'Making it a set', paras: [
        'Not sure which one? Combine two or three with the Build a Hamper tool (10% off bundles of 2–4 gifts) — for example a framed photo plus a chocolate bouquet.',
        `Most photo gifts take 5–7 business days to make, so order about two weeks before the date to allow for courier delivery.`,
      ] },
    ],
    related: ['a4-wedding-couple-frame', 'custom-photo-frame', 'chocolate-bouquet'],
  },
  {
    slug: 'how-resin-art-gifts-are-made',
    title: 'How Resin Art Gifts Are Made: Keychains, Coasters & Photo Keepsakes',
    metaTitle: "How Resin Art Gifts Are Made, Step by Step | Subwikha's Hub",
    metaDescription:
      'See how resin art gifts are made, from setting a photo or pressed flower in a mould to curing and finishing, and why custom resin pieces take 3–7 business days.',
    date: BLOG_DATE,
    image: '/images/resin-coaster-1.webp',
    imageAlt: 'Custom resin photo coaster with gold and silver foil on a mini wooden easel',
    answer:
      `Resin art gifts are made by setting a photo, pressed flower or foil inside a mould, pouring clear resin over it, letting it cure fully, then finishing the edges. That is why custom pieces from ${SITE.name} take 3–5 business days for resin keychains and 5–7 business days for photo pieces.`,
    // TODO(owner): this describes the general resin-casting process. Add the specifics of
    // your own workflow (moulds, resin type, curing time, finishing) to make it first-hand.
    sections: [
      { h: 'Step 1: Design and prepare the piece', paras: [
        'Everything starts with what goes inside: a customer\'s photo, a real pressed flower, a letter, or metallic foil flakes. Photos are printed at the right size for the charm or coaster, and flowers are pressed and dried beforehand so they don\'t spoil inside the resin.',
      ] },
      { h: 'Step 2: Set it in a mould and pour', paras: [
        'The items are arranged in a mould shaped like the final piece — a heart, a globe, a letter or a round coaster. Clear resin is then mixed and poured slowly so it covers the design without trapping air bubbles.',
      ] },
      { h: 'Step 3: Cure', paras: [
        'Resin has to cure completely before it can be handled, which is the main reason handmade resin gifts take days rather than hours. Rushing this step leaves a soft or cloudy finish.',
      ] },
      { h: 'Step 4: Finish and pack', paras: [
        'Once cured, the piece is released from the mould, the edges are smoothed, and hardware such as a keyring is attached. Coasters can be engraved with a name or date and are displayed on a small wooden easel; everything is gift-packed.',
      ] },
      { h: 'How long resin gifts take at Subwikha\'s Hub', table: {
        head: ['Gift', 'Price', 'Making time'],
        rows: [
          ['Resin letter, heart and globe keychains', '₹99', '3–5 business days'],
          ['Resin photo keychain', '₹149', '5–7 business days'],
          ['Custom resin photo coaster', '₹259', '5–7 business days'],
        ],
      } },
      { h: 'Caring for resin art', paras: [
        'Keep resin pieces away from prolonged direct sunlight, heat and harsh chemicals, and wipe them with a soft, dry cloth to keep the shine.',
      ] },
    ],
    related: ['resin-photo-keychain', 'custom-resin-photo-coaster', 'resin-heart-keychain'],
  },
];

export const blogBySlug = (slug) => blogPosts.find((b) => b.slug === slug);
export const categoryBySlug = (slug) => categoryPages.find((c) => c.slug === slug);
export const giftBySlug = (slug) => giftPages.find((g) => g.slug === slug);
export const blogLink = link;
export { PRICE_RANGE, priceText, daysText };

// ─────────────────────────── Product FAQs ───────────────────────────
// Derived only from fields already in products.js, so nothing is invented.
export function buildProductFaqs(p) {
  const faqs = [];
  faqs.push({
    q: `How much does the ${p.name} cost?`,
    a: p.priceVariants?.length
      ? `The ${p.name} is ${priceText(p)} depending on size: ${p.priceVariants.map((v) => `${v.label} ${rupee(v.price)}`).join(', ')}. Free shipping applies on orders above ${rupee(SITE.freeShippingAbove)}.`
      : `The ${p.name} costs ${rupee(p.price)}. Free shipping applies on orders above ${rupee(SITE.freeShippingAbove)}; below that, shipping is ${rupee(SITE.shippingFee)}.`,
  });
  faqs.push({
    q: `How long does the ${p.name} take to make and deliver?`,
    a: `It is made to order in ${daysText(p)} in ${SITE.city}, followed by courier delivery of about ${SITE.transitTime} across ${SITE.countryName}.`,
  });
  faqs.push({
    q: `Can the ${p.name} be customized?`,
    a: p.customizable
      ? `Yes. ${(p.customOptions || []).length ? `You can customize: ${p.customOptions.map((o) => o.label.toLowerCase()).join(', ')}. ` : ''}Send your details with the order or by Instagram DM to ${SITE.instagramHandle}.`
      : `This design is sold as shown and is not customizable. Choose the ${p.variants?.length ? 'available option (' + p.variants.join(', ') + ')' : 'design'} at checkout.`,
  });
  if (p.includes?.length) {
    faqs.push({ q: `What is included with the ${p.name}?`, a: `${p.includes.join('; ')}.` });
  }
  return faqs;
}
