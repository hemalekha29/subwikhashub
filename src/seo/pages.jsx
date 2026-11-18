/* eslint-disable react-refresh/only-export-components -- build-time (Node/SSR) module, not a Fast Refresh boundary; page-body components live beside the route table they feed. */
import { products, testimonials } from '../data/products.js';
import { FAQS } from '../data/faqs.js';
import { policies } from '../data/policyContent.jsx';
import {
  storyParagraphs, storyHighlight, storyThanks, milestones, values, howItsMade, aboutFacts,
} from '../data/aboutContent.js';
import {
  SITE, SUMMARY, DELIVERY_SUMMARY, PRICE_RANGE, rupee, priceText, daysText, liveProducts, CITY_LINE, goodImages,
} from '../data/site.js';
import {
  categoryPages, giftPages, blogPosts, productsForPage, listStats, buildProductFaqs,
} from '../data/seoContent.js';
import {
  staticHeads, productHead, categoryHead, giftHead, blogHead, productImageAlt,
} from '../lib/seo.js';
import {
  Breadcrumbs, AnswerBox, PriceTable, FaqList, DetailBlocks, ProductGridStatic, ExploreLinks,
  BlogArticleBody, BlogIndexList,
} from './content.jsx';

// The crawler-visible page for every public route. Rendered to static HTML by
// scripts/prerender.mjs and written INSIDE <div id="root">; when the SPA boots, React
// replaces it (createRoot, not hydrate), so this never has to match the SPA's markup
// exactly — but it does carry the same headings, copy, prices and links.
//
// Each entry: { path, head, body, files } — `files` are the source files whose git date
// drives that URL's sitemap <lastmod>.

const HOME_CRUMB = { name: 'Home', path: '/' };

function Shell({ children }) {
  return (
    <>
      <header className="seo-shell-header">
        <nav aria-label="Main">
          <a className="seo-brand" href="/">{SITE.name}</a>
          <a href="/shop">Shop</a>
          <a href="/category/bouquets">Bouquets</a>
          <a href="/category/photo-frames">Photo frames</a>
          <a href="/category/resin-art">Resin art</a>
          <a href="/about">Our story</a>
          <a href="/blog">Gift guides</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact</a>
        </nav>
      </header>
      <main id="main" className="seo-static seo-page">{children}</main>
      <footer className="seo-shell-footer">
        <div className="seo-foot-inner">
          <div>
            <h2>{SITE.name}</h2>
            <p>{SITE.tagline}</p>
            <address>
              {SITE.name}<br />
              {CITY_LINE}<br />
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a><br />
              {SITE.phone && <>{SITE.phone}<br /></>}
              <a href={SITE.instagramUrl}>Instagram {SITE.instagramHandle}</a>
            </address>
          </div>
          <div>
            <h2>Categories</h2>
            <ul>{categoryPages.map((c) => <li key={c.slug}><a href={`/category/${c.slug}`}>{c.name}</a></li>)}</ul>
          </div>
          <div>
            <h2>Gifts by occasion</h2>
            <ul>{giftPages.map((g) => <li key={g.slug}><a href={`/gifts/${g.slug}`}>{g.name}</a></li>)}</ul>
          </div>
          <div>
            <h2>Help</h2>
            <ul>
              <li><a href="/shipping">Shipping info</a></li>
              <li><a href="/returns">Returns &amp; exchange</a></li>
              <li><a href="/privacy">Privacy policy</a></li>
              <li><a href="/terms">Terms of service</a></li>
              <li><a href="/faq">FAQ</a></li>
              <li><a href="/hamper">Build a hamper</a></li>
              <li><a href="/gift-finder">Gift finder</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}

const withShell = (el) => <Shell>{el}</Shell>;

// ───────────── page bodies ─────────────
function HomeBody() {
  return (
    <>
      <h1>Handmade Customized Gifts, Chocolate Bouquets &amp; Resin Art in Coimbatore</h1>
      <AnswerBox>{SUMMARY}</AnswerBox>
      <p><a href="/shop">Shop all handmade gifts</a> · <a href="/about">Our story</a></p>
      <ExploreLinks heading="Shop by category and occasion" />
      <h2>All handmade gifts</h2>
      <ProductGridStatic list={liveProducts} />
      <h2>Why customers choose {SITE.name}</h2>
      <ul>
        <li>Handmade with love — every gift is made to order in {SITE.city}.</li>
        <li>Fully personalized — custom names, photos, colours and messages.</li>
        <li>Delivery charges worked out from your PIN code — {rupee(SITE.deliveryChargeFrom)} for local areas around {SITE.city}, {rupee(SITE.deliveryChargeOuter)} for outer {SITE.city}, {rupee(SITE.deliveryChargeState)} elsewhere in {SITE.region}, {rupee(SITE.deliveryChargeIndia)} elsewhere in India, or free collection from our studio.</li>
        <li>Gift-ready packaging on every order.</li>
      </ul>
      <h2>What customers say</h2>
      {testimonials.map((t) => (
        <blockquote key={t.id}>
          <p>“{t.text}”</p>
          <p>— {t.name}, {t.gift}</p>
        </blockquote>
      ))}
      <h2>Delivery</h2>
      <p>{DELIVERY_SUMMARY}</p>
    </>
  );
}

function ShopBody() {
  const s = listStats(liveProducts);
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Shop', path: '/shop' }]} />
      <h1>Handcrafted Gifts</h1>
      <AnswerBox>{`${SITE.name} sells ${s.n} handmade gifts priced ${s.range}: chocolate bouquets, resin art, personalized photo frames, keychains, night lights and pipe cleaner flowers. Everything is made to order in ${SITE.city} and delivered across ${SITE.countryName}, with delivery charges worked out from your PIN code at checkout.`}</AnswerBox>
      <ExploreLinks heading="Browse by category and occasion" />
      <h2>All gifts</h2>
      <ProductGridStatic list={liveProducts} />
      <PriceTable list={products} caption="Every gift with its price, making time and whether it can be customized" />
    </>
  );
}

