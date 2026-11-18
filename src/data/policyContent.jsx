// Policy-page copy (moved verbatim out of PolicyPage.jsx), shared by the SPA page and the
// build-time prerender so crawlers read exactly what visitors read. Bodies are JSX so
// bold text and links survive; nothing here touches the browser, so it renders in Node.
import { SITE, rupee } from './site.js';

const ig = <a href={SITE.instagramUrl} target="_blank" rel="noreferrer">{SITE.instagramHandle}</a>;

export const policies = {
  shipping: {
    label: 'Delivery',
    title: 'Shipping Info',
    sections: [
      { title: 'Processing Time', body: (<>
        <p>All our products are handmade to order. Processing begins after payment confirmation.</p>
        <ul>
          <li><strong>Pipe Cleaner Keychains</strong>: 2–4 business days</li>
          <li><strong>Metal Keychains</strong>: 2–4 business days</li>
          <li><strong>Night Lights &amp; Lamps</strong>: 2–4 business days</li>
          <li><strong>Chocolate Bouquets</strong>: 3–5 business days</li>
          <li><strong>Pipe Cleaner Bouquets</strong>: 3–5 business days</li>
          <li><strong>Flower Pots</strong>: 3–5 business days</li>
          <li><strong>Fridge Magnets</strong>: 3–5 business days</li>
          <li><strong>Resin Keychains</strong>: 3–5 business days</li>
          <li><strong>Custom 4×4 Frames</strong>: 3–5 business days</li>
          <li><strong>Photo Frames (A5 / A4)</strong>: 5–7 business days (custom design)</li>
          <li><strong>Resin Photo Keychains</strong>: 5–7 business days (custom photo printing)</li>
          <li><strong>Resin Photo Coasters</strong>: 5–7 business days (custom photo casting)</li>
        </ul>
      </>) },
      { title: 'Delivery', body: (<>
        <p>We currently deliver across {SITE.countryName}. Shipping timelines depend on your location and are in addition to the processing time above. Courier delivery typically takes about {SITE.transitTime}.</p>
        <p><strong>Delivery charges are worked out from your PIN code at checkout</strong> — enter your address and we show you the exact charge before you pay:</p>
        <ul>
          <li>Local areas around {SITE.city} (Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti &amp; nearby): <strong>{rupee(SITE.deliveryChargeFrom)}</strong></li>
          <li>Outer {SITE.city} areas (Ukkadam &amp; other outlying areas): <strong>{rupee(SITE.deliveryChargeOuter)}</strong></li>
          <li>Everywhere else in {SITE.region}: <strong>{rupee(SITE.deliveryChargeState)}</strong></li>
          <li>Everywhere else in {SITE.countryName}: <strong>{rupee(SITE.deliveryChargeIndia)}</strong></li>
          <li>Collection from our studio: <strong>FREE</strong> — available to customers in our main area (Thondamuthur, Vadavalli, Selvapuram, Perur, Vedapatti &amp; nearby)</li>
        </ul>
        <p>If your PIN code is not currently serviceable we will say so at checkout and suggest either direct collection or getting in touch with us to check availability.</p>
        <p>Exact delivery timelines vary by location. You will be provided tracking details once your order is dispatched.</p>
      </>) },
      { title: 'Tracking', body: <p>Once your order is dispatched, tracking details will be shared with you via Instagram DM or the contact details provided at checkout.</p> },
      { title: 'Delays', body: <p>Handmade items take care and time. During festive seasons or peak gifting periods, processing may take 1–2 extra days. We will always communicate any delays proactively.</p> },
    ],
  },
  returns: {
    label: 'Returns',
    title: 'Returns & Exchange',
    sections: [
      { title: 'No Returns on Custom Orders', body: (<>
        <p>Because every product at Subwikha's Hub is made by hand, especially for you, <strong>we do not accept returns or exchanges on customized orders</strong> (photo keychains, personalized items, custom bouquets).</p>
        <p>Please review your order carefully before placing it. If you have any doubts, DM us on Instagram before ordering: we're happy to help.</p>
      </>) },
      { title: 'Damaged or Incorrect Items', body: <p>If your order arrives damaged or is not what you ordered, please reach out to us within <strong>48 hours</strong> of delivery with photos. We will make it right: either a replacement or a refund, depending on the situation.</p> },
      { title: 'Cancellations', body: (<>
        <p>Orders can be cancelled within <strong>12 hours</strong> of placing them, before production begins. Once we've started crafting your order, cancellation is not possible.</p>
        <p>To request a cancellation, DM us on {ig} as soon as possible.</p>
      </>) },
      { title: 'Refunds', body: <p>Approved refunds (for damaged or cancelled orders) will be processed back to your original payment method within <strong>5–7 business days</strong>.</p> },
    ],
  },
  privacy: {
    label: 'Privacy',
    title: 'Privacy Policy',
    sections: [
      { title: 'Information We Collect', body: <p>When you place an order, we collect your name, email address, phone number, and delivery address solely to process and deliver your order.</p> },
      { title: 'How We Use Your Information', body: (<>
        <ul>
          <li>To process and fulfill your order</li>
          <li>To contact you about your order status or delivery</li>
          <li>To respond to your enquiries</li>
        </ul>
        <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
      </>) },
      { title: 'Payment Security', body: <p>All payments are processed securely through <strong>Razorpay</strong>. We do not store your card or payment details on our servers. Razorpay is PCI-DSS compliant and uses industry-standard encryption.</p> },
      { title: 'Cookies', body: <p>Our website uses minimal cookies only to remember your cart and improve your browsing experience. No tracking or advertising cookies are used.</p> },
      { title: 'Contact', body: <p>For any privacy-related questions, reach us on Instagram at {ig} or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p> },
    ],
  },
  terms: {
    label: 'Legal',
    title: 'Terms of Service',
    sections: [
      { title: 'Overview', body: <p>By placing an order on Subwikha's Hub, you agree to the following terms. Please read them carefully.</p> },
      { title: 'Products', body: <p>All products are handmade and may have slight variations in colour, size, or texture compared to photos: this is the nature of handcraft and makes each piece unique. These variations are not defects.</p> },
      { title: 'Orders & Payment', body: (
        <ul>
          <li>All orders must be paid in full at the time of purchase via Razorpay</li>
          <li>We do not offer Cash on Delivery</li>
          <li>An order is confirmed only after successful payment</li>
        </ul>
      ) },
      { title: 'Custom Orders', body: <p>For photo keychains and personalized items, you are responsible for providing correct details (photo, name, etc.) at the time of ordering. We are not liable for errors arising from incorrect information provided by the customer.</p> },
      { title: 'Intellectual Property', body: <p>All product designs, photographs, and content on this website belong to Subwikha's Hub. Reproduction without permission is not allowed.</p> },
      { title: 'Changes to Terms', body: <p>We reserve the right to update these terms at any time. Continued use of the site after changes means you accept the updated terms.</p> },
      { title: 'Contact', body: <p>Questions? Reach us on Instagram at {ig} or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p> },
    ],
  },
};
