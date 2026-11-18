import { getDb } from '../src/lib/server/orderCreation.js';
import { sendNotification, resolveEmailSettings } from '../src/lib/server/emailService.js';
import { renderTestEmail } from '../src/lib/server/emailTemplates.js';
import { requireAdmin } from '../src/lib/server/adminAuth.js';
import { NOTIFICATION_TYPE } from '../src/lib/emailConfig.js';

/**
 * Sends the "is it working?" email from the admin panel.
 *
 * Admin-only: the caller must present their Firebase ID token, and the server
 * verifies it before sending anything. A test email uses a fresh key every
 * time, so the admin can send as many as they like.
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
    const db = getDb();
    const settings = await resolveEmailSettings(db);

    if (!settings.adminEmail) {
      res.status(400).json({
        ok: false,
        error: 'No notification address yet — set one below (or the ADMIN_NOTIFICATION_EMAIL environment variable) first.',
      });
      return;
    }

    const email = renderTestEmail({ to: settings.adminEmail });
    const result = await sendNotification(db, {
      // A unique key per test, so each test really sends.
      key: `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: NOTIFICATION_TYPE.TEST,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.sent) {
      res.status(200).json({ ok: true, sent: true, to: settings.adminEmail });
      return;
    }
    res.status(502).json({
      ok: false,
      error: result.error || result.reason || 'The email could not be sent. Check the provider settings below.',
    });
  } catch (err) {
    console.error('send-test-email failed:', err);
    res.status(500).json({ ok: false, error: 'Could not send the test email.' });
  }
}