function CategoryBody({ c }) {
  const list = productsForPage(c);
  const s = listStats(list);
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Shop', path: '/shop' }, { name: c.name, path: `/category/${c.slug}` }]} />
      <h1>{c.h1}</h1>
      <AnswerBox>{c.answer(s)}</AnswerBox>
      <ProductGridStatic list={list} />
      <PriceTable list={list} caption={`${c.name}: price, making time and customization`} />
      <DetailBlocks details={c.details} />
      <FaqList faqs={c.faqs} />
      <ExploreLinks />
    </>
  );
}

function GiftBody({ g }) {
  const list = productsForPage(g);
  const s = listStats(list);
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Shop', path: '/shop' }, { name: g.name, path: `/gifts/${g.slug}` }]} />
      <h1>{g.h1}</h1>
      <AnswerBox>{g.answer(s)}</AnswerBox>
      <p>{g.intro}</p>
      <ProductGridStatic list={list} />
      <PriceTable list={list} caption={`${g.name}: price, making time and customization`} />
      <p>{DELIVERY_SUMMARY}</p>
      <ExploreLinks />
    </>
  );
}

function ProductBody({ p }) {
  const faqs = buildProductFaqs(p);
  const related = products.filter((x) => x.category === p.category && x.slug !== p.slug && x.inStock !== false).slice(0, 4);
  const cat = categoryPages.find((c) => productsForPage(c).some((x) => x.slug === p.slug));
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Shop', path: '/shop' }, ...(cat ? [{ name: cat.name, path: `/category/${cat.slug}` }] : []), { name: p.name, path: `/product/${p.slug}` }]} />
      <p>{p.tagline}</p>
      <h1>{p.name}</h1>
      <AnswerBox>{`${p.name}: ${priceText(p)}. Handmade to order in ${SITE.city}, ready in ${daysText(p)}, then delivered across ${SITE.countryName} in about ${SITE.transitTime}. ${p.inStock === false ? 'Currently out of stock.' : 'Delivery charges are worked out from your PIN code at checkout.'}`}</AnswerBox>
      <ul className="seo-grid">
        {goodImages(p).map((src, i) => (
          <li key={src} className="seo-card"><img src={src} alt={productImageAlt(p, i)} width="600" height="600" loading={i ? 'lazy' : 'eager'} /></li>
        ))}
      </ul>
      <h2>About this gift</h2>
      <p>{p.description}</p>
      <h2>What is included</h2>
      <ul>{p.includes.map((x) => <li key={x}>{x}</li>)}</ul>
      {p.priceVariants?.length > 0 && (
        <>
          <h2>Sizes and prices</h2>
          <div className="seo-table-wrap">
            <table className="seo-table">
              <thead><tr><th scope="col">Size</th><th scope="col">Details</th><th scope="col">Price</th></tr></thead>
              <tbody>{p.priceVariants.map((v) => <tr key={v.label}><th scope="row">{v.label}</th><td>{v.desc}</td><td>{rupee(v.price)}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
      {p.variants?.length > 0 && (
        <>
          <h2>Options</h2>
          <ul>{p.variants.map((v) => <li key={v}>{v}</li>)}</ul>
        </>
      )}
      {p.customOptions?.length > 0 && (
        <>
          <h2>Customization</h2>
          <ul>{p.customOptions.map((o) => <li key={o.key}>{o.label}{o.choices ? `: ${o.choices.join(', ')}` : ''}</li>)}</ul>
        </>
      )}
      <h2>Delivery</h2>
      <p>{DELIVERY_SUMMARY}</p>
      <p>Best for: {p.occasion.join(', ')}.</p>
      <FaqList faqs={faqs} heading={`${p.name} — frequently asked questions`} />
      {related.length > 0 && (<><h2>You may also like</h2><ProductGridStatic list={related} /></>)}
      <ExploreLinks />
    </>
  );
}

function AboutBody() {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Our Story', path: '/about' }]} />
      <h1>Built with Encouragement, Creativity &amp; Heart</h1>
      <AnswerBox>{SUMMARY}</AnswerBox>
      <h2>How it all began</h2>
      <h3>A simple dream, a beautiful journey</h3>
      {storyParagraphs.map((t) => <p key={t}>{t}</p>)}
      <p>{storyHighlight}</p>
      <p>{storyThanks}</p>
      <h2>At a glance</h2>
      <div className="seo-table-wrap">
        <table className="seo-table">
          <tbody>{aboutFacts.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody>
        </table>
      </div>
      {SITE.founderStory && (<><h2>About the founder</h2><p>{SITE.founderStory}</p></>)}
      <h2>How our gifts are made</h2>
      {howItsMade.map((x) => <div key={x.h}><h3>{x.h}</h3><p>{x.t}</p></div>)}
      <h2>Our milestones</h2>
      <ol className="seo-list">{milestones.map((m) => <li key={m.year}><strong>{m.year} — {m.label}:</strong> {m.text}</li>)}</ol>
      <h2>Our craft</h2>
      <ul>{values.map((v) => <li key={v.title}><strong>{v.title}:</strong> {v.text}</li>)}</ul>
      <p><a href="/shop">Shop our collection</a></p>
    </>
  );
}

function ContactBody() {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Contact', path: '/contact' }]} />
      <h1>Contact Us</h1>
      <AnswerBox>{`The fastest way to reach ${SITE.name} is an Instagram DM to ${SITE.instagramHandle} or an email to ${SITE.email}. We reply within 24 hours, ${SITE.supportHours}. For custom orders, share your photo, names and preferences and we will confirm the details.`}</AnswerBox>
      <h2>Ways to reach us</h2>
      <ul>
        <li>Instagram: <a href={SITE.instagramUrl}>{SITE.instagramHandle}</a> — DM us for custom orders and enquiries.</li>
        <li>Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
        {SITE.phone && <li>Phone: {SITE.phone}</li>}
        <li>Location: {CITY_LINE}</li>
        <li>Response time: within 24 hours, {SITE.supportHours}</li>
      </ul>
      <h2>Custom orders</h2>
      <p>Need something bespoke? We specialize in fully personalized gift experiences for special occasions. Browse the <a href="/shop">shop</a> or read the <a href="/faq">FAQ</a> to see what can be customized.</p>
    </>
  );
}

function FaqBody() {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'FAQ', path: '/faq' }]} />
      <h1>Frequently Asked Questions</h1>
      <p>Direct answers about ordering, custom gifts, shipping across India, payment, returns and gift ideas from {SITE.name}.</p>
      {FAQS.map(({ q, a }) => (
        <section key={q}>
          <h2>{q}</h2>
          <p>{a}</p>
        </section>
      ))}
    </>
  );
}

