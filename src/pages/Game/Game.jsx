import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Game.module.css';

import MemoryMatch from './games/MemoryMatch';
import GiftQuiz from './games/GiftQuiz';
import WordScramble from './games/WordScramble';
import PatternEcho from './games/PatternEcho';
import OddOneOut from './games/OddOneOut';
import EmojiDecode from './games/EmojiDecode';
import SpeedCount from './games/SpeedCount';
import LuckyWheel from './games/LuckyWheel';

const GAMES = [
  MemoryMatch,
  GiftQuiz,
  WordScramble,
  PatternEcho,
  OddOneOut,
  EmojiDecode,
  SpeedCount,
  LuckyWheel,
];

const GAME_TITLES = [
  'Memory Match',
  'Gift Quiz',
  'Word Scramble',
  'Pattern Echo',
  'Odd One Out',
  'Emoji Decode',
  'Speed Count',
  'Lucky Wheel',
];

export function scoreToDiscount(score, max) {
  const ratio = score / max;
  if (ratio >= 0.9) return 10;
  if (ratio >= 0.7) return 7;
  if (ratio >= 0.5) return 5;
  return 3;
}

const gameIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 8;

export default function Game() {
  const [result, setResult] = useState(null);
  const [playKey, setPlayKey] = useState(0);

  const ActiveGame = GAMES[gameIndex];

  function handleComplete(percent) {
    setResult(percent);
    localStorage.setItem(
      'subwikha_discount',
      JSON.stringify({ percent, expires: Date.now() + 24 * 60 * 60 * 1000, used: false })
    );
  }

  function playAgain() {
    setResult(null);
    setPlayKey(k => k + 1);
  }

  return (
    <div className={`page-container ${styles.page}`}>
      <div className={styles.header}>
        <span className="section-label">Play &amp; Win</span>
        <h1 className={styles.title}>{GAME_TITLES[gameIndex]}</h1>
        <p className={styles.subtitle}>
          Play the weekly game to unlock a discount on your order. Fastest &amp; smartest wins 10% off!
        </p>
        <div className={styles.tiers}>
          {[['Under 30s / 90%+', '10%'], ['Under 50s / 70%+', '7%'], ['Under 60s / 50%+', '5%'], ['Anytime / Any', '3%']].map(([t, d]) => (
            <div key={t} className={styles.tier}>
              <span className={styles.tierDiscount}>{d}</span>
              <span className={styles.tierTime}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {result === null ? (
        <ActiveGame key={playKey} onComplete={handleComplete} />
      ) : (
        <div className={styles.result}>
          <div className={styles.resultGlow} />
          <div className={styles.resultBadge}>{result}%</div>
          <h2 className={styles.resultTitle}>You won {result}% off!</h2>
          <p className={styles.resultNote}>
            Discount auto-applied at checkout. Valid for 24 hours.
          </p>
          <div className={styles.resultActions}>
            <Link to="/shop" className="btn-gold">Shop Now</Link>
            <button className="btn-outline" onClick={playAgain}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
