import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getActiveSeason } from './seasons';
import Leaderboard from './Leaderboard';
import styles from './Game.module.css';

import MemoryMatch from './games/MemoryMatch';
import GiftQuiz from './games/GiftQuiz';
import WordScramble from './games/WordScramble';
import PatternEcho from './games/PatternEcho';
import OddOneOut from './games/OddOneOut';
import EmojiDecode from './games/EmojiDecode';
import SpeedCount from './games/SpeedCount';
import LuckyWheel from './games/LuckyWheel';
import TapRush from './games/TapRush';

const GAMES = [
  MemoryMatch,
  GiftQuiz,
  WordScramble,
  PatternEcho,
  OddOneOut,
  EmojiDecode,
  SpeedCount,
  LuckyWheel,
  TapRush,
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
  'Tap Rush',
];

export function scoreToDiscount(score, max) {
  const ratio = score / max;
  if (ratio >= 0.9) return 10;
  if (ratio >= 0.7) return 7;
  if (ratio >= 0.5) return 5;
  return 3;
}

const gameIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % GAMES.length;

function dateStr(d) { return d.toISOString().slice(0, 10); }

function updateStreak() {
  let prev = null;
  try { prev = JSON.parse(localStorage.getItem('subwikha_streak') || 'null'); } catch { /* ignore */ }
  const today = dateStr(new Date());
  const yesterday = dateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
  let count;
  if (!prev) count = 1;
  else if (prev.lastPlayedDate === today) count = prev.count;
  else if (prev.lastPlayedDate === yesterday) count = prev.count + 1;
  else count = 1;
  const next = { count, lastPlayedDate: today, bestStreak: Math.max(count, prev?.bestStreak || 0) };
  localStorage.setItem('subwikha_streak', JSON.stringify(next));
  return next;
}

function getPlayerId() {
  let id = localStorage.getItem('subwikha_player_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem('subwikha_player_id', id);
  }
  return id;
}

function getPlayerName() {
  let name = localStorage.getItem('subwikha_player_name');
  if (!name) {
    name = (window.prompt('Pick a display name for the weekly leaderboard (optional):', '') || 'Anonymous').slice(0, 24);
    localStorage.setItem('subwikha_player_name', name);
  }
  return name;
}

async function recordLeaderboardEntry(gameTitle, percent) {
  try {
    await addDoc(collection(db, 'leaderboard'), {
      playerId: getPlayerId(),
      name: getPlayerName(),
      gameId: gameTitle,
      percent,
      createdAt: serverTimestamp(),
    });
  } catch { /* best-effort, never blocks the discount flow */ }
}

const activeSeason = getActiveSeason();

function getActiveDiscount() {
  try {
    const raw = localStorage.getItem('subwikha_discount');
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.used || Date.now() > d.expires) return null;
    return d;
  } catch {
    return null;
  }
}

function formatTimeLeft(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function Game() {
  const [result, setResult] = useState(() => {
    const active = getActiveDiscount();
    return active ? { percent: active.percent, restored: true, expires: active.expires } : null;
  });
  const [playKey, setPlayKey] = useState(0);
  const [streak] = useState(() => {
    try { return JSON.parse(localStorage.getItem('subwikha_streak') || 'null'); } catch { return null; }
  });

  const ActiveGame = GAMES[gameIndex];

  function handleComplete(percent) {
    const nextStreak = updateStreak();
    const bonus = Math.min(nextStreak.count - 1, 5);
    const finalPercent = Math.min(percent + bonus, 15);
    setResult({ percent: finalPercent, bonus, streakCount: nextStreak.count });
    localStorage.setItem(
      'subwikha_discount',
      JSON.stringify({ percent: finalPercent, expires: Date.now() + 24 * 60 * 60 * 1000, used: false })
    );
    recordLeaderboardEntry(GAME_TITLES[gameIndex], finalPercent);
  }

  function playAgain() {
    setResult(null);
    setPlayKey(k => k + 1);
  }

  return (
    <div className={`page-container ${styles.page}`}>
      <Helmet>
        <title>Play & Win Discounts | Subwikha's Hub Game Zone</title>
        <meta name="description" content="Play fun mini-games at Subwikha's Hub and win up to 10% OFF on your next order. Memory match, word scramble, gift quiz and more!" />
        <meta name="keywords" content="gift discount game, play and win, Subwikha's Hub game zone" />
        <link rel="canonical" href="https://subwikhahub.vercel.app/game" />
        <meta property="og:title" content="Play & Win Discounts | Subwikha's Hub" />
        <meta property="og:description" content="Win up to 10% OFF by playing mini-games — Memory Match, Word Scramble, Gift Quiz and more!" />
        <meta property="og:url" content="https://subwikhahub.vercel.app/game" />
        <meta property="og:image" content="https://subwikhahub.vercel.app/logo.png" />
      </Helmet>

      <div className={styles.header}>
        {activeSeason && (
          <span style={{ display: 'inline-block', marginBottom: 8, padding: '4px 14px', borderRadius: 20, fontSize: '0.75rem', border: `1px solid ${activeSeason.accent}`, color: activeSeason.accent }}>
            {activeSeason.label}
          </span>
        )}
        <span className="section-label">Play &amp; Win</span>
        <h1 className={styles.title}>{GAME_TITLES[gameIndex]}</h1>
        <p className={styles.subtitle}>
          Play the weekly game to unlock a discount on your order. Fastest &amp; smartest wins 10% off!
        </p>
        {streak?.count > 1 && (
          <p style={{ color: 'var(--gold)', fontSize: '0.85rem', marginTop: 4 }}>
            🔥 {streak.count}-day streak — playing today keeps your bonus growing (best: {streak.bestStreak})
          </p>
        )}
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
          <div className={styles.resultBadge}>{result.percent}%</div>
          <h2 className={styles.resultTitle}>
            {result.restored ? `You already won ${result.percent}% off!` : `You won ${result.percent}% off!`}
          </h2>
          <p className={styles.resultNote}>
            {result.restored
              ? `Your discount is already active — valid for another ${formatTimeLeft(result.expires - Date.now())}. Auto-applied at checkout.`
              : result.bonus > 0
                ? `Includes a +${result.bonus}% streak bonus (day ${result.streakCount}). Auto-applied at checkout. Valid for 24 hours.`
                : 'Discount auto-applied at checkout. Valid for 24 hours.'}
          </p>
          <div className={styles.resultActions}>
            <Link to="/shop" className="btn-gold">Shop Now</Link>
            {!result.restored && (
              <button className="btn-outline" onClick={playAgain}>Play Again</button>
            )}
          </div>
        </div>
      )}

      <Leaderboard />
    </div>
  );
}
