# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# subwikhashub

## SEO / AEO / GEO pipeline

`npm run build` = `vite build` + `scripts/prerender.mjs` (runs as `postbuild`). The prerender step writes a real
HTML file for every public route (`dist/<route>/index.html`) with the page's title, description, canonical, Open
Graph tags, JSON-LD **and its actual content** inside `<div id="root">`, so crawlers that don't execute JavaScript
(GPTBot, ClaudeBot, PerplexityBot, Bing) can read it. React replaces that markup when the app loads.
It also generates `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`, `404.html` and `app.html`
(SPA shell for client-only routes), and **fails the build** on: not exactly one `<h1>`, missing/short alt text,
invalid schema, duplicate titles, or a product image that doesn't exist in `public/`. Title (50–60) and meta
description (140–160) length problems are printed as warnings.

Where to edit things (one source each — everything else derives from it):

| To change… | Edit |
|---|---|
| Business facts (name, city, email, phone, founder story, domain, shipping thresholds) | `src/data/site.js` |
| Products, prices, images | `src/data/products.js` |
| Category / occasion / budget landing pages, blog guides, product FAQs | `src/data/seoContent.js` |
| FAQ page + chatbot answers | `src/data/faqs.js` |
| About copy / policy copy | `src/data/aboutContent.js`, `src/data/policyContent.jsx` |
| Page titles, descriptions, JSON-LD | `src/lib/seo.js` |
| Static (crawler) page bodies + route list / sitemap | `src/seo/pages.jsx` |
| Social share image | `npm run og-image` (regenerates `public/og-image.jpg`) |

Custom domain: change `SITE.url` in `src/data/site.js`, rebuild, and add a 301 from the vercel.app URL.
Open TODOs are marked `TODO(owner)` in `src/data/site.js` (phone number, founder one-liner) and
`src/data/seoContent.js` (review the for-him / for-her picks; add first-hand resin process details).

## Gift orders / surprise delivery

Customers can send a gift to somebody else instead of ordering for themselves. The checkout keeps
**two separate sets of details** — the *buyer* (who pays and is contacted) and the *recipient* (where
the parcel goes) — and never mixes them.

Each of the two lives in its own place:

