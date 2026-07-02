import { useEffect } from 'react';
import { instagramPosts } from '../../data/instagramPosts';

export default function InstagramFeed() {
  useEffect(() => {
    if (instagramPosts.length === 0) return;
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const script = document.createElement('script');
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (instagramPosts.length === 0) return null;

  return (
    <section style={{ padding: '60px 24px', textAlign: 'center' }}>
      <span className="section-label">Follow Along</span>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', margin: '8px 0 32px' }}>@subwikhahub on Instagram</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 1000, margin: '0 auto' }}>
        {instagramPosts.map(url => (
          <blockquote
            key={url}
            className="instagram-media"
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{ width: 320, margin: 0 }}
          />
        ))}
      </div>
    </section>
  );
}
