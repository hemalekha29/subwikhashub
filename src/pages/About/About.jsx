import { Link } from 'react-router-dom';
import Seo from '../../components/Seo/Seo';
import { staticHeads } from '../../lib/seo';
import { SITE, SUMMARY } from '../../data/site';
import {
  storyParagraphs, storyHighlight, storyThanks, milestones, values, howItsMade, aboutFacts,
} from '../../data/aboutContent';
import { AnswerBox } from '../../seo/content';
import styles from './About.module.css';

export default function About() {
  return (
    <div className={`page-container ${styles.about}`}>
      <Seo head={staticHeads.about()} />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <span className="section-label">Our Story</span>
          <h1 className={styles.heroTitle}>
            Built with Encouragement,<br />
            <em>Creativity & Heart</em>
          </h1>
        </div>
      </section>

      {/* Story */}
      <section className={styles.story}>
        <div className={styles.storyGrid}>
          <div className={styles.storyText}>
            <span className="section-label">How It All Began</span>
            <h2 className={styles.storyTitle}>A Simple Dream, A Beautiful Journey</h2>
            {storyParagraphs.map(t => <p key={t}>{t}</p>)}
            <p className={styles.highlight}>{storyHighlight}</p>
            <p className={styles.thanks}>{storyThanks}</p>
          </div>
          <div className={styles.storyImg}>
            <img
              src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=700&q=80"
              alt="Handmade gifts from Subwikha's Hub in Coimbatore — a wrapped gift with a ribbon"
            />
          </div>
        </div>
      </section>

      {/* At a glance + how it's made: first-hand facts about who makes the gifts and how
          (E-E-A-T). Same content is in the prerendered static /about page. */}
      <section className="seo-page">
        <div className="seo-frame">
          <AnswerBox>{SUMMARY}</AnswerBox>
          <h2>At a glance</h2>
          <div className="seo-table-wrap">
            <table className="seo-table">
              <tbody>{aboutFacts.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody>
            </table>
          </div>
          {SITE.founderStory && (<><h2>About the founder</h2><p>{SITE.founderStory}</p></>)}
          <h2>How our gifts are made</h2>
          {howItsMade.map(x => <div key={x.h}><h3>{x.h}</h3><p>{x.t}</p></div>)}
        </div>
      </section>

      {/* Milestones / Timeline */}
      <section className={styles.timeline}>
        <div className={styles.timelineInner}>
          <div className={styles.timelineHead}>
            <span className="section-label">The Journey</span>
            <h2 className={styles.timelineTitle}>Our Milestones</h2>
            <div className="divider" />
          </div>
          <div className={styles.milestones}>
            {milestones.map((m, i) => (
              <div key={i} className={styles.milestone}>
                <div className={styles.milestoneLine}>
                  <div className={styles.milestoneDot} />
                  {i < milestones.length - 1 && <div className={styles.milestoneConnector} />}
                </div>
                <div className={styles.milestoneContent}>
                  <span className={styles.milestoneYear}>{m.year}</span>
                  <h4 className={styles.milestoneLabel}>{m.label}</h4>
                  <p className={styles.milestoneText}>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className={styles.values}>
        <div className={styles.valuesInner}>
          <div className={styles.valuesHead}>
            <span className="section-label">What We Stand For</span>
            <h2 className={styles.valuesTitle}>Our Craft</h2>
            <div className="divider" />
          </div>
          <div className={styles.valuesGrid}>
            {values.map(({ symbol, title, text }) => (
              <div key={title} className={styles.valueCard}>
                <span className={styles.valueSymbol}>{symbol}</span>
                <h3 className={styles.valueTitle}>{title}</h3>
                <p className={styles.valueText}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <img src="/logo.png" alt="Subwikha's Hub" className={styles.ctaLogo} />
        <h2 className={styles.ctaTitle}>Be Part of Our Story</h2>
        <p className={styles.ctaText}>Every order you place adds another chapter to this journey. Thank you.</p>
        <Link to="/shop" className="btn-gold">Shop Our Collection</Link>
      </section>
    </div>
  );
}