function PolicyBody({ k }) {
  const pol = policies[k];
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: pol.title, path: `/${k}` }]} />
      <h1>{pol.title}</h1>
      {pol.sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          {s.body}
        </section>
      ))}
    </>
  );
}

function HamperBody() {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Build a Hamper', path: '/hamper' }]} />
      <h1>Build a Hamper</h1>
      <AnswerBox>{`Build your own custom gift hamper by picking 2 to 4 handmade gifts from ${SITE.name}. The bundle gets an automatic 10% discount, and every item is made to order in ${SITE.city} and delivered across ${SITE.countryName}.`}</AnswerBox>
      <h2>Gifts you can combine</h2>
      <ProductGridStatic list={liveProducts} />
    </>
  );
}

function GiftFinderBody() {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Gift Finder', path: '/gift-finder' }]} />
      <h1>Gift Finder</h1>
      <AnswerBox>{`Answer three quick questions about the occasion, who the gift is for and your budget, and the Gift Finder recommends a handmade gift from ${SITE.name}. Prices run ${PRICE_RANGE}.`}</AnswerBox>
      <ExploreLinks heading="Or browse gift ideas" />
    </>
  );
}

function GameBody() {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Play & Win', path: '/game' }]} />
      <h1>Play &amp; Win Discounts</h1>
      <AnswerBox>{`Play quick mini-games such as Memory Match, Word Scramble and the Gift Quiz on ${SITE.name} and win up to 10% off your next handmade gift order.`}</AnswerBox>
      <p><a href="/shop">Browse the shop</a></p>
    </>
  );
}

