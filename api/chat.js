import admin from 'firebase-admin';
import { FAQS } from '../src/data/faqs.js';
import { products as staticProducts } from '../src/data/products.js';

// Google Gemini free-tier model as of this writing — check https://ai.google.dev/gemini-api/docs/models
// if this ever starts returning a 404/"model not found", since Google periodically
// retires older model names. Swapping the string below is the only change needed.
const GEMINI_MODEL = 'gemini-2.0-flash';
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 10; // caps both cost and prompt-injection surface from a long back-and-forth
const MAX_OUTPUT_TOKENS = 350;

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

// Same precedence + hidden-filtering as src/hooks/useAllProducts.js and
// api/create-order.js's getTrustedProducts — so the chatbot never tells a customer
// about a product that's been hidden/discontinued, or misses one an admin has added
// since the static catalog was last deployed. Falls back to the static catalog alone
// if Firestore is unreachable, rather than failing the whole chat request.
async function getCatalog() {
  try {
    const db = getDb();
    const snap = await db.collection('products').get();
    const fsProducts = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    const visible = fsProducts.filter(p => !p.hidden);
    return [...visible, ...staticProducts.filter(sp => !fsProducts.some(fp => fp.slug === sp.slug))];
  } catch (err) {
    console.error('getCatalog fell back to static products:', err);
    return staticProducts;
  }
}

function buildSystemInstruction(products) {
  const faqBlock = FAQS.map(({ q, a }) => `Q: ${q}\nA: ${a}`).join('\n\n');
  const catalogBlock = products
    .map(p => `- ${p.name} (${p.category}): ₹${p.price}${p.originalPrice ? ` (was ₹${p.originalPrice})` : ''}, delivery in ${p.deliveryDays} business days${p.customizable ? ', customizable' : ''}${p.inStock === false ? ' — CURRENTLY OUT OF STOCK, cannot be ordered right now' : ''}. ${p.tagline}`)
    .join('\n');

  return `You are the helpful shopping assistant for Subwikha's Hub, a handmade gift business in Coimbatore, Tamil Nadu, India, founded 2024. It sells chocolate bouquets, resin art, personalized photo frames, keychains, and night lights, all handmade to order, shipped across India.

RULES — follow these strictly:
1. Only answer using the facts given below (the FAQ and product catalog). Never invent a price, delivery time, policy, or stock status that isn't listed.
2. If asked something not covered by the facts below, say you're not sure and suggest contacting @subwikhahub on Instagram, using the contact form, or checking the relevant page — do not guess.
3. You cannot look up a specific customer's order status. Always direct order-status questions to the Track Order page (/track-order) using their Order ID and phone number.
4. Keep answers short (2-4 sentences), warm, and direct. Prices are in Indian Rupees (₹).
5. Only discuss Subwikha's Hub, its products, and its policies. Politely decline anything else (general knowledge, other brands, coding help, personal advice, etc.) and steer back to how you can help with their gift.
6. Never ask for or process payment information, passwords, or other sensitive personal data in this chat.
7. Never recommend or encourage ordering a product marked "CURRENTLY OUT OF STOCK" below — tell the customer it's unavailable right now if they ask about it.

FREQUENTLY ASKED QUESTIONS:
${faqBlock}

PRODUCT CATALOG:
${catalogBlock}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ ok: false, error: 'Chat is not configured yet.' });
    return;
  }

  try {
    const { message, history } = req.body || {};
    const cleanMessage = (message || '').toString().trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!cleanMessage) {
      res.status(400).json({ ok: false, error: 'Message is required.' });
      return;
    }

    // History comes from the client only to give the model conversational context —
    // it's never trusted as a source of facts, only the system instruction above is.
    const cleanHistory = Array.isArray(history)
      ? history
        .slice(-MAX_HISTORY_TURNS)
        .filter(h => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
        .map(h => ({ role: h.role, parts: [{ text: h.text.slice(0, MAX_MESSAGE_LENGTH) }] }))
      : [];

    const contents = [...cleanHistory, { role: 'user', parts: [{ text: cleanMessage }] }];
    const catalog = await getCatalog();

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemInstruction(catalog) }] },
          contents,
          generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.4 },
        }),
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      console.error('Gemini API error:', data);
      res.status(502).json({ ok: false, error: 'Could not reach the assistant right now. Please try again.' });
      return;
    }

    const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || null;
    if (!reply) {
      // Most commonly a safety-filter block (finishReason: 'SAFETY' or similar) rather
      // than an actual API error, hence the 200 above but no candidate text here.
      res.status(200).json({ ok: true, reply: "Sorry, I couldn't quite answer that — could you rephrase, or DM us on Instagram @subwikhahub?" });
      return;
    }

    res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error('chat handler failed:', err);
    res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}
