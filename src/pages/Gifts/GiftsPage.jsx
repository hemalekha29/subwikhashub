import { useParams, Link, Navigate } from 'react-router-dom';
import Seo from '../../components/Seo/Seo';
import ProductCard from '../../components/ProductCard/ProductCard';
import { giftBySlug, productsForPage, listStats } from '../../data/seoContent';
import { DELIVERY_SUMMARY } from '../../data/site';
import { giftHead } from '../../lib/seo';
import { Breadcrumbs, AnswerBox, PriceTable, ExploreLinks } from '../../seo/content';

// Occasion / recipient / budget landing page (/gifts/:slug) — birthday, anniversary,
// for-couples, for-him, for-her, under-500, under-1000. Prerendered to static HTML too.
export default function GiftsPage() {
  const { slug } = useParams();
  const g = giftBySlug(slug);
  if (!g) return <Navigate to="/shop" replace />;
  const list = productsForPage(g);
  const s = listStats(list);

  return (
    <div className="page-container">
      <Seo head={giftHead(g, list)} />
      <div className="seo-frame seo-page">
        <Breadcrumbs LinkComp={Link} items={[{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: g.name, path: `/gifts/${g.slug}` }]} />
        <h1>{g.h1}</h1>
        <AnswerBox>{g.answer(s)}</AnswerBox>
        <p>{g.intro}</p>
        <div className="seo-product-grid">{list.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
        <PriceTable list={list} LinkComp={Link} caption={`${g.name}: price, making time and customization`} />
        <p>{DELIVERY_SUMMARY}</p>
        <ExploreLinks LinkComp={Link} />
      </div>
    </div>
  );
}
