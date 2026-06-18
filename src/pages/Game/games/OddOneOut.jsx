import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

const ROUNDS = [
  { emojis: ['🌸','🌻','🌹','💐','🌷','🏵️','🌺','🎁'], odd: 7 },
  { emojis: ['🎁','🧸','🎀','🎊','🎈','🎶','🕯️','🍕'], odd: 7 },
  { emojis: ['🍫','🍭','🍬','🍩','🧁','🍰','🎂','🔑'], odd: 7 },
  { emojis: ['💍','💎','👑','✨','🌟','⭐','💫','🚗'], odd: 7 },
  { emojis: ['❤️','💝','💖','💗','💓','💞','💕','🎃'], odd: 7 },
];

const ROUND_TIME = 10;

export default function OddOneOut({ onComplete }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [feedback, setFeedback] = useState(null); // null | { chosen, correct }
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [round]);

  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(ROUND_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function handleTimeout() {
    setFeedback({ chosen: -1, correct: ROUNDS[round].odd });
    setLocked(true);
    setTimeout(() => advance(), 1200);
  }

  function handleClick(idx) {
    if (locked) return;
    clearInterval(timerRef.current);
    const isCorrect = idx === ROUNDS[round].odd;
    if (isCorrect) {
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
    }
    setFeedback({ chosen: idx, correct: ROUNDS[round].odd });
    setLocked(true);
    setTimeout(() => advance(), 1000);
  }

  function advance() {
    const nextRound = round + 1;
    if (nextRound >= ROUNDS.length) {
      onComplete(scoreToDiscount(scoreRef.current, ROUNDS.length));
      return;
    }
    setRound(nextRound);
    setFeedback(null);
    setLocked(false);
  }

  const current = ROUNDS[round];

  function getButtonStyle(idx) {
    const base = {
      width: '72px',
      height: '72px',
      fontSize: '2rem',
      borderRadius: '12px',
      border: '1px solid var(--black-border)',
      background: 'var(--black-card)',
      cursor: locked ? 'default' : 'pointer',
      transition: 'background 0.2s, border-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    if (!feedback) return base;
    if (idx === current.odd) {
      return { ...base, background: 'rgba(74,222,128,0.15)', borderColor: '#4ade80' };
    }
    if (idx === feedback.chosen && idx !== current.odd) {
      return { ...base, background: 'rgba(248,113,113,0.15)', borderColor: '#f87171' };
    }
    return base;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '480px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Round {round + 1} / {ROUNDS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold)' }}>
          Score: {score}
        </span>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--white)', textAlign: 'center' }}>
        Find the one that doesn't belong!
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 72px)', gap: '12px' }}>
        {current.emojis.map((emoji, idx) => (
          <button key={idx} style={getButtonStyle(idx)} onClick={() => handleClick(idx)}>
            {emoji}
          </button>
        ))}
      </div>

      {/* Timer bar */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TIME</span>
        <div style={{ flex: 1, height: '6px', background: 'var(--black-border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(timeLeft / ROUND_TIME) * 100}%`,
            background: timeLeft <= 3 ? '#f87171' : 'var(--gold)',
            borderRadius: '3px',
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: timeLeft <= 3 ? '#f87171' : 'var(--gold)', minWidth: '24px', textAlign: 'right' }}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
