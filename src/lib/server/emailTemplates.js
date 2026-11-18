// The email templates — server-only.
//
// A single branded HTML layout (Subwikha's Hub: black & gold) used for every
// notification, so a new order, a failed payment, an abandoned-checkout summary
// and a feedback message all look like they come from the same studio.
//
// Both an HTML body and a plain-text body are produced: the HTML goes to
// providers that render markup (Resend), and the plain text is what the
// existing EmailJS template can display.

const GOLD = '#c9a84c';
const GOLD_LIGHT = '#e0c56a';
const BLACK = '#0a0a0a';
const CARD = '#161616';
const BORDER = '#2a2a2a';
const TEXT = '#e8e0d0';
const MUTED = '#9a9a9a';

export function escapeHtml(value) {
  return (value === null || value === undefined ? '' : String(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function layout({ heading, intro, blocks, ctaLabel, ctaUrl, footerNote }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BLACK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(intro || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLACK};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <!-- Brand header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a,#0d0d0d);padding:28px 32px;border-bottom:1px solid ${BORDER};">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${GOLD};letter-spacing:0.5px;">Subwikha's Hub</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};letter-spacing:2px;text-transform:uppercase;margin-top:6px;">Where Memories Become Gifts</div>
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:${TEXT};line-height:1.3;">${escapeHtml(heading)}</h1>
              ${intro ? `<p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUTED};line-height:1.6;">${escapeHtml(intro)}</p>` : ''}
            </td>
          </tr>
          <!-- Content -->
          ${blocks.join('\n          ')}
          <!-- CTA -->
          ${ctaUrl ? `
          <tr>
            <td style="padding:8px 32px 28px 32px;">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,${GOLD},#a8823a);color:#000;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.5px;text-decoration:none;padding:14px 26px;border-radius:8px;">${escapeHtml(ctaLabel || 'Open in the admin dashboard')}</a>
            </td>
          </tr>` : ''}
          <!-- Footer -->
          <tr>
            <td style="background:#0d0d0d;border-top:1px solid ${BORDER};padding:20px 32px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED};line-height:1.7;">
                ${escapeHtml(footerNote || "Subwikha's Hub · Where Memories Become Gifts")}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRows(rows) {
  return rows
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};width:42%;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:8px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
              </tr>`)
    .join('');
}

function panel(title, inner) {
  return `
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};padding-bottom:10px;border-bottom:1px solid ${BORDER};">${escapeHtml(title)}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${inner}</table>
            </td>
          </tr>`;
}

/**
 * The new-order notification.
 *
 * Everything the shop needs to act on the order: who, what, where, how much,
 * how the money moved, and whether it is a gift.
 */
export function renderOrderEmail(data, { adminUrl } = {}) {
  const {
    orderId, createdAt, customer = {}, items = [], subtotal, discount, deliveryCharge,
    grandTotal, paymentId, paymentStatus, deliveryMethod, deliveryZoneName, deliveryPincode,
    pickupLocation, orderType, isSurpriseGift, hideSenderIdentity, giftMessage, recipient,
  } = data;

  const isGift = orderType === 'GIFT_ORDER';
  const isPickup = deliveryMethod === 'PICKUP';

  const itemRows = items.map(i => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};">
                  ${escapeHtml(i.name)}${i.variant ? ` <span style="color:${MUTED};font-size:12px;">(${escapeHtml(i.variant)})</span>` : ''}
                </td>
                <td style="padding:8px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};text-align:center;width:70px;">× ${i.qty}</td>
                <td style="padding:8px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${GOLD};text-align:right;width:110px;">${escapeHtml(money((i.price || 0) * (i.qty || 1)))}</td>
              </tr>`).join('');

  const subject = `🎁 New Order Received – Subwikha's Hub (#${orderId})`;

  const html = layout({
    heading: `🎁 New order received${isGift ? ' — a gift!' : ''}`,
    intro: `Order #${orderId} · ${createdAt}`,
    blocks: [
      panel('Customer', detailRows([
        ['Name', customer.name],
        ['Phone', customer.phone],
        ['Email', customer.email],
        [isGift ? 'Delivery address' : 'Address', customer.address],
      ])),
      panel('Items', itemRows || ''),
      panel('Payment', detailRows([
        ['Subtotal', money(subtotal)],
        ['Discount', discount > 0 ? `− ${money(discount)}` : '—'],
        ['Delivery charge', deliveryCharge > 0 ? money(deliveryCharge) : 'FREE'],
        ['Total paid', money(grandTotal)],
        ['Payment status', paymentStatus],
        ['Payment ID', paymentId],
        ['Order date & time', createdAt],
      ])),
      panel('Delivery', detailRows([
        ['Method', isPickup ? '🏠 Store pickup' : '🚚 Home delivery'],
        [isPickup ? 'Pickup location' : 'Delivery zone', isPickup ? pickupLocation : deliveryZoneName],
        [isPickup ? null : 'PIN code', isPickup ? null : deliveryPincode],
      ])),
      isGift ? panel('Gift details', detailRows([
        ['Recipient', recipient?.name],
        ['Recipient phone', recipient?.phone],
        ['Recipient address', recipient?.address],
        ['Surprise gift', isSurpriseGift ? 'Yes — keep it a surprise' : 'No'],
        ['Sender identity', hideSenderIdentity ? 'Hidden from the recipient' : 'Visible to the recipient'],
        ['Gift message', giftMessage],
      ])) : '',
    ].filter(Boolean),
    ctaLabel: 'View this order in the admin dashboard',
    ctaUrl: adminUrl,
    footerNote: "Subwikha's Hub · Where Memories Become Gifts · Order #" + orderId,
  });

  const text = [
    `🎁 New order received${isGift ? ' — a gift!' : ''}`,
    `Order #${orderId} · ${createdAt}`,
    '',
    'CUSTOMER',
    `Name: ${customer.name || ''}`,
    `Phone: ${customer.phone || ''}`,
    `Email: ${customer.email || ''}`,
    `Address: ${customer.address || ''}`,
    '',
    'ITEMS',
    ...items.map(i => `• ${i.name}${i.variant ? ` (${i.variant})` : ''} × ${i.qty} — ${money((i.price || 0) * (i.qty || 1))}`),
    '',
    'PAYMENT',
    `Subtotal: ${money(subtotal)}`,
    `Discount: ${discount > 0 ? `− ${money(discount)}` : '—'}`,
    `Delivery charge: ${deliveryCharge > 0 ? money(deliveryCharge) : 'FREE'}`,
    `Total paid: ${money(grandTotal)}`,
    `Payment status: ${paymentStatus || ''}`,
    `Payment ID: ${paymentId || ''}`,
    '',
    'DELIVERY',
    `Method: ${isPickup ? 'Store pickup' : 'Home delivery'}`,
    isPickup ? `Pickup location: ${pickupLocation || ''}` : `Delivery zone: ${deliveryZoneName || ''}\nPIN code: ${deliveryPincode || ''}`,
    ...(isGift ? [
      '',
      'GIFT DETAILS',
      `Recipient: ${recipient?.name || ''}`,
      `Recipient phone: ${recipient?.phone || ''}`,
      `Surprise gift: ${isSurpriseGift ? 'Yes' : 'No'}`,
      `Sender identity: ${hideSenderIdentity ? 'Hidden' : 'Visible'}`,
      `Gift message: ${giftMessage || '—'}`,
    ] : []),
    '',
    adminUrl ? `View the order: ${adminUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

/** The daily summary of checkouts that were started but never paid for. */
export function renderLeadsSummaryEmail(data, { adminUrl } = {}) {
  const { date, leads = [], totalValue, window } = data;
  const rows = leads.map(l => `
              <tr>
                <td style="padding:7px 0;border-bottom:1px solid #242424;font-family:monospace,monospace;font-size:12px;color:${GOLD};width:120px;">${escapeHtml(l.leadId)}</td>
                <td style="padding:7px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${TEXT};">${escapeHtml(l.name)}</td>
                <td style="padding:7px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};width:120px;">${escapeHtml(l.phone)}</td>
                <td style="padding:7px 0;border-bottom:1px solid #242424;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${TEXT};text-align:right;width:110px;">${escapeHtml(money(l.value))}</td>
              </tr>`).join('');

  const subject = `🧾 ${leads.length} abandoned checkout${leads.length === 1 ? '' : 's'} — Subwikha's Hub (${date})`;

  const html = layout({
    heading: `🧾 ${leads.length} checkout${leads.length === 1 ? '' : 's'} waiting for a nudge`,
    intro: `Checkouts started in the last ${window || 'day'} that were never completed — worth ${money(totalValue)}.`,
    blocks: [
      panel('Leads', rows || `<tr><td style="padding:8px 0;font-size:13px;color:${MUTED};">No abandoned checkouts in this period.</td></tr>`),
    ],
    ctaLabel: 'Open the checkout leads',
    ctaUrl: adminUrl,
    footerNote: "Subwikha's Hub · Checkout lead summary",
  });

  const text = [
    `🧾 ${leads.length} abandoned checkout${leads.length === 1 ? '' : 's'} (${date})`,
    `Worth ${money(totalValue)}`,
    '',
    ...leads.map(l => `${l.leadId} · ${l.name} · ${l.phone} · ${money(l.value)}`),
    '',
    adminUrl ? `Open the checkout leads: ${adminUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

/** A payment failed or was cancelled. */
export function renderPaymentFailedEmail(data, { adminUrl } = {}) {
  const { orderId, customer = {}, reason, status } = data;
  const subject = `⚠️ Payment ${String(status || 'failed').toLowerCase()} – Subwikha's Hub (#${orderId})`;

  const html = layout({
    heading: '⚠️ A payment did not go through',
    intro: `The customer filled in their details but the payment did not complete. Their checkout is saved — a follow-up might win the order.`,
    blocks: [
      panel('Details', detailRows([
        ['Order reference', orderId],
        ['Customer', customer.name],
        ['Phone', customer.phone],
        ['Email', customer.email],
        ['Status', status],
        ['Reason', reason],
      ])),
    ],
    ctaLabel: 'Open the checkout lead',
    ctaUrl: adminUrl,
    footerNote: "Subwikha's Hub · Checkout lead",
  });

  const text = [
    '⚠️ A payment did not go through',
    `Order reference: ${orderId}`,
    `Customer: ${customer.name || ''}`,
    `Phone: ${customer.phone || ''}`,
    `Email: ${customer.email || ''}`,
    `Status: ${status || ''}`,
    `Reason: ${reason || ''}`,
    adminUrl ? `Open the checkout lead: ${adminUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

/** New customer feedback. */
export function renderFeedbackEmail(data, { adminUrl } = {}) {
  const { reference, category, rating, message, customer = {}, orderId, sourcePage } = data;
  const subject = `💬 New ${String(category || 'feedback').toLowerCase()} – Subwikha's Hub (${reference})`;

  const html = layout({
    heading: '💬 New feedback',
    intro: `${reference} · ${category || ''}${rating ? ` · ${rating}★` : ''}`,
    blocks: [
      panel('Feedback', detailRows([
        ['Reference', reference],
        ['Category', category],
        ['Rating', rating ? `${rating} / 5` : 'not given'],
        ['Customer', customer.name],
        ['Email', customer.email],
        ['Phone', customer.phone],
        ['Order', orderId],
        ['Page', sourcePage],
      ])),
      panel('Message', `
              <tr><td style="padding:12px 0;font-family:Georgia,serif;font-size:15px;color:${TEXT};line-height:1.7;">${escapeHtml(message)}</td></tr>`),
    ],
    ctaLabel: 'Read and reply to this feedback',
    ctaUrl: adminUrl,
    footerNote: "Subwikha's Hub · Customer feedback",
  });

  const text = [
    '💬 New feedback',
    `Reference: ${reference}`,
    `Category: ${category || ''}`,
    `Rating: ${rating ? `${rating}/5` : 'not given'}`,
    `Customer: ${customer.name || ''} · ${customer.email || ''} · ${customer.phone || ''}`,
    `Order: ${orderId || '—'}`,
    '',
    message || '',
    '',
    adminUrl ? `Read and reply: ${adminUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

/**
 * The feedback form, sent to the BUYER after their order.
 *
 * The link carries the order id (and the product, when there is only one), so
 * the form opens already knowing which gift the customer is talking about —
 * they only have to write the comment.
 */
export function renderFeedbackRequestEmail(data) {
  const { name, orderId, productName, feedbackUrl } = data;
  const subject = `💝 How did we do? Tell us about your gift (${orderId})`;

  const html = layout({
    heading: '💝 How did we do?',
    intro: `Hi ${name || 'there'}, your gift has arrived — and we would love to hear what you think of it.`,
    blocks: [
      panel('Your order', detailRows([
        ['Order reference', orderId],
        ['Gift', productName],
      ])),
      panel('Tell us', `
              <tr><td style="padding:12px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};line-height:1.8;">
                It takes less than a minute, and every word goes straight to the people who made your
                gift — the makers, the packing team and us. You can rate the
                <strong style="color:${GOLD};">product</strong>, the
                <strong style="color:${GOLD};">packaging</strong> and the
                <strong style="color:${GOLD};">delivery</strong>, and you can stay anonymous if you
                would rather.
              </td></tr>`),
    ],
    ctaLabel: 'Share your feedback',
    ctaUrl: feedbackUrl,
    footerNote: "Subwikha's Hub · Where Memories Become Gifts",
  });

  const text = [
    `💝 How did we do? (Order ${orderId})`,
    '',
    `Hi ${name || 'there'},`,
    '',
    'Your gift has arrived — and we would love to hear what you think of it.',
    productName ? `Your gift: ${productName}` : '',
    '',
    'It takes less than a minute. You can rate the product, the packaging and the delivery, and you can stay anonymous if you would rather.',
    '',
    feedbackUrl ? `Share your feedback: ${feedbackUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

/** The "is it working?" email from the admin settings page. */
export function renderTestEmail(data = {}) {
  const { to } = data;
  const subject = "✅ Test email — Subwikha's Hub notifications are working";

  const html = layout({
    heading: '✅ Notifications are working',
    intro: `This is a test from your Subwikha's Hub admin panel, sent to ${to || 'your address'}.`,
    blocks: [
      panel('What happens next', `
              <tr><td style="padding:12px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXT};line-height:1.8;">
                You will get an email like this one whenever:<br>
                •&nbsp; a new order is paid for and verified,<br>
                •&nbsp; a payment fails or is cancelled (if you turn that on),<br>
                •&nbsp; there are abandoned checkouts to follow up on (daily summary),<br>
                •&nbsp; a customer leaves feedback.
              </td></tr>`),
    ],
    footerNote: "Subwikha's Hub · Where Memories Become Gifts",
  });

  const text = [
    '✅ Notifications are working',
    `This is a test from your Subwikha's Hub admin panel, sent to ${to || 'your address'}.`,
  ].join('\n');

  return { subject, html, text };
}
