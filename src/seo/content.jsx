import { products } from '../data/products.js';
import { priceText, daysText, goodImages } from '../data/site.js';
import { categoryPages, giftPages, blogPosts } from '../data/seoContent.js';
import { productImageAlt } from '../lib/seo.js';

// Presentational blocks shared by the SPA's landing pages and the build-time prerender.
// `LinkComp` lets the SPA pass react-router's <Link> (client-side navigation) while the
// static render falls back to a plain <a href> — either way the DOM contains a real
// <a href="/…">, which is what crawlers follow.
function A({ href, LinkComp, children, ...rest }) {
  return LinkComp ? <LinkComp to={href} {...rest}>{children}</LinkComp> : <a href={href} {...rest}>{children}</a>;
}

export function Breadcrumbs({ items, LinkComp }) {
  return (
    <nav className="seo-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => (
          <li key={it.path}>
            {i === items.length - 1 ? <span aria-current="page">{it.name}</span> : <A href={it.path} LinkComp={LinkComp}>{it.name}</A>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AnswerBox({ children }) {
  return <p className="seo-answer">{children}</p>;
}

export function PriceTable({ list, LinkComp, caption }) {
  return (
    <div className="seo-table-wrap">
      <table className="seo-table">
        <caption>{caption}</caption>
        <thead>
          <tr><th scope="col">Gift</th><th scope="col">Price</th><th scope="col">Made in</th><th scope="col">Customizable</th></tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.slug}>
              <th scope="row"><A href={`/product/${p.slug}`} LinkComp={LinkComp}>{p.name}</A></th>
              <td>{priceText(p)}</td>
              <td>{daysText(p)}</td>
              <td>{p.customizable ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FaqList({ faqs, heading = 'Frequently asked questions' }) {
  if (!faqs?.length) return null;
  return (
    <section className="seo-faq" aria-label={heading}>
      <h2>{heading}</h2>
      {faqs.map(({ q, a }) => (
        <div key={q}>
          <h3>{q}</h3>
          <p>{a}</p>
        </div>
      ))}
    </section>
  );
}

export function DetailBlocks({ details }) {
  return details.map((d) => (
    <section key={d.h}>
      <h2>{d.h}</h2>
      <ul>{d.items.map((it) => <li key={it}>{it}</li>)}</ul>
    </section>
  ));
}

// Static product grid — used only by the prerendered HTML (the SPA pages use the real
// ProductCard grid, which is interactive).
export function ProductGridStatic({ list }) {
  return (
    <ul className="seo-grid">
      {list.map((p) => (
        <li key={p.slug} className="seo-card">
          <a href={`/product/${p.slug}`}>
            {goodImages(p)[0] && <img src={goodImages(p)[0]} alt={productImageAlt(p, 0)} width="400" height="400" loading="lazy" />}
            <span className="seo-card-body">
              <span className="seo-card-name">{p.name}</span>
              <span className="seo-card-price">{priceText(p)}</span>
              <span className="seo-card-tag">{p.tagline}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Real internal links to every landing page — keeps each one reachable in one click
// from any page, which is what lets crawlers (and answer engines) find them.
export function ExploreLinks({ LinkComp, heading = 'Explore more gifts' }) {
  return (
    <nav aria-label={heading}>
      <h2>{heading}</h2>
      <ul className="seo-linkrow">
        {categoryPages.map((c) => <li key={c.slug}><A href={`/category/${c.slug}`} LinkComp={LinkComp}>{c.name}</A></li>)}
        {giftPages.map((g) => <li key={g.slug}><A href={`/gifts/${g.slug}`} LinkComp={LinkComp}>{g.name}</A></li>)}
        <li><A href="/blog" LinkComp={LinkComp}>Gift guides</A></li>
      </ul>
    </nav>
  );
}

const bySlug = (slug) => products.find((p) => p.slug === slug);

export function BlogArticleBody({ post, LinkComp }) {
  return (
    <>
      <AnswerBox>{post.answer}</AnswerBox>
      {post.sections.map((s) => (
        <section key={s.h}>
          <h2>{s.h}</h2>
          {s.paras?.map((t) => <p key={t}>{t}</p>)}
          {s.table && (
            <div className="seo-table-wrap">
              <table className="seo-table">
                <thead><tr>{s.table.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
                <tbody>
                  {s.table.rows.map((r) => (
                    <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.list && (
            <ol className="seo-list">
              {s.list.map(({ slug, note }) => {
                const p = bySlug(slug);
                if (!p) return null;
                return (
                  <li key={slug}>
                    <A href={`/product/${slug}`} LinkComp={LinkComp}>{p.name}</A> ({priceText(p)}) — {note}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
      <section>
        <h2>Shop the gifts mentioned</h2>
        <ul className="seo-linkrow">
          {post.related.map((slug) => {
            const p = bySlug(slug);
            return p ? <li key={slug}><A href={`/product/${slug}`} LinkComp={LinkComp}>{p.name}</A></li> : null;
          })}
        </ul>
      </section>
    </>
  );
}

export function BlogIndexList({ LinkComp }) {
  return (
    <ul className="seo-grid">
      {blogPosts.map((b) => (
        <li key={b.slug} className="seo-card">
          <A href={`/blog/${b.slug}`} LinkComp={LinkComp}>
            <img src={b.image} alt={b.imageAlt} width="400" height="400" loading="lazy" />
            <span className="seo-card-body">
              <span className="seo-card-name">{b.title}</span>
              <span className="seo-card-tag">{b.metaDescription}</span>
            </span>
          </A>
        </li>
      ))}
    </ul>
  );
}
