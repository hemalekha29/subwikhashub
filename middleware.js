const BOT_UA =
  /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot|applebot|ia_archiver/i;

const BASE = 'https://subwikhahub.vercel.app';

const PRODUCTS = {
  'pipe-cleaner-flower-bouquet': {
    name: 'Pipe Cleaner Flower Bouquet',
    image: '/images/pipe-bouquet-1.webp',
    desc: 'A large, show-stopping bouquet crafted entirely from pipe cleaners. A gift that never wilts and lasts forever. Completely customizable.',
    price: '179',
  },
  'custom-resin-photo-coaster': {
    name: 'Custom Resin Photo Coaster',
    image: '/images/resin-coaster-1.webp',
    desc: 'Your favourite photo embedded in stunning gold & silver resin, displayed on a wooden easel. Handcrafted to order in Coimbatore.',
    price: '259',
  },
  'evil-eye-bell-keychain': {
    name: 'Evil Eye Bell Keychain',
    image: '/images/evil-eye-1.webp',
    desc: 'A stunning antique-finish metal bell keychain with a hand-engraved phoenix and blue evil eye charm. Available in Gold, Silver & Bronze.',
    price: '99',
  },
  'a4-wedding-couple-frame': {
    name: 'A4 Wedding & Couple Frame',
    image: '/images/frame-6.webp',
    desc: 'A timeless A4 frame with your couple photo set against a vintage black & white memory collage. A deeply personal wedding gift.',
    price: '499',
  },
  // 'custom-fridge-magnet' intentionally omitted: its image (/images/magnet-1.webp)
  // doesn't exist in public/images (see src/data/products.js, marked out of stock for
  // the same reason). Bots hitting this product page fall through to the default
  // site-wide preview instead of a broken image — re-add here once a real photo exists.
  'panda-colour-changing-lamp': {
    name: 'Panda Colour-Changing Lamp',
    image: '/images/cute-panda-7-1.webp',
    desc: 'An adorable panda night light that glows in 7 stunning colours. Soft silicone body, USB rechargeable — a gift that lights up someone\'s day.',
    price: '399',
  },
  'cute-animal-night-light': {
    name: 'Cute Animal Night Light',
    image: '/images/lamp-1.webp',
    desc: 'A soft silicone animal night light in Panda, Bear or Unicorn designs. Gentle warm glow — the cutest little gift that glows.',
    price: '129',
  },
  'custom-a4-birthday-frame': {
    name: 'Custom A4 Birthday Frame',
    image: '/images/frame-4.webp',
    desc: 'A rich A4 frame with a birthday calendar, multi-photo collage and your personal message. A gift they will treasure for years.',
    price: '499',
  },
  'custom-4x4-frame': {
    name: 'Custom 4×4 Frame',
    image: '/images/frame-2.webp',
    desc: 'A compact 4×4 inch white frame with your custom printed design — perfect for quotes, couple photos or devotional prints.',
    price: '179',
  },
  'custom-photo-frame': {
    name: 'Custom Photo Frame',
    image: '/images/frame-1.webp',
    desc: 'An A5 white frame with Polaroid-style photos, calligraphy name, personal quote and Spotify scan code. A truly one-of-a-kind keepsake.',
    price: '399',
  },
  'pipe-cleaner-sunflower-pot': {
    name: 'Pipe Cleaner Sunflower Pot',
    image: '/images/sunflower-pot-1.webp',
    desc: 'A cheerful handmade sunflower arrangement that stays fresh forever and never needs watering. Sunshine on any desk.',
    price: '129',
  },
  'chocolate-bouquet': {
    name: 'Chocolate Bouquet',
    image: '/images/bouquet-1.webp',
    desc: 'Handmade roses with your chosen chocolates — beautifully wrapped in premium black & gold paper. The ultimate gift for any occasion.',
    price: '299',
  },
  'resin-photo-keychain': {
    name: 'Resin Photo Keychain',
    image: '/images/resin-photo-1.webp',
    desc: 'Carry your most precious memory everywhere. Your favourite photo cast in beautiful clear resin — handmade with love.',
    price: '149',
  },
  'resin-letter-keychain': {
    name: 'Resin Letter Keychain',
    image: '/images/resin-4.webp',
    desc: 'A personalised resin charm with your initial, paired with a handcrafted pipe cleaner sunflower bouquet. No two alike.',
    price: '99',
  },
  'resin-heart-keychain': {
    name: 'Resin Heart Keychain',
    image: '/images/resin-3.webp',
    desc: 'A delicate heart-shaped resin charm with real pressed flowers and golden leaf accents. Made with love for someone special.',
    price: '99',
  },
  'resin-globe-keychain': {
    name: 'Resin Globe Keychain',
    image: '/images/resin-5.webp',
    desc: 'A stunning dome-shaped resin charm with a real pressed flower captured inside an amber-tinted globe. Each piece is one-of-a-kind.',
    price: '99',
  },
  'pipe-cleaner-flower-keychain': {
    name: 'Pipe Cleaner Flower Keychain',
    image: '/images/pipe-1.webp',
    desc: 'An adorable handmade keychain with a colourful pipe cleaner flower in a fabric pot — sweet, meaningful and made by hand.',
    price: '49',
  },
  'pink-daisy-keychain': {
    name: 'Pink Daisy Keychain',
    image: '/images/pipe-2.webp',
    desc: 'A pretty pink pipe cleaner daisy with a sky-blue centre — soft, cheerful and made entirely by hand. Perfect for flower lovers.',
    price: '49',
  },
  'red-rose-keychain': {
    name: 'Red Rose Keychain',
    image: '/images/pipe-3.webp',
    desc: 'A lush red pipe cleaner rose with layered petals — a classic gift for Valentine\'s Day, anniversaries, or just to say "I love you".',
    price: '49',
  },
};

