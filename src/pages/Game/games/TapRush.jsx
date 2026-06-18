import { useState, useEffect, useRef, useCallback } from 'react';
import { scoreToDiscount } from '../Game';

const GIFT_EMOJIS = ['🎁', '🎀', '🎊', '💝', '🌸', '✨', '💐', '🎈'];
const GAME_DURATION = 30;
const SPAWN_INTERVAL = 900;
const EMOJI_LIFETIME = 1200;
const MAX_LIVES = 3;
const PLAY_W = 400;
const PLAY_H = 280;

export default function TapRush({ onComplete }) {
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [emojis, setEmojis] = useState([]);
  const [finished, setFinished] = useState(false);

  const scoreRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const finishedRef = useRef(false);
  const nextId = useRef(0);
  const spawnRef = useRef(null);
  const timerRef = useRef(null);
  const emojiTimeouts = useRef({});

  const endGame = useCallback((finalScore) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
    Object.values(emojiTimeouts.current).forEach(clearTimeout);
    onComplete(scoreToDiscount(Math.min(finalScore, 20), 20));
  }, [onComplete]);

  function removeEmoji(id, missedByPlayer) {
    if (finishedRef.current) return;
    if (missedByPlayer) {
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      if (newLives <= 0) {
        setEmojis([]);
        endGame(scoreRef.current);
        return;
      }
    }
    setEmojis(prev => prev.filter(e => e.id !== id));
    delete emojiTimeouts.current[id];
  }

  function spawnEmoji() {
    if (finishedRef.current) return;
    const id = nextId.current++;
    const x = Math.random() * (PLAY_W - 48);
    const y = Math.random() * (PLAY_H - 48);
    const emoji = GIFT_EMOJIS[Math.floor(Math.random() * GIFT_EMOJIS.length)];
    setEmojis(prev => [...prev, { id, x, y, emoji }]);
    const t = setTimeout(() => removeEmoji(id, true), EMOJI_LIFETIME);
    emojiTimeouts.current[id] = t;
  }

  function handleTap(id) {
    if (finishedRef.current) return;
    clearTimeout(emojiTimeouts.current[id]);
    delete emojiTimeouts.current[id];
    setEmojis(prev => prev.filter(e => e.id !== id));
    const newScore = scoreRef.current + 1;
    scoreRef.current = newScore;
    setScore(newScore);
  }

  function startGame() {
    setStarted(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endGame(scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    spawnRef.current = setInterval(spawnEmoji, SPAWN_INTERVAL);
  }

  useEffect(() => {
    return () => {
      clearInterval(spawnRef.current);
      clearInterval(timerRef.current);
      Object.values(emojiTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  if (!started) {
    return (
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '360px', lineHeight: '1.7' }}>
          Gift emojis appear on screen — tap them before they vanish! Miss 3 and it's game over.
          30 seconds. Tap as many as you can!
        </p>
        <button className="btn-gold" onClick={startGame}>Start Game</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--gold)', display: 'block' }}>{score}</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Score</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--gold)', display: 'block' }}>{timeLeft}s</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Time</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '1.4rem', display: 'block', letterSpacing: '4px' }}>
            {'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}
          </span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Lives</span>
        </div>
      </div>

      <div style={{
        position: 'relative',
        width: `${PLAY_W}px`,
        height: `${PLAY_H}px`,
        background: '#161616',
        border: '1px solid #222',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'crosshair',
      }}>
        {emojis.map(e => (
          <button
            key={e.id}
            onClick={() => handleTap(e.id)}
            style={{
              position: 'absolute',
              left: `${e.x}px`,
              top: `${e.y}px`,
              fontSize: '2rem',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.1s',
              lineHeight: '1',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            {e.emoji}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        Tap the gifts before they disappear!
      </p>
    </div>
  );
}
