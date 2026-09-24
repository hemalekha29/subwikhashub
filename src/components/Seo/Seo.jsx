import { Helmet } from 'react-helmet-async';
import { SITE } from '../../data/site.js';

// Renders a head object from src/lib/seo.js — the exact same object scripts/prerender.mjs
// writes into the static HTML — so the tags Google sees before and after JavaScript runs
// are identical (the prerendered tags carry data-rh="true", which is how Helmet knows to
// replace rather than duplicate them).
export default function Seo({ head }) {
  return (
    <Helmet>
      <title>{head.title}</title>
      <meta name="description" content={head.description} />
      {head.robots && <meta name="robots" content={head.robots} />}
      <link rel="canonical" href={head.canonical} />
      <meta property="og:type" content={head.type} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:title" content={head.title} />
      <meta property="og:description" content={head.description} />
      <meta property="og:url" content={head.canonical} />
      <meta property="og:image" content={head.image} />
      <meta property="og:image:alt" content={head.imageAlt} />
      {head.isDefaultImage && <meta property="og:image:width" content={String(SITE.ogImageWidth)} />}
      {head.isDefaultImage && <meta property="og:image:height" content={String(SITE.ogImageHeight)} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={head.title} />
      <meta name="twitter:description" content={head.description} />
      <meta name="twitter:image" content={head.image} />
      {head.jsonLd.map((o, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(o).replace(/</g, '\\u003c')}</script>
      ))}
    </Helmet>
  );
}
