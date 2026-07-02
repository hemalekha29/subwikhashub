import admin from 'firebase-admin';

const EMAILJS_SERVICE_ID = 'service_tq7y4u2';
const EMAILJS_TEMPLATE_ID = 'template_wd6f6bw';
const EMAILJS_PUBLIC_KEY = 'kmmr3Ac8anXDDcvyn';

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

function dateNDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// This function is triggered daily by Vercel Cron (see vercel.json) to send a reminder
// email exactly 7 days before a saved gift date. Recurring reminders roll forward a year
// instead of being marked notified, since there is no other scheduler in this project.
export default async function handler(req, res) {
  try {
    const db = getDb();
    const snap = await db.collection('reminders').where('notified', '==', false).get();

    const targetDate = dateNDaysFromNow(7);
    const targetMonthDay = targetDate.slice(5);

    let sent = 0;
    for (const docSnap of snap.docs) {
      const r = docSnap.data();
      const isMatch = r.recurringYearly ? r.date.slice(5) === targetMonthDay : r.date === targetDate;
      if (!isMatch) continue;

      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            name: r.name,
            email: r.email,
            subject: `Reminder: ${r.occasion} is coming up!`,
            message: `Hi ${r.name}, just a friendly reminder that ${r.occasion} is coming up on ${r.date}. Visit Subwikha's Hub for the perfect handcrafted gift: https://subwikhahub.vercel.app/shop`,
          },
        }),
      });

      if (r.recurringYearly) {
        const next = new Date(r.date);
        next.setFullYear(next.getFullYear() + 1);
        await docSnap.ref.update({ date: next.toISOString().slice(0, 10) });
      } else {
        await docSnap.ref.update({ notified: true });
      }
      sent++;
    }

    res.status(200).json({ ok: true, sent });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
