import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ReferralShare({ code }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/shop?ref=${code}`;
  const text = `🎁 I just ordered from Subwikha's Hub — use my code ${code} for a discount on handcrafted gifts!`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };

  return (
    <div style={{ marginTop: 24, padding: 20, background: 'var(--black-card)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, textAlign: 'center' }}>
      <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 6 }}>
        Share your referral code — friends get a discount, and so do you next time:
      </p>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--gold)', letterSpacing: '0.05em', margin: '4px 0 14px' }}>
        {code}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn-outline" onClick={copyLink}>{copied ? 'Copied!' : 'Copy Link'}</button>
        <button className="btn-gold" onClick={shareWhatsApp}>Share on WhatsApp</button>
      </div>
    </div>
  );
}
