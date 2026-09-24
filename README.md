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
