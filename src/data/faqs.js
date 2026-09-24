// Single source of truth for FAQ content — used by src/pages/FAQ/FAQ.jsx (rendered to
// visitors), the build-time prerender (scripts/prerender.mjs → crawlable /faq HTML +
// FAQPage schema + llms-full.txt) and api/chat.js (grounds the chatbot's answers).
// Edit here and every consumer updates on the next build.
import { SITE, PRICE_RANGE, DELIVERY_SUMMARY } from './site.js';

export const FAQS = [
  {
    q: "What is Subwikha's Hub?",
    a: "Subwikha's Hub is a handmade gift business based in Coimbatore, Tamil Nadu, India, founded in 2024. It makes and sells handcrafted gifts including chocolate bouquets, resin art (keychains, coasters, photo pieces), personalized photo frames, pipe cleaner flower bouquets, fridge magnets, and colour-changing night lights, all made to order.",
  },
  {
    q: 'Does Subwikha\'s Hub ship across India?',
    a: 'Yes. Subwikha\'s Hub delivers across India. Orders above ₹500 get free shipping; orders below ₹500 have an ₹80 shipping fee. Exact delivery time depends on your location and comes in addition to the handmade processing time for your specific product.',
  },
  {
    q: 'How long does it take to make and deliver an order?',
    a: 'Since every item is handmade to order, processing time depends on the product: 2–4 business days for pipe cleaner keychains, metal keychains, and night lights; 3–5 business days for chocolate bouquets, flower pots, fridge magnets, and resin keychains; and 5–7 business days for custom photo frames, resin photo keychains, and resin photo coasters, since those involve custom photo printing or casting. Delivery time is added on top of processing time. During festive or peak gifting periods, processing may take 1–2 extra days.',
  },
  {
    q: 'What payment methods does Subwikha\'s Hub accept?',
    a: 'Subwikha\'s Hub accepts UPI, credit/debit cards, net banking, and wallets, all processed securely through Razorpay, which is PCI-DSS compliant. Cash on Delivery (COD) is not offered — all orders must be paid in full at checkout, and an order is confirmed only after successful payment.',
  },
  {
    q: 'Can I return or exchange an item?',
    a: 'No — because every item is custom-made by hand for that specific order, Subwikha\'s Hub does not accept returns or exchanges on customized products such as photo keychains, personalized items, or custom bouquets. If an order arrives damaged or incorrect, contact them within 48 hours of delivery with photos for a replacement or refund.',
  },
  {
    q: 'Can I cancel my order after placing it?',
    a: 'Yes, but only within 12 hours of placing the order and only before production has started. Once crafting has begun, the order can no longer be cancelled. To cancel, message @subwikhahub on Instagram as soon as possible.',
  },
  {
    q: 'How long do refunds take?',
    a: 'Approved refunds (for damaged items or valid cancellations) are processed back to the original payment method within 5–7 business days.',
  },
  {
    q: 'How do I customize my order or send my photo?',
    a: 'For products that use a customer photo, you upload it directly during checkout. For other customizable items, you send your preferences (size, colour, chocolate choice, engraving text, etc.) via Instagram DM to @subwikhahub after ordering.',
  },
  {
    q: 'How can I track my order?',
    a: 'Use the Track Order page on the website with your Order ID and the phone number used at checkout. Tracking details are also shared via Instagram DM once an order is dispatched.',
  },
  {
    q: 'How can I contact Subwikha\'s Hub?',
    a: 'The fastest way is Instagram DM to @subwikhahub, or the contact form on the website. They reply within 24 hours, Monday to Saturday, 10am–7pm IST.',
  },
  {
    q: 'Can I build a custom gift hamper with multiple items?',
    a: 'Yes — the Build a Hamper tool lets you pick 2 to 4 handcrafted gifts and combines them into one hamper with an automatic 10% discount on the bundle.',
  },
  {
    q: 'Is my payment and personal information safe?',
    a: 'Yes. Payments are processed by Razorpay, which is PCI-DSS compliant, and Subwikha\'s Hub never stores card or payment details on its own servers. Customer information (name, email, phone, address) is collected only to fulfil the order and is never sold or shared for marketing purposes.',
  },
  {
    q: 'How do I order a custom gift?',
    a: `Pick a gift on the Shop page, add it to your cart and pay securely through Razorpay at checkout. Photo-based gifts take your photo as part of the order; for other custom details (colour, size, chocolate choice, names or engraving text) message ${SITE.instagramHandle} on Instagram after ordering. Each product page lists exactly what can be customized.`,
  },
  {
    q: 'How long does resin art take?',
    a: 'Resin keychains (letter, heart and globe designs) take 3–5 business days to make. Custom photo resin pieces — resin photo keychains and resin photo coasters — take 5–7 business days because the photo has to be printed and cast, and resin needs time to cure. Courier delivery is added on top.',
  },
  {
    q: 'Can I add my own photo to a gift?',
    a: 'Yes. Resin photo keychains, resin photo coasters, custom photo frames, wedding and birthday frames, and fridge magnets are all made with your own photos. You share the photo as part of the order (at checkout or over Instagram DM, as noted on each product page) along with any names, dates or messages you want on the piece.',
  },
  {
    q: 'Is cash on delivery available?',
    a: 'No. Cash on Delivery is not available because every gift is made to order. Payment is taken in full at checkout by UPI, card, net banking or wallet through Razorpay, and production starts once payment is confirmed.',
  },
  {
    q: 'How do I care for resin art?',
    a: 'Keep resin keychains and coasters away from prolonged direct sunlight, heat and harsh chemicals, and wipe them gently with a soft, dry cloth. Avoid dropping them on hard surfaces. Use coasters for occasional display or light use rather than as hot-mug mats.',
  },
  {
    q: "What's the best anniversary gift under ₹1000?",
    a: 'Popular anniversary picks under ₹1000 are the Custom Photo Frame (₹399), the A4 Wedding & Couple Frame (₹499), a Chocolate Bouquet (from ₹299), a Resin Photo Keychain (₹149) and a Resin Heart Keychain (₹99). Frames and photo keepsakes suit couples best because they carry your own pictures.',
  },
  {
    q: 'What is the price range of your gifts?',
    a: `Gifts at ${SITE.name} range from ${PRICE_RANGE}. Pipe cleaner keychains start at ₹49; resin keychains are ₹99–₹149; frames are ₹179–₹499; night lights are ₹129–₹399; and chocolate bouquets are ₹299 (small), ₹499 (medium) or ₹699 (large).`,
  },
  {
    q: `Where is ${SITE.name} based and where do you deliver?`,
    a: `${SITE.name} is based in ${SITE.city}, ${SITE.region}, ${SITE.countryName}, and delivers to addresses all over ${SITE.countryName}. ${DELIVERY_SUMMARY}`,
  },
];
