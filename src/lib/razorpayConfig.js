// Public Razorpay Key ID — safe to ship to the browser (it identifies the account,
// it cannot authorize anything by itself). Shared between the client (Checkout.jsx)
// and the server (api/create-order.js, api/verify-payment.js) so both always agree
// on which Razorpay account an order belongs to.
//
// The matching secret (RAZORPAY_KEY_SECRET) lives ONLY in Vercel's server-side
// environment variables — never in source, never in a VITE_-prefixed variable.
export const RAZORPAY_KEY_ID = 'rzp_live_TTyZOLL5vcDUxo';
