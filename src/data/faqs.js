// Single source of truth for FAQ content — used by src/pages/FAQ/FAQ.jsx (rendered to
// visitors) and api/chat.js (grounds the chatbot's answers). middleware.js keeps its own
// copy for bots (Edge Runtime function, deliberately kept import-free for cold-start
// speed, matching the existing PRODUCTS duplication there) — if you edit this file,
// update middleware.js's FAQ_ITEMS array to match, or the bot-rendered page and the
// chatbot will start giving different answers than the page itself.
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
];
