import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './seo/seo.css'
import App from './App.jsx'

const rootElement = document.getElementById('root');

// Every public route ships prerendered static HTML inside #root (see scripts/prerender.mjs)
// so crawlers that don't run JavaScript can read the page. That markup is a content
// snapshot, not the SPA's own DOM, so it is REPLACED here (createRoot clears it) rather than
// hydrated — hydrating would log a mismatch on every load.
// The prerendered <head> tags carry data-rh="true" but react-helmet-async doesn't reclaim
// tags it didn't create, so it would ADD its own identical set beside them (two canonicals,
// doubled JSON-LD). Drop the static ones right before React mounts; <Seo> immediately
// re-emits the same tags for the current route. (<title> is kept — Helmet updates it in place.)
document.head.querySelectorAll('[data-rh="true"]:not(title)').forEach((node) => node.remove());

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
