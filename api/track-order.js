import admin from 'firebase-admin';

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

function isValidPhone(phone) {
  return /^\d{10}$/.test((phone || '').trim());
}

// Looks up a single order by orderId + phone using the trusted Admin SDK (server-side,
// bypasses Firestore client rules entirely) so the browser never has to read the full
// `orders` collection — see src/pages/TrackOrder/TrackOrder.jsx for the caller.
// Only the fields a customer needs to see their delivery status are returned; no PII
// belonging to *other* customers, and no PII at all beyond what this customer already
// knows (their own order id + phone), leaves this function.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const { orderId, phone } = req.body || {};
  const cleanOrderId = (orderId || '').toString().trim().slice(0, 100);
  const cleanPhone = (phone || '').toString().trim();

  if (!cleanOrderId || !isValidPhone(cleanPhone)) {
    res.status(400).json({ ok: false, error: 'A valid Order ID and 10-digit phone number are required' });
    return;
  }

  try {
    const db = getDb();
    const snap = await db.collection('orders')
      .where('orderId', '==', cleanOrderId)
      .where('customer.phone', '==', cleanPhone)
      .limit(1)
      .get();

    if (snap.empty) {
      res.status(200).json({ ok: true, found: false });
      return;
    }

    const order = snap.docs[0].data();
    res.status(200).json({
      ok: true,
      found: true,
      status: order.status,
      orderId: order.orderId,
      items: (order.items || []).map(i => ({ name: i.name, qty: i.qty })),
      grandTotal: order.grandTotal,
    });
  } catch {
    res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
}
