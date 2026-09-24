// Build-time prerender + crawl-file generator. Runs automatically after `vite build`
// (package.json "postbuild"). For every public route it writes dist/<route>/index.html
// containing:
//   • the route's real <title>, meta description, canonical, Open Graph/Twitter tags and
//     JSON-LD (the same head object the SPA renders via <Seo>, so they can't disagree)
//   • the page's actual content — headings, copy, prices, tables, FAQs, real <a href> links —
//     inside <div id="root">, so crawlers that don't run JavaScript (GPTBot, ClaudeBot,
//     PerplexityBot, Bing) read the full page. React replaces it on load (createRoot).
// It also generates sitemap.xml, robots.txt, llms.txt, llms-full.txt and 404.html, and
// validates titles, descriptions, H1s, alt text and schema, failing the build on hard errors.
//
// How the JSX pages are executed in Node: Vite's SSR module loader (ssrLoadModule) —
// the project's own toolchain, no extra prerender dependency or headless browser.
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const templatePath = path.join(dist, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error('prerender: dist/index.html not found — run `vite build` first.');
  process.exit(1);
}
const template = fs.readFileSync(templatePath, 'utf8');
if (!template.includes('<!-- SEO:START -->') || !template.includes('<div id="root"></div>')) {
  console.error('prerender: index.html is missing the <!-- SEO:START/END --> markers or empty #root.');
  process.exit(1);
}

const vite = await createServer({
  root,
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] },
});

