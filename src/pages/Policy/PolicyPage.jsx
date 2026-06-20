import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import styles from './PolicyPage.module.css';

function PolicyLayout({ label, title, children }) {
  return (
    <div className={`page-container ${styles.page}`}>
      <div className={styles.header}>
        <span className="section-label">{label}</span>
        <h1 className={styles.title}>{title}</h1>
        <div className="divider" />
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

export function ShippingPage() {
  return (
    <PolicyLayout label="Delivery" title="Shipping Info">
      <Helmet>
        <title>Shipping Info | Subwikha's Hub</title>
        <meta name="description" content="Learn about Subwikha's Hub shipping and delivery timelines. Free shipping on orders above ₹500. Handmade items dispatched across India." />
        <link rel="canonical" href="https://subwikhahub.vercel.app/shipping" />
        <meta property="og:title" content="Shipping Info | Subwikha's Hub" />
        <meta property="og:description" content="Free shipping on orders above ₹500. Handmade gifts dispatched across India with love." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/shipping" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Section title="Processing Time">
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
      </Section>
      <Section title="Delivery">
        <p>We currently deliver across India. Shipping timelines depend on your location and are in addition to the processing time above.</p>
        <ul>
          <li>Orders above ₹500: <strong>Free Shipping</strong></li>
          <li>Orders below ₹500: ₹80 shipping fee</li>
        </ul>
        <p>Exact delivery timelines vary by location. You will be provided tracking details once your order is dispatched.</p>
      </Section>
      <Section title="Tracking">
        <p>Once your order is dispatched, tracking details will be shared with you via Instagram DM or the contact details provided at checkout.</p>
      </Section>
      <Section title="Delays">
        <p>Handmade items take care and time. During festive seasons or peak gifting periods, processing may take 1–2 extra days. We will always communicate any delays proactively.</p>
      </Section>
    </PolicyLayout>
  );
}

export function ReturnsPage() {
  return (
    <PolicyLayout label="Returns" title="Returns & Exchange">
      <Helmet>
        <title>Returns & Exchange | Subwikha's Hub</title>
        <meta name="description" content="Read Subwikha's Hub return and exchange policy. Custom handmade orders are non-returnable. Damaged items are replaced within 48 hours of delivery." />
        <link rel="canonical" href="https://subwikhahub.vercel.app/returns" />
        <meta property="og:title" content="Returns & Exchange | Subwikha's Hub" />
        <meta property="og:description" content="Damaged item? We'll make it right within 48 hours. Read our full returns policy." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/returns" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Section title="No Returns on Custom Orders">
        <p>Because every product at Subwikha's Hub is made by hand: especially for you: <strong>we do not accept returns or exchanges on customized orders</strong> (photo keychains, personalized items, custom bouquets).</p>
        <p>Please review your order carefully before placing it. If you have any doubts, DM us on Instagram before ordering: we're happy to help.</p>
      </Section>
      <Section title="Damaged or Incorrect Items">
        <p>If your order arrives damaged or is not what you ordered, please reach out to us within <strong>48 hours</strong> of delivery with photos. We will make it right: either a replacement or a refund, depending on the situation.</p>
      </Section>
      <Section title="Cancellations">
        <p>Orders can be cancelled within <strong>12 hours</strong> of placing them, before production begins. Once we've started crafting your order, cancellation is not possible.</p>
        <p>To request a cancellation, DM us on <a href="https://www.instagram.com/subwikhahub" target="_blank" rel="noreferrer">@subwikhahub</a> as soon as possible.</p>
      </Section>
      <Section title="Refunds">
        <p>Approved refunds (for damaged or cancelled orders) will be processed back to your original payment method within <strong>5–7 business days</strong>.</p>
      </Section>
    </PolicyLayout>
  );
}

export function PrivacyPage() {
  return (
    <PolicyLayout label="Privacy" title="Privacy Policy">
      <Helmet>
        <title>Privacy Policy | Subwikha's Hub</title>
        <meta name="description" content="Subwikha's Hub privacy policy — how we collect, use and protect your personal information. Payments secured by Razorpay." />
        <link rel="canonical" href="https://subwikhahub.vercel.app/privacy" />
        <meta property="og:title" content="Privacy Policy | Subwikha's Hub" />
        <meta property="og:description" content="Your data is safe with us. Payments secured by Razorpay. We never share your information." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/privacy" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Section title="Information We Collect">
        <p>When you place an order, we collect your name, email address, phone number, and delivery address solely to process and deliver your order.</p>
      </Section>
      <Section title="How We Use Your Information">
        <ul>
          <li>To process and fulfill your order</li>
          <li>To contact you about your order status or delivery</li>
          <li>To respond to your enquiries</li>
        </ul>
        <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
      </Section>
      <Section title="Payment Security">
        <p>All payments are processed securely through <strong>Razorpay</strong>. We do not store your card or payment details on our servers. Razorpay is PCI-DSS compliant and uses industry-standard encryption.</p>
      </Section>
      <Section title="Cookies">
        <p>Our website uses minimal cookies only to remember your cart and improve your browsing experience. No tracking or advertising cookies are used.</p>
      </Section>
      <Section title="Contact">
        <p>For any privacy-related questions, reach us on Instagram at <a href="https://www.instagram.com/subwikhahub" target="_blank" rel="noreferrer">@subwikhahub</a>.</p>
      </Section>
    </PolicyLayout>
  );
}

export function TermsPage() {
  return (
    <PolicyLayout label="Legal" title="Terms of Service">
      <Helmet>
        <title>Terms of Service | Subwikha's Hub</title>
        <meta name="description" content="Read the terms of service for Subwikha's Hub. All orders are handmade to order, paid via Razorpay, and non-refundable for custom items." />
        <link rel="canonical" href="https://subwikhahub.vercel.app/terms" />
        <meta property="og:title" content="Terms of Service | Subwikha's Hub" />
        <meta property="og:description" content="Terms covering orders, payments, custom items and intellectual property for Subwikha's Hub." />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/terms" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Section title="Overview">
        <p>By placing an order on Subwikha's Hub, you agree to the following terms. Please read them carefully.</p>
      </Section>
      <Section title="Products">
        <p>All products are handmade and may have slight variations in colour, size, or texture compared to photos: this is the nature of handcraft and makes each piece unique. These variations are not defects.</p>
      </Section>
      <Section title="Orders & Payment">
        <ul>
          <li>All orders must be paid in full at the time of purchase via Razorpay</li>
          <li>We do not offer Cash on Delivery</li>
          <li>An order is confirmed only after successful payment</li>
        </ul>
      </Section>
      <Section title="Custom Orders">
        <p>For photo keychains and personalized items, you are responsible for providing correct details (photo, name, etc.) at the time of ordering. We are not liable for errors arising from incorrect information provided by the customer.</p>
      </Section>
      <Section title="Intellectual Property">
        <p>All product designs, photographs, and content on this website belong to Subwikha's Hub. Reproduction without permission is not allowed.</p>
      </Section>
      <Section title="Changes to Terms">
        <p>We reserve the right to update these terms at any time. Continued use of the site after changes means you accept the updated terms.</p>
      </Section>
      <Section title="Contact">
        <p>Questions? Reach us on Instagram at <a href="https://www.instagram.com/subwikhahub" target="_blank" rel="noreferrer">@subwikhahub</a>.</p>
      </Section>
    </PolicyLayout>
  );
}
