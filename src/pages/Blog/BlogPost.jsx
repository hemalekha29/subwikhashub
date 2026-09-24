import { useParams, Link, Navigate } from 'react-router-dom';
import Seo from '../../components/Seo/Seo';
import { SITE } from '../../data/site';
import { blogBySlug } from '../../data/seoContent';
import { blogHead } from '../../lib/seo';
import { Breadcrumbs, BlogArticleBody, ExploreLinks } from '../../seo/content';

export default function BlogPost() {
  const { slug } = useParams();
  const post = blogBySlug(slug);
  if (!post) return <Navigate to="/blog" replace />;

  return (
    <div className="page-container">
      <Seo head={blogHead(post)} />
      <article className="seo-frame seo-page">
        <Breadcrumbs LinkComp={Link} items={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }]} />
        <h1>{post.title}</h1>
        <p className="seo-post-meta">By {SITE.name} · Published <time dateTime={post.date}>{post.date}</time></p>
        <img className="seo-hero-img" src={post.image} alt={post.imageAlt} width="1000" height="380" />
        <BlogArticleBody post={post} LinkComp={Link} />
        <ExploreLinks LinkComp={Link} />
      </article>
    </div>
  );
}