function BlogIndexBody() {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Blog', path: '/blog' }]} />
      <h1>Gift Guides &amp; Handmade Gift Ideas</h1>
      <AnswerBox>{`Practical gift guides from ${SITE.name}: how to choose between a chocolate and a flower bouquet, anniversary gift ideas in India, and how resin art gifts are made.`}</AnswerBox>
      <BlogIndexList />
    </>
  );
}

function BlogPostBody({ post }) {
  return (
    <>
      <Breadcrumbs items={[HOME_CRUMB, { name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }]} />
      <h1>{post.title}</h1>
      <p className="seo-post-meta">By {SITE.name} · Published <time dateTime={post.date}>{post.date}</time></p>
      <img className="seo-hero-img" src={post.image} alt={post.imageAlt} width="1000" height="380" />
      <BlogArticleBody post={post} />
      <ExploreLinks />
    </>
  );
}

function NotFoundBody() {
  return (
    <>
      <h1>Page Not Found</h1>
      <p>We couldn’t find that page. Try the <a href="/shop">shop</a> or go back to the <a href="/">homepage</a>.</p>
      <ExploreLinks />
    </>
  );
}

// ───────────── route table ─────────────
export function buildRoutes() {
  const R = [];
  const add = (path, head, el, files, extra = {}) =>
    R.push({ path, head, body: withShell(el), files, changefreq: 'monthly', priority: 0.7, ...extra });

  add('/', staticHeads.home(), <HomeBody />, ['src/data/products.js', 'src/pages/Home/Home.jsx', 'src/data/site.js'], { changefreq: 'weekly', priority: 1.0 });
  add('/shop', staticHeads.shop(), <ShopBody />, ['src/data/products.js', 'src/pages/Shop/Shop.jsx'], { changefreq: 'weekly', priority: 0.9 });
  categoryPages.forEach((c) => add(`/category/${c.slug}`, categoryHead(c, productsForPage(c)), <CategoryBody c={c} />, ['src/data/products.js', 'src/data/seoContent.js'], { priority: 0.8 }));
  giftPages.forEach((g) => add(`/gifts/${g.slug}`, giftHead(g, productsForPage(g)), <GiftBody g={g} />, ['src/data/products.js', 'src/data/seoContent.js'], { priority: 0.8 }));
  products.forEach((p) => add(`/product/${p.slug}`, productHead(p), <ProductBody p={p} />, ['src/data/products.js'], { priority: 0.8 }));
  add('/blog', staticHeads.blog(), <BlogIndexBody />, ['src/data/seoContent.js'], { priority: 0.6 });
  blogPosts.forEach((b) => add(`/blog/${b.slug}`, blogHead(b), <BlogPostBody post={b} />, ['src/data/seoContent.js'], { priority: 0.6, lastmod: b.date }));
  add('/about', staticHeads.about(), <AboutBody />, ['src/pages/About/About.jsx', 'src/data/aboutContent.js']);
  add('/faq', staticHeads.faq(FAQS), <FaqBody />, ['src/data/faqs.js', 'src/pages/FAQ/FAQ.jsx']);
  add('/contact', staticHeads.contact(), <ContactBody />, ['src/pages/Contact/Contact.jsx', 'src/data/site.js']);
  add('/hamper', staticHeads.hamper(), <HamperBody />, ['src/pages/Hamper/HamperBuilder.jsx']);
  add('/gift-finder', staticHeads.giftFinder(), <GiftFinderBody />, ['src/pages/GiftFinder/GiftFinder.jsx']);
  add('/game', staticHeads.game(), <GameBody />, ['src/pages/Game/Game.jsx'], { priority: 0.4 });
  ['shipping', 'returns', 'privacy', 'terms'].forEach((k) =>
    add(`/${k}`, staticHeads[k](), <PolicyBody k={k} />, ['src/data/policyContent.jsx'], { priority: 0.4 }));
  return R;
}

export function buildNotFound() {
  return { path: '/404', head: staticHeads.notFound(), body: withShell(<NotFoundBody />) };
}
