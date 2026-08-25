import admin from 'firebase-admin';

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

// Powers the "🔥 N sold this month" badge on ProductDetail.jsx. This used to be a raw
// `getDocs(collection(db,'orders'))` call from the customer's own browser (src/hooks/
// useProductSales.js) — that worked only because Firestore rules for `orders` were
// permissive; once they were locked down to admin-only (the whole point of this session's
// security pass), that client read started failing silently. Rather than loosen the rules
// back open, this computes the same aggregate server-side with the trusted Admin SDK and
// returns only per-product counts — no customer PII, no raw order data, safe to expose
// publicly and cache.
export default async function handler(req, res) {
  try {
    const db = getDb();
    const snap = await db.collection('orders').get();
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const counts = {};

    snap.docs.forEach(doc => {
      const o = doc.data();
      const created = o.createdAt?.toDate ? o.createdAt.toDate().getTime() : null;
      if (created && created < cutoff) return;
      (o.items || []).forEach(item => {
        if (!item?.name) return;
        counts[item.name] = (counts[item.name] || 0) + (item.qty || 1);
      });
    });

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).json({ ok: true, counts });
  } catch (err) {
    console.error('product-sales failed:', err);
    res.status(500).json({ ok: false, counts: {} });
  }
}
