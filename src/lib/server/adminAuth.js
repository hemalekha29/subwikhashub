// Server-side admin authorisation for the API endpoints the admin panel calls.
//
// The admin panel reads and writes most of its data straight through the
// Firestore client SDK, where authorisation is enforced by firestore.rules
// (see the `isAdmin()` function there). The few actions that have to happen
// on the server — sending an email, retrying one — need their own check, and
// this is it: the caller sends their Firebase ID token, the server verifies it
// with the Admin SDK, and the email on the token must be the admin account.
//
// The admin account email is the same one firestore.rules checks, so the two
// can never disagree about who the admin is.
import admin from 'firebase-admin';

/**
 * Mirrors the `isAdmin()` email in firestore.rules. Keep the two in step.
 * This is the admin's SIGN-IN identity — it is not the address order
 * notifications are sent to (that one is configurable in the email settings).
 */
export const ADMIN_ACCOUNT_EMAIL = 'dreamcraftersevents@gmail.com';

/**
 * Makes sure the Firebase Admin app exists.
 *
 * `admin.auth()` throws when no app has been initialised, so every endpoint
 * that checks a token has to make sure the app is up first — otherwise the
 * check would fail with "not authorised" for a perfectly good admin.
 */
function ensureAdminApp() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

/**
 * Verifies the caller's Firebase ID token and checks it belongs to the admin.
 * Returns the decoded token, or null when the caller is not the admin.
 */
export async function requireAdmin(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;

  try {
    ensureAdminApp();
  } catch (err) {
    console.error('Could not initialise the admin app:', err);
    return null;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (decoded.email !== ADMIN_ACCOUNT_EMAIL) return null;
    return decoded;
  } catch (err) {
    console.error('Admin token verification failed:', err.message);
    return null;
  }
}