// Non-product static routes. `/` is deliberately NOT listed here — the root already
// serves index.html's own homepage meta tags to every request (bot or not), so there's
// no gap there. These are the routes where a bot that doesn't execute JS (WhatsApp,
// Facebook, Twitter/X, LinkedIn, Slack, Telegram, Discord link-preview scrapers — none
// of them run the SPA's React Helmet) would otherwise see that same generic homepage
// card instead of the page it actually shared. Copy is kept identical to each page's
// own <Helmet> block (see src/pages/**/*.jsx) — if you change one, change both.
const PAGES = {
  '/shop': {
    title: "Shop Handcrafted Gifts | Subwikha's Hub",
    desc: "Shop handcrafted gifts from Coimbatore — custom resin keychains, chocolate bouquets, personalized photo frames, night lights & pipe cleaner flowers. Free shipping above ₹500 across India.",
  },
  '/about': {
    title: "Our Story | Subwikha's Hub",
    desc: "Learn the story behind Subwikha's Hub — a handcrafted gift brand based in Coimbatore, Tamil Nadu, creating personalized keepsakes and unique gifts with love since 2024.",
  },
  '/contact': {
    title: "Contact Us | Subwikha's Hub",
    desc: "Contact Subwikha's Hub — Coimbatore's handcrafted gift brand. Reach us for custom gift orders, personalized keepsakes, or any queries via the contact form or Instagram DM.",
  },
  '/game': {
    title: "Play & Win Discounts | Subwikha's Hub Game Zone",
    desc: "Win up to 10% OFF by playing mini-games — Memory Match, Word Scramble, Gift Quiz and more!",
  },
  '/shipping': {
    title: "Shipping Info | Subwikha's Hub",
    desc: "Learn about Subwikha's Hub shipping and delivery timelines. Free shipping on orders above ₹500. Handmade items dispatched across India.",
  },
  '/returns': {
    title: "Returns & Exchange | Subwikha's Hub",
    desc: "Read Subwikha's Hub return and exchange policy. Custom handmade orders are non-returnable. Damaged items are replaced within 48 hours of delivery.",
  },
  '/privacy': {
    title: "Privacy Policy | Subwikha's Hub",
    desc: "Subwikha's Hub privacy policy — how we collect, use and protect your personal information. Payments secured by Razorpay.",
  },
  '/terms': {
    title: "Terms of Service | Subwikha's Hub",
    desc: "Read the terms of service for Subwikha's Hub. All orders are handmade to order, paid via Razorpay, and non-refundable for custom items.",
  },
  '/hamper': {
    title: "Build a Hamper | Subwikha's Hub",
    desc: "Build your own custom gift hamper — pick 2 to 4 handcrafted gifts and get 10% off the bundle.",
  },
  '/gift-finder': {
    title: "Gift Finder | Subwikha's Hub",
    desc: "Not sure what to gift? Answer 3 quick questions and we'll recommend the perfect handcrafted gift for the occasion and budget.",
  },
};

export const config = {
  matcher: [
    '/product/:slug*',
    '/shop', '/about', '/contact', '/game',
    '/shipping', '/returns', '/privacy', '/terms',
    '/hamper', '/gift-finder',
  ],
};

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return; // real browser → let the SPA handle it

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (pathname.startsWith('/product/')) {
    const slug = pathname.replace('/product/', '');
    const p = PRODUCTS[slug];
    if (!p) return;
    return renderHtml({
      title: `${p.name} | Subwikha's Hub`,
      desc: p.desc,
      image: `${BASE}${p.image}`,
      canonical: `${BASE}/product/${slug}`,
      ogType: 'product',
      price: p.price,
    });
  }

  const page = PAGES[pathname];
  if (!page) return;
  return renderHtml({
    title: page.title,
    desc: page.desc,
    image: `${BASE}/logo.png`,
    canonical: `${BASE}${pathname}`,
    ogType: 'website',
  });
}

function renderHtml({ title, desc, image, canonical, ogType, price }) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Subwikha's Hub" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="800" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:locale" content="en_IN" />
  ${price ? `<meta property="product:price:amount" content="${price}" />\n  <meta property="product:price:currency" content="INR" />` : ''}

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />

  <link rel="canonical" href="${canonical}" />
</head>
<body>
  <script>window.location.replace("${canonical}")</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
