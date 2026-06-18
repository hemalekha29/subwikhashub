import { Link } from 'react-router-dom';
import styles from './About.module.css';

const milestones = [
  { year: '2024', label: 'The Beginning', text: 'Subwikha\'s Hub was born: the first handmade gifts created with love and shared with friends and family.' },
  { year: '~10mo', label: 'A Pause to Reflect', text: 'A period of doubt and rest. The passion for creating never disappeared: it quietly grew stronger.' },
  { year: 'Comeback', label: 'Renewed & Reimagined', text: 'A fresh start with bolder ideas, unique designs, and a deeper commitment to meaningful gifts.' },
  { year: '50+', label: 'Orders & Counting', text: 'Every order is a new story, a new memory. Growing every day with the support of a wonderful community.' },
];

export default function About() {
  return (
    <div className={`page-container ${styles.about}`}>
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
            <p>
              Subwikha's Hub began in 2024 with a simple dream: creating handmade gifts that bring genuine happiness to people.
            </p>
            <p>
              What started as a small idea quickly became something special. When the first few gifts were made, friends and family responded with love and encouragement. That support gave the confidence to turn a personal passion into a real business.
            </p>
            <p>
              The journey wasn't always easy. After completing several orders, there came a pause: nearly 10 months of doubt, of questioning whether this dream could truly grow. But the love for creating meaningful gifts never left.
            </p>
            <p>
              With renewed determination came a comeback: fresh ideas, unique designs, and more personalized creations. From chocolate bouquets and resin art to customized gifts and handmade keepsakes, every product is crafted with care and attention to detail.
            </p>
            <p className={styles.highlight}>
              Today, 50+ orders in and still growing: fuelled by wonderful customers, friends, and family. Every order is motivation to create something even more special. This is just the beginning.
            </p>
            <p className={styles.thanks}>Thank you for being part of our story. ❤</p>
          </div>
          <div className={styles.storyImg}>
            <img
              src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=700&q=80"
              alt="Subwikha's Hub: Handmade Gifts"
            />
          </div>
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
            {[
              { symbol: '◈', title: 'Handmade with Love', text: 'From chocolate bouquets to resin art: every piece is made by hand, with care poured into every detail.' },
              { symbol: '◇', title: 'Deeply Personal', text: 'Each gift is created to feel uniquely theirs. Customization is at the heart of everything we do.' },
              { symbol: '◆', title: 'Built on Encouragement', text: 'Every kind word from a customer or loved one pushes us to create something even better.' },
              { symbol: '◉', title: 'Always Evolving', text: 'We never stop learning, creating, and imagining new ways to make someone\'s day extraordinary.' },
            ].map(({ symbol, title, text }) => (
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
