// About-page copy, shared by src/pages/About/About.jsx (visitors) and the build-time
// prerender (crawlers), so the two can't drift. Real facts only — the founding story,
// timeline and 50+ order count come from the existing About page; nothing here is new
// business information.
import { SITE } from './site.js';

export const storyParagraphs = [
  "Subwikha's Hub began in 2024 with a simple dream: creating handmade gifts that bring genuine happiness to people.",
  'What started as a small idea quickly became something special. When the first few gifts were made, friends and family responded with love and encouragement. That support gave the confidence to turn a personal passion into a real business.',
  "The journey wasn't always easy. After completing several orders, there came a pause: nearly 10 months of doubt, of questioning whether this dream could truly grow. But the love for creating meaningful gifts never left.",
  'With renewed determination came a comeback: fresh ideas, unique designs, and more personalized creations. From chocolate bouquets and resin art to customized gifts and handmade keepsakes, every product is crafted with care and attention to detail.',
];
export const storyHighlight =
  'Today, 50+ orders in and still growing: fuelled by wonderful customers, friends, and family. Every order is motivation to create something even more special. This is just the beginning.';
export const storyThanks = 'Thank you for being part of our story. ❤';

export const milestones = [
  { year: '2024', label: 'The Beginning', text: "Subwikha's Hub was born: the first handmade gifts created with love and shared with friends and family." },
  { year: '~10mo', label: 'A Pause to Reflect', text: 'A period of doubt and rest. The passion for creating never disappeared: it quietly grew stronger.' },
  { year: 'Comeback', label: 'Renewed & Reimagined', text: 'A fresh start with bolder ideas, unique designs, and a deeper commitment to meaningful gifts.' },
  { year: '50+', label: 'Orders & Counting', text: 'Every order is a new story, a new memory. Growing every day with the support of a wonderful community.' },
];

export const values = [
  { symbol: '◈', title: 'Handmade with Love', text: 'From chocolate bouquets to resin art: every piece is made by hand, with care poured into every detail.' },
  { symbol: '◇', title: 'Deeply Personal', text: 'Each gift is created to feel uniquely theirs. Customization is at the heart of everything we do.' },
  { symbol: '◆', title: 'Built on Encouragement', text: 'Every kind word from a customer or loved one pushes us to create something even better.' },
  { symbol: '◉', title: 'Always Evolving', text: "We never stop learning, creating, and imagining new ways to make someone's day extraordinary." },
];

// Built from the product data (what each product's own description says it is made of) —
// no process details beyond what the catalog already states.
export const howItsMade = [
  { h: 'Pipe cleaner flowers', t: 'Bouquets, sunflower pots and keychains are shaped entirely by hand from pipe cleaners: petals layered one by one, then wrapped or potted, so they never wilt.' },
  { h: 'Resin art', t: 'Photos, real pressed flowers and metallic foil are set in resin and left to cure, which is why resin keychains take 3–5 business days and photo pieces 5–7.' },
  { h: 'Chocolate bouquets', t: 'Roses, white flowers and your choice of chocolates are arranged by hand and wrapped in premium black & gold paper with a red ribbon bow.' },
  { h: 'Photo frames and keepsakes', t: 'Every frame is designed for its order — your photos, names, dates and message — then printed, assembled and gift-packed.' },
];

export const aboutFacts = [
  ['Founded', String(SITE.founded)],
  ['Founder', SITE.founder],
  ['Based in', `${SITE.city}, ${SITE.region}, ${SITE.countryName}`],
  ['Orders delivered', `${SITE.ordersDelivered} and counting`],
  ['Delivers to', `All of ${SITE.countryName}`],
];
