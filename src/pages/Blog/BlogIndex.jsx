import { Link } from 'react-router-dom';
import Seo from '../../components/Seo/Seo';
import { SITE } from '../../data/site';
import { staticHeads } from '../../lib/seo';
import { Breadcrumbs, AnswerBox, BlogIndexList } from '../../seo/content';

export default function BlogIndex() {
  return (
    <div className="page-container">
      <Seo head={staticHeads.blog()} />
      <div className="seo-frame seo-page">
        <Breadcrumbs LinkComp={Link} items={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }]} />
        <h1>Gift Guides &amp; Handmade Gift Ideas</h1>
        <AnswerBox>{`Practical gift guides from ${SITE.name}: how to choose between a chocolate and a flower bouquet, anniversary gift ideas in India, and how resin art gifts are made.`}</AnswerBox>
        <BlogIndexList LinkComp={Link} />
      </div>
    </div>
  );
}
