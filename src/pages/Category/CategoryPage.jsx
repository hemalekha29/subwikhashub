import { useParams, Link, Navigate } from 'react-router-dom';
import Seo from '../../components/Seo/Seo';
import ProductCard from '../../components/ProductCard/ProductCard';
import { categoryBySlug, productsForPage, listStats } from '../../data/seoContent';
import { categoryHead } from '../../lib/seo';
import { Breadcrumbs, AnswerBox, PriceTable, FaqList, DetailBlocks, ExploreLinks } from '../../seo/content';

// Crawlable category landing page (/category/:slug). The same copy, price table and FAQ are
// prerendered into static HTML by scripts/prerender.mjs; here they sit above/below a real
// interactive ProductCard grid so visitors can add to cart straight from the page.
export default function CategoryPage() {
  const { slug } = useParams();
  const c = categoryBySlug(slug);
  if (!c) return <Navigate to="/shop" replace />;
  const list = productsForPage(c);
  const s = listStats(list);

  return (
    <div className="page-container">
      <Seo head={categoryHead(c, list)} />
      <div className="seo-frame seo-page">
        <Breadcrumbs LinkComp={Link} items={[{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: c.name, path: `/category/${c.slug}` }]} />
        <h1>{c.h1}</h1>
        <AnswerBox>{c.answer(s)}</AnswerBox>
        <div className="seo-product-grid">{list.map((p) => <ProductCard key={p.slug} product={p} />)}</div>
        <PriceTable list={list} LinkComp={Link} caption={`${c.name}: price, making time and customization`} />
        <DetailBlocks details={c.details} />
        <FaqList faqs={c.faqs} />
        <ExploreLinks LinkComp={Link} />
      </div>
    </div>
  );
}