| Who | Where it lives |
|---|---|
| **Buyer** | `orders.customer` on the order itself — `{ name, email, phone, address }`. `address` is empty on a gift order (the buyer isn't the recipient). |
| **Recipient** | Its own table: the **`giftRecipients`** collection. |

### The `giftRecipients` table

One document per gift order. **The document id *is* the order id**, so an order finds its recipient
record with a direct `get` — never a query, never an index.

```js
{
  orderId: 'order_ABC123',      // === the document id
  name, phone, address, city, state, pincode, landmark,   // delivery details
  createdAt,                    // when the order was paid for
  deliveredAt,                  // stamped when the order is marked delivered (null before)
  purgedAt,                     // set when the delivery details are erased (null before)
}
```

Why a separate table rather than a field on the order:

- The recipient's contact details are PII that only exists to get one parcel to one door. Keeping
  them separate means they can be listed, audited and **erased on their own** once the gift is
  delivered — the order, the payment and the fact that a gift was sent all stay intact.
- The recipient's phone is used *only* for delivery coordination, so it never has to sit next to
  the buyer's payment details.

Written by `api/verify-payment.js` **inside the same Firestore transaction as the order**, so a gift
order can never exist without its recipient record, or the other way round. The admin panel reads it
directly (admin-only in `firestore.rules`).

> ⚠️ **Deploy the Firestore rules before going live with this feature.** The admin panel can only
> read `giftRecipients` once the current `firestore.rules` are published — run
> `firebase deploy --only firestore:rules`, or paste the file into Firebase Console → Firestore →
> Rules → Publish. Without them the admin panel shows a clear "recipient record could not be loaded"
> warning on gift orders instead of the delivery address.

### Order document shape (`orders` collection)

| Field | Meaning |
|---|---|
| `orderType` | `SELF_ORDER` or `GIFT_ORDER`. Orders placed before this feature have no `orderType` and are treated as `SELF_ORDER`. |
| `customer` | The **buyer**: `{ name, email, phone, address }`. `address` is empty on a gift order. |
| `recipientId` | The pointer to the recipient's record in `giftRecipients` (= the order id). `null` on a self order. |
| `isSurpriseGift` | `true` when the buyer asked for the gift to be a surprise. |
| `hideSenderIdentity` | `true` when the buyer asked us not to reveal their name. Only ever `true` on a surprise gift. |
| `giftMessage` | The personal note (max 250 characters on a gift order, 1000 on a self order). |
| `preferredDeliveryDate` | `YYYY-MM-DD` or empty. |

### Privacy rules baked into the code

- The recipient is never emailed, and never sees the amount, the products or the order id.
  Recipient-facing delivery messages are neutral and live in `src/lib/giftOrders.js`
  (`RECIPIENT_DELIVERY_MESSAGES`) — the admin's "🎀 Notify Recipient" button only ever sends those.
- The buyer's contact details never appear on the recipient's side, and the recipient's phone is only
  used for delivery coordination (never for order updates — those go to the buyer).
- Loyalty free-shipping is keyed on the **buyer's** phone, so a gift order neither inherits nor
  leaks the recipient's order history.
- `api/create-order.js` captures and validates the buyer + recipient details before payment and
  stores them on the pending order; `api/verify-payment.js` trusts that server-held copy over
  anything the browser sends afterwards, and re-validates before writing the final order.
- `orders` is still admin-only and written exclusively by the server. `giftRecipients` is readable
  and updatable by the admin panel only (the browser can never create one).

**Optional: buyer order-confirmation email**

The shop's single EmailJS template has a fixed recipient (the admin), so buyer confirmations are
opt-in. Create a second EmailJS template whose **To** field is `{{to_email}}` and set:

```
EMAILJS_BUYER_TEMPLATE_ID=template_xxxxxxx
```

in the Vercel environment. With it set, every paid order emails the **buyer** (never the recipient)
a confirmation with the items, the total and — for a gift order — the recipient's name, the
surprise status and the preferred delivery date. Without it, nothing changes and the admin order
alert email works exactly as before.

## Delivery zones — PIN-code based charges

The delivery charge is worked out from the customer's **PIN code** at checkout. The zone
configuration lives in Firestore and is managed from **/admin/delivery** — no PIN code or charge
is hardcoded in the frontend, and a customer can never change what they are charged.

| Zone | Areas | Charge |
|---|---|---|
| Local Delivery | Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti & nearby | ₹45 |
| Outer Coimbatore Delivery | Ukkadam & other outer Coimbatore areas (every PIN code starting 641) | ₹90 |
| Tamil Nadu Delivery | The rest of Tamil Nadu (every PIN code starting 6) | ₹150 |
| Rest of India Delivery | Everywhere else in India | ₹200 |
| Store Pickup | Subwikha's Hub, Thondamuthur | FREE |

### Direct pickup is for the main area only

Collection from the studio is offered **only to customers whose PIN code is in the main area**
(Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti and the surrounding pockets). Somebody
further out can still have an order delivered — the studio is just out of their way — but they
can't collect it.

That list is a separate, editable list in `/admin/delivery` (**PIN codes allowed to collect**), so
it can differ from the local delivery zone if you want.

### How it works

1. The customer enters their address and **PIN code** first — that is what decides the delivery
   zone, the charge, and whether collection is available.
2. The matching zone appears immediately: `📍 641029 · 🚚 Local Delivery · Delivery Charge: ₹45`.
3. Then the customer picks **🚚 Home Delivery** or — if their PIN code is in the main area —
   **🏠 Direct Pickup**. The pickup card is shown greyed out with the reason for anyone outside it.
4. On pickup the street address, city, state and landmark fields are hidden (the PIN code stays,
   because that is what proved they were eligible) and the studio's location and instructions appear.
5. A PIN code in no zone at all shows *"Sorry! We currently don't deliver to this location…"* with a
   WhatsApp button.

**For a gift order the charge always follows the RECIPIENT's PIN code**, never the buyer's — a
gift sent to someone else is priced on where it is delivered.

### Who calculates the price

`api/create-order.js` reads the owner's zone configuration from Firestore and works out the charge
itself. The browser only ever sends the delivery **method** and the PIN code that is already part
of the validated address — it can never send a price. The checkout shows the same number because
both sides call the same `resolveDelivery()` helper in `src/lib/delivery.js`.

### Managing the zones

**/admin/delivery** lets you create zones, rename them, change the charge, add and remove PIN codes
(chips), enable/disable a zone, and edit the pickup location and instructions. The **"Create
starter zones"** button writes the built-in starter zones into the database — after that the
database is the only source of truth.

A zone can match PIN codes three ways, and they combine:

| How | What it does | Example |
|---|---|---|
| **PIN codes** | an explicit list | `641012`, `641029` |
| **PIN code prefixes** | every PIN code starting with those digits | `641` = the whole Coimbatore district, `6` = the whole of Tamil Nadu |
| **Catch-all** | every PIN code no earlier zone matched | the "Rest of India" zone |

Zones are matched **in order** (the *Priority* number, lowest first), so the specific zones are
always found before the wider ones — a Vedapatti PIN code hits Local Delivery (₹45), not the
Tamil Nadu zone.

Two things make this easy to check:

- **Check a PIN code** (bottom of /admin/delivery) — type any PIN code and see exactly which zone
  it falls in and what the customer is charged.
- **Reset starter zones** — puts the four built-in zones back to the shop's own list and charges.
  Use it when a PIN code has drifted into the wrong zone (for example after an old list was saved).

> ⚠️ **The starter PIN code lists are a starting point, not verified truth.** Edit them in
> /admin/delivery so they match the areas you actually deliver to. Until you create a zone, the
> built-in defaults are used (₹45 local / ₹90 outer Coimbatore / ₹150 rest of Tamil Nadu /
> ₹200 rest of India / free pickup) so the site still works.

### Other settings

- **Free delivery above ₹X** — off by default (0). Set it in /admin/delivery to run a
  free-delivery offer; the referral perk and the returning-customer perk can also waive the charge.
- The **public site copy** (SEO text, shipping page) quotes these charges from `src/data/site.js`
  (`deliveryChargeFrom` / `deliveryChargeOuter` / `deliveryChargeState` / `deliveryChargeIndia`).
  Update those numbers if you change a charge.

## Checkout leads — abandoned checkout recovery

A **checkout lead** is saved the moment the customer presses Pay — *before* the payment gateway
opens. If they abandon, fail, or close the tab, their details are still in the database.

**`checkoutLeads` collection** (one document per lead, id = the readable lead reference, e.g.
`SUB-K7M2QX`): customer, buyer address, recipient details for gift orders, the products and
quantities, the subtotal, the delivery pincode / zone / charge, the order type, the surprise flags,
the gift message, the totals, the payment status, the checkout status, the follow-up status, the
payment reference, the linked order id and the timestamps.

| Status set | Values |
|---|---|
| Payment | `NOT_INITIATED`, `PENDING`, `FAILED`, `SUCCESS`, `CANCELLED` |
| Checkout | `CHECKOUT_STARTED`, `PAYMENT_PENDING`, `ABANDONED`, `COMPLETED` |
| Follow-up | `NOT_CONTACTED`, `CONTACTED`, `FOLLOW_UP_REQUIRED`, `CONVERTED`, `LOST` |

- A lead is created **before** the Razorpay order, and linked to it afterwards.
- Re-using the same cart updates the **same** lead rather than creating near-duplicates.
- A lead that becomes an order is converted **inside the same transaction** that creates the
  order — so a lead can never point at an order that doesn't exist.
- Nothing is marked *abandoned* just because a payment is pending: a checkout only counts as
  abandoned once it has been untouched for longer than the inactivity window (default 180 minutes,
  configurable in /admin/leads).
- Only the server can write the payment/checkout status — the Firestore rules let the admin change
  **only** the follow-up fields.

**/admin/leads** — the table, the filters (All / Payment Pending / Abandoned / Payment Failed /
Completed / Follow-up Required / Contacted / Lost), the search, the analytics (total leads, pending,
abandoned, failed, converted, conversion rate, potential revenue, recovered revenue, a 30-day
trend), and the detail drawer with the WhatsApp button, a call button, the follow-up status
buttons, scheduling a follow-up date, private notes and mark-as-lost/converted/reopen.

**Retention** — the nightly cron (`/api/sweep-leads`) marks stale checkouts abandoned and deletes
leads that never converted once they are older than the retention window (default 90 days,
configurable in /admin/leads). Set the retention to 0 to keep leads forever.

**Webhook (recommended)** — set `RAZORPAY_WEBHOOK_SECRET` in the environment and add a Razorpay
webhook for `payment.captured` pointing at `/api/razorpay-webhook`. That way an order is created
even if the customer's browser closes the instant they pay: the webhook and the browser's
`/api/verify-payment` run the *same* order-creation code, and the pending order's `consumed` flag
means whichever arrives first creates the order and the other does nothing. Without the secret the
webhook refuses to create anything.

## Universal feedback system

One reusable form ([`src/components/Feedback/FeedbackForm.jsx`](src/components/Feedback/FeedbackForm.jsx)),
used from the footer, `/feedback`, the order-confirmation page, the product page and the track-order
page. It takes its shape from props (`category`, `productId`, `orderId`, `sourcePage`, `allowAnonymous`),
so no page has its own form.

**The category registry** is one list — `src/lib/feedback.js` — which drives the form's category
picker, the extra fields each category shows, the admin filters and the server-side validation.
Adding a category means adding an entry there, not editing a dozen components.

**`feedbacks` collection** — the server creates these (the browser never writes to Firestore
directly, so validation, sanitisation and rate limiting can't be bypassed). Fields: the reference
(`FB-XXXXXX`), customer name / phone / email, the category and type, the rating, the message, the
category details, the product id, the order id, the source page, the anonymous flag, the attachment
URLs, the status, the admin reply, the internal notes and the timestamps.

**/admin/feedback** — the totals (total, average rating, positive, negative, pending, resolved
complaints), the category filters, the rating / status / date filters, the search, and the detail
drawer with the status buttons, the reply, the private internal notes and delete.

The customer gets *"Thank you for sharing your experience with Subwikha's Hub! Your feedback helps
us make every gift more special. 💝"*, and the shop gets an email with the category, rating,
message and reference.

**Privacy** — only the details needed for the reply are stored, no card/UPI/CVV data ever reaches
the site (Razorpay handles all of it), anonymous feedback stores no name or contact details,
internal notes are never shown to customers, and feedback is readable by admins only.

## Email notifications — the shop's inbox

Every notification is sent **by the server**, after the event has actually happened, and **exactly
once** per order — no matter how many times the payment gateway tells us about it.

### What is sent

| Notification | When | Subject |
|---|---|---|
| New order | after a **verified** payment and a created order | `🎁 New Order Received – Subwikha's Hub (#ORDER_ID)` |
| New feedback | when a customer leaves feedback | `💝 New Feedback – Subwikha's Hub (#FB-XXXXXX)` |
| The feedback form, to the buyer | when the order is marked **delivered** | `💝 How did we do? Tell us about your gift (#ORDER_ID)` |
| Payment failed (off by default) | when a payment fails or is cancelled | `⚠️ Payment Failed – Subwikha's Hub` |
| Daily summary of abandoned checkouts | once a day, from the nightly sweep | `📋 Abandoned Checkouts – Subwikha's Hub` |

The order email carries everything needed to start making the gift: the order id, the customer's
name / phone / email, the products and quantities, the subtotal, the delivery charge, the delivery
zone, the final amount paid, the payment status and transaction id, the order date and time, the
delivery address, whether it is a gift order, the recipient's details and gift message, whether it
is a pickup or a delivery — and a button that opens the order in the admin dashboard.

### The feedback form goes to the customer — after delivery

Nobody can rate the packaging of a gift they have not received yet. So the feedback form is sent
when the order is marked **delivered**: in the admin panel, changing the status to *Delivered*
emails the **buyer** a link to the form straight away (and there is a **💝 Send feedback form**
button to send it by hand if you need to).

The link already knows the order:

```
/feedback?order=<ORDER_ID>&product=<PRODUCT_ID>&name=<GIFT_NAME>
```

so the form opens with the right category pre-selected, the gift's name filled in, and the
customer's comment lands on the right order in `/admin/feedback`. They can rate the **product**,
the **packaging** and the **delivery**, and they can stay anonymous.

- Only the **buyer** is ever emailed — the recipient of a surprise gift is never contacted, and
  never learns that a form exists.
- Once per order (the notification key is the order id), and the send is recorded on the order as
  `feedbackRequestSentAt`.
- Switch it off in `/admin/settings` (**"The feedback form, after delivery"**).

> With the EmailJS provider this needs `EMAILJS_BUYER_TEMPLATE_ID` — a template of your own for
> customer emails. With Resend the branded email is sent as it is, to any address.

### Where it is sent, and by whom

**The notification address is never hardcoded.** It comes from the admin panel
(**/admin/settings**) or from the environment:

| Setting | Where it comes from | Notes |
|---|---|---|
| Notification address | `/admin/settings` → *Send notifications to*, or `ADMIN_NOTIFICATION_EMAIL` | the admin's own address |
| Provider | `/admin/settings` → *Email provider* (`emailjs` / `resend` / `none`) | |
| Sender name / address | `/admin/settings`, or `EMAIL_FROM` | |
| Which notifications are on | `/admin/settings` | order / feedback / payment-failure / daily summary |
| Retry limit | `/admin/settings` | how often a failed notification may be re-sent |
| Provider credentials | **environment only** | `RESEND_API_KEY`, `EMAILJS_*` — never in the browser or in Git |

`emailSettings/main` in Firestore holds the settings; the **API key is never stored there** — only
in the server environment, so it cannot be read from the site.

### How "exactly once" is guaranteed

Every notification has a **key** (`order_<razorpayOrderId>`, `feedback_<reference>`,
`leads_summary_<date>`, `payfail_<id>`, `test_<random>`). The key is the document id of the
`emailNotifications` log, and it is **claimed atomically** before anything is sent — so a webhook
that fires three times sends one email, and the other two skip.

The log (`emailNotifications`) records every attempt: `SENDING`, `SENT`, `FAILED` or `SKIPPED`, the
attempts, the error and the timestamps. **/admin/settings** shows that log, and a failed row can be
re-sent with one click (**↻ Retry**), which re-sends exactly the content that was logged.

Sending is **fire-and-forget**: a slow or broken mail provider can never fail a payment or stop an
order from being created.

> ⚠️ **Why orders used to arrive without an email:** EmailJS answers **HTTP 200 even when the send
> itself failed** — the error is only in the body. The old code only checked `res.ok`, so failures
> were silent. The new service checks the body as well, and every attempt is written to the log.

### Admin-only endpoints

- `POST /api/send-test-email` — sends the test email (admin token required).
- `POST /api/retry-email` — re-sends a logged notification (admin token required).

Both check the Firebase ID token server-side and only accept the admin account.

## The personalization studio — "make it yours"

The photo frames can be personalized on the product page: the customer uploads their photos, sees
them in the frame straight away, frames them (drag to reposition, scroll or pinch to zoom) and adds
a name, a message and a Spotify link.

**One table drives it** — `src/lib/personalization.js` holds the presets (photo slots, their shape
and how many photos each takes, and the text fields). Adding a field or a product means editing
that table, not the modal.

**Nothing is slow:**
- the studio is **lazy-loaded** — an ordinary product page never downloads it;
- a picked photo appears **instantly** (a local object URL) while the upload happens in the
  background — the customer never waits on the network to see their own picture;
- photos are **resized in the browser** before upload (1600px on the long edge), so the upload is
  small and quick;
- while dragging, the crop is moved with a CSS `transform` written straight to the DOM
  (`requestAnimationFrame`) — React only re-renders when the drag ends, so it stays smooth.

**The crop is resolution-independent** (a zoom plus an offset in fractions of the frame), so the
preview and the print match whatever size the frame is.

**The design travels with the order.** The photos, their slots and their crops are saved on the
cart line, sent with the order, sanitised server-side, stored on the order, and shown in the admin
order page under **🎨 Personalization** so the maker can see exactly what to print.

## Deployment checklist

1. **Publish the Firestore rules** — `firebase deploy --only firestore:rules` (or paste
   `firestore.rules` into Firebase Console → Firestore → Rules → Publish). This is required for the
   admin panel to read the new collections (`giftRecipients`, `deliveryZones`, `deliverySettings`,
   `checkoutLeads`, `checkoutSettings`, `feedbacks`, `emailSettings`, `emailNotifications`).
2. **Add your WhatsApp number** to `SITE.whatsapp` in `src/data/site.js` to enable the WhatsApp
   buttons (delivery enquiries and lead follow-ups).
3. **Set `RAZORPAY_WEBHOOK_SECRET`** and add the Razorpay webhook for `payment.captured`.
4. **Optional:** `EMAILJS_BUYER_TEMPLATE_ID` for buyer order confirmations.
5. **Set the email notification address** — `/admin/settings` → *Send notifications to*, or the
   `ADMIN_NOTIFICATION_EMAIL` environment variable. Choose a provider and set its credentials
   (`RESEND_API_KEY` for Resend, or the EmailJS keys). Send a test email from the same page.
6. **Review the starter delivery zones** in /admin/delivery — press **Check a PIN code** to confirm
   each area lands in the right zone, and edit the lists to match the areas you deliver to.
7. **Optional:** set the lead inactivity window / retention period in /admin/leads.