let exitCode = 0;
try {
  const { buildRoutes, buildNotFound } = await vite.ssrLoadModule('/src/seo/pages.jsx');
  const seo = await vite.ssrLoadModule('/src/lib/seo.js');
  const siteMod = await vite.ssrLoadModule('/src/data/site.js');
  const content = await vite.ssrLoadModule('/src/data/seoContent.js');
  const faqMod = await vite.ssrLoadModule('/src/data/faqs.js');
  const productsMod = await vite.ssrLoadModule('/src/data/products.js');
  const policyMod = await vite.ssrLoadModule('/src/data/policyContent.jsx');
  const { SITE, BASE, abs, rupee, priceText, daysText, PRICE_RANGE, SUMMARY, DELIVERY_SUMMARY, CITY_LINE } = siteMod;

  const routes = buildRoutes();
  const notFound = buildNotFound();
  const problems = [];
  const warnings = [];

  // ── helpers ──
  const today = new Date().toISOString().slice(0, 10);
  function gitDate(files) {
    try {
      const out = execSync(`git log -1 --format=%cs -- ${files.map((f) => `"${f}"`).join(' ')}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      return out || today;
    } catch {
      return today;
    }
  }
  const html = (el) => renderToStaticMarkup(el);
  const stripTags = (h) => h
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<(h[1-6]|p|li|tr|div|section|blockquote|caption|br)[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();

  function page(route) {
    const seoHtml = seo.headToHtml(route.head);
    const bodyHtml = html(route.body);
    return template
      .replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, `<!-- SEO:START -->\n    ${seoHtml}\n    <!-- SEO:END -->`)
      .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  }

  function writeRoute(routePath, contents) {
    const file = routePath === '/' ? path.join(dist, 'index.html') : path.join(dist, routePath, 'index.html');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }

  // ── 0. every image products.js references must exist in public/ (or be listed in MISSING_IMAGES) ──
  const referenced = [...new Set(productsMod.products.flatMap((p) => p.images || []))];
  for (const src of referenced) {
    const exists = fs.existsSync(path.join(root, 'public', src));
    const listed = siteMod.MISSING_IMAGES.has(src);
    if (!exists && !listed) problems.push(`image ${src} is referenced in products.js but missing from public/ (add the file, or list it in MISSING_IMAGES in src/data/site.js)`);
    if (exists && listed) warnings.push(`image ${src} now exists — remove it from MISSING_IMAGES in src/data/site.js`);
  }

  // ── 1. prerender every route, validating as we go ──
  const checkTitle = (r) => {
    const t = r.head.title.length;
    const d = r.head.description.length;
    if (t < 50 || t > 60) warnings.push(`${r.path}: title is ${t} chars (want 50–60): "${r.head.title}"`);
    if (d < 140 || d > 160) warnings.push(`${r.path}: meta description is ${d} chars (want 140–160)`);
  };
  const seenTitles = new Map();
  for (const r of routes) {
    const out = page(r);
    writeRoute(r.path, out);
    checkTitle(r);
    const bodyHtml = html(r.body);
    const h1s = (bodyHtml.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) problems.push(`${r.path}: ${h1s} <h1> tags (need exactly 1)`);
    for (const m of bodyHtml.matchAll(/<img\b[^>]*>/g)) {
      const alt = /alt="([^"]*)"/.exec(m[0]);
      if (!alt || alt[1].trim().length < 10) problems.push(`${r.path}: <img> missing descriptive alt: ${m[0].slice(0, 90)}`);
    }
    r.head.jsonLd.forEach((o, i) => { try { JSON.parse(JSON.stringify(o)); } catch { problems.push(`${r.path}: JSON-LD #${i} invalid`); } });
    const ans = /<p class="seo-answer">([\s\S]*?)<\/p>/.exec(bodyHtml);
    if (ans && /^\/(category|gifts)\//.test(r.path)) {
      const words = stripTags(ans[1]).split(/\s+/).filter(Boolean).length;
      if (words < 40 || words > 60) warnings.push(`${r.path}: direct answer is ${words} words (want 40–60)`);
    }
    if (seenTitles.has(r.head.title)) problems.push(`${r.path}: duplicate <title> with ${seenTitles.get(r.head.title)}`);
    seenTitles.set(r.head.title, r.path);
    if (!bodyHtml.includes('href="/')) problems.push(`${r.path}: no internal <a href> links`);
    r.lastmod = r.lastmod || gitDate(r.files);
  }

  // ── 2. SPA shell (no static body) for client-only routes and not-prerendered product slugs
  //    (checkout, admin, track-order… are Disallowed in robots.txt; admin-added Firestore products
  //    render client-side and must stay indexable, so the shell deliberately has no noindex), + 404 ──
  const shell = template
    .replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, `<!-- SEO:START -->\n    <title data-rh="true">${SITE.name}</title>\n    <!-- SEO:END -->`);
  fs.writeFileSync(path.join(dist, 'app.html'), shell);
  fs.writeFileSync(path.join(dist, '404.html'), page(notFound));

  // ── 3. sitemap.xml ──
  const urls = routes
    .map((r) => `  <url>\n    <loc>${abs(r.path)}</loc>\n    <lastmod>${r.lastmod}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority.toFixed(1)}</priority>\n  </url>`)
    .join('\n');
  fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

  // ── 4. robots.txt — explicit allow for every search + AI crawler ──
  const privateDisallows = ['/admin', '/checkout', '/order-success', '/track-order', '/wishlist', '/api/'];
  const rules = privateDisallows.map((p) => `Disallow: ${p}`).join('\n');
  // A named User-agent group REPLACES the * group for that bot, so the private-path
  // disallows are repeated in every group instead of assuming they inherit.
  const bots = ['Googlebot', 'Bingbot', 'Applebot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];
  const robots = [
    `# ${SITE.name} — all search engines and AI crawlers are welcome on public pages.`,
    'User-agent: *', 'Allow: /', rules, '',
    ...bots.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', rules, '']),
    `Sitemap: ${abs('/sitemap.xml')}`, '',
  ].join('\n');
  fs.writeFileSync(path.join(dist, 'robots.txt'), robots);

  // ── 5. llms.txt / llms-full.txt ──
  const { categoryPages, giftPages, blogPosts, productsForPage, buildProductFaqs: productFaqs } = content;
  const { products } = productsMod;
  const { FAQS } = faqMod;
  const liveProducts = products.filter((p) => p.inStock !== false);

  const llms = [
    `# ${SITE.name}`, '',
    `> ${SUMMARY}`, '',
    `Tagline: ${SITE.tagline}. Location: ${CITY_LINE}. Price range: ${PRICE_RANGE}. Order online at ${BASE} and send customization details on Instagram ${SITE.instagramHandle} (${SITE.instagramUrl}). Email: ${SITE.email}.`, '',
    '## Key pages', '',
    `- [Shop all gifts](${abs('/shop')}): the full catalog of handmade gifts with prices`,
    `- [FAQ](${abs('/faq')}): ${FAQS.length} direct answers on ordering, custom gifts, shipping, payment and returns`,
    `- [Our story](${abs('/about')}): founder, how the gifts are made, orders delivered`,
    `- [Contact](${abs('/contact')}): Instagram DM, email, reply hours`,
    `- [Build a hamper](${abs('/hamper')}): combine 2–4 gifts for 10% off`, '',
    '## Gift categories', '',
    ...categoryPages.map((c) => `- [${c.name}](${abs(`/category/${c.slug}`)}): ${c.metaDescription}`), '',
    '## Gifts by occasion, recipient and budget', '',
    ...giftPages.map((g) => `- [${g.name}](${abs(`/gifts/${g.slug}`)}): ${g.metaDescription}`), '',
    '## Products', '',
    ...products.map((p) => `- [${p.name}](${abs(`/product/${p.slug}`)}): ${priceText(p)}, made in ${daysText(p)}${p.inStock === false ? ' (currently out of stock)' : ''} — ${p.tagline}`), '',
    '## Guides', '',
    ...blogPosts.map((b) => `- [${b.title}](${abs(`/blog/${b.slug}`)}): ${b.metaDescription}`), '',
    '## Policies', '',
    `- [Shipping](${abs('/shipping')}): ${DELIVERY_SUMMARY}`,
    `- [Returns & exchange](${abs('/returns')}): no returns on customized items; damaged or incorrect items replaced or refunded if reported within 48 hours; cancellation within 12 hours`,
    `- [Privacy](${abs('/privacy')})`,
    `- [Terms](${abs('/terms')})`, '',
    '## Notes for AI assistants', '',
    `- All prices are in Indian Rupees (₹) and ship within India only. Cash on Delivery is not available; payment is in full at checkout via Razorpay.`,
    `- Every product is handmade to order; small variation from photos is expected, not a defect.`,
    `- For the most current price and stock of a specific product, use that product's own page. Full text of every product, FAQ and policy: ${abs('/llms-full.txt')}`, '',
  ].join('\n');
  fs.writeFileSync(path.join(dist, 'llms.txt'), llms);

  const fullProducts = products.map((p) => [
    `### ${p.name}`,
    `URL: ${abs(`/product/${p.slug}`)}`,
    `Price: ${priceText(p)}${p.priceVariants ? ` (${p.priceVariants.map((v) => `${v.label} ${rupee(v.price)}`).join(', ')})` : ''}`,
    `Made in: ${daysText(p)} · Category: ${p.category} · Customizable: ${p.customizable ? 'yes' : 'no'} · Stock: ${p.inStock === false ? 'out of stock' : 'in stock'}`,
    `Best for: ${p.occasion.join(', ')}`,
    p.description,
    `Includes: ${p.includes.join('; ')}.`,
    ...(p.customOptions?.length ? [`Customization: ${p.customOptions.map((o) => o.label + (o.choices ? ` (${o.choices.join('/')})` : '')).join('; ')}.`] : []),
    ...(p.variants?.length ? [`Options: ${p.variants.join('; ')}.`] : []),
    '',
  ].join('\n'));

  const policyText = Object.entries(policyMod.policies).map(([k, pol]) => [
    `### ${pol.title} (${abs(`/${k}`)})`,
    ...pol.sections.map((s) => `${s.title}:\n${stripTags(html(s.body))}`),
    '',
  ].join('\n'));

  const llmsFull = [
    `# ${SITE.name} — full content`, '',
    `> ${SUMMARY}`, '',
    '## Business facts', '',
    `- Name: ${SITE.name} (${SITE.tagline})`,
    `- Location: ${CITY_LINE}; delivers across ${SITE.countryName}`,
    `- Founded: ${SITE.founded} by ${SITE.founder}; ${SITE.ordersDelivered} orders delivered`,
    `- Price range: ${PRICE_RANGE}`,
    `- Contact: ${SITE.email}; Instagram ${SITE.instagramHandle}; replies within 24 hours, ${SITE.supportHours}`,
    `- Delivery: ${DELIVERY_SUMMARY}`,
    `- Payment: UPI, cards, net banking, wallets via Razorpay; no Cash on Delivery`, '',
    '## Products', '', ...fullProducts,
    '## Frequently asked questions', '', ...FAQS.map((f) => `Q: ${f.q}\nA: ${f.a}\n`),
    '## Policies', '', ...policyText,
    '## Guides', '',
    ...blogPosts.map((b) => {
      const el = routes.find((r) => r.path === `/blog/${b.slug}`);
      const text = stripTags(html(el.body).replace(/<header[\s\S]*?<\/header>/, '').replace(/<footer[\s\S]*?<\/footer>/, ''));
      return `### ${b.title} (${abs(`/blog/${b.slug}`)})\n${text}\n`;
    }),
  ].join('\n');
  fs.writeFileSync(path.join(dist, 'llms-full.txt'), llmsFull);

  // ── report ──
  console.log(`\nprerender: wrote ${routes.length} routes + 404.html + app.html`);
  console.log(`prerender: sitemap.xml (${routes.length} urls), robots.txt, llms.txt (${llms.length} bytes), llms-full.txt (${llmsFull.length} bytes)`);
  if (warnings.length) {
    console.log(`\nSEO warnings (${warnings.length}):`);
    warnings.forEach((w) => console.log('  ⚠ ' + w));
  }
  if (problems.length) {
    console.log(`\nSEO ERRORS (${problems.length}):`);
    problems.forEach((p) => console.log('  ✖ ' + p));
    exitCode = 1;
  } else {
    console.log('\nprerender: all hard checks passed (one H1/page, descriptive alt text, valid schema, unique titles, internal links).');
  }
} catch (e) {
  console.error('prerender failed:', e);
  exitCode = 1;
} finally {
  await vite.close();
}
process.exit(exitCode);
