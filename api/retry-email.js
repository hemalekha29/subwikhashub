import { getDb } from '../src/lib/server/orderCreation.js';
import { retryNotification } from '../src/lib/server/emailService.js';
import { requireAdmin } from '../src/lib/server/adminAuth.js';

/**
 * Re-sends a notification that previously failed.
 *
 * The exact content that was logged is re-sent, so a retry produces the same
 * email it would have produced the first time. Admin-only.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    res.status(401).json({ ok: false, error: 'Not authorised.' });
    return;
  }

  try {
    const { key } = req.body || {};
    if (!key) {
      res.status(400).json({ ok: false, error: 'Which notification?' });
      return;
    }

    const db = getDb();
    const result = await retryNotification(db, String(key).slice(0, 200));
    if (result.sent) {
      res.status(200).json({ ok: true, sent: true });
      return;
    }
    res.status(502).json({
      ok: false,
      error: result.error || result.reason || 'The notification could not be re-sent.',
    });
  } catch (err) {
    console.error('retry-email failed:', err);
    res.status(500).json({ ok: false, error: 'Could not retry the notification.' });
  }
}
