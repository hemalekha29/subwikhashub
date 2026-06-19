import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

// Odd emoji is less obvious — all from similar category, one subtle intruder
const BASE_ROUNDS = [
  { emojis: ['🌸','🌺','🌻','🌹','🌷','🏵️','💮','🌼'], odd: 4 },   // all flowers, rose is different shape
  { emojis: ['🎁','🎀','🎊','🎉','🎈','🎏','🎐','🛍️'], odd: 7 },   // shopping bag sneaks in
  { emojis: ['🍫','🍭','🍬','🍩','🧁','🍰','🍮','🥐'], odd: 7 },   // croissant not a sweet treat gift
  { emojis: ['💍','💎','👑','✨','🌟','⭐','💫','🪙'], odd: 7 },     // coin is not ornament
  { emojis: ['❤️','💝','💖','💗','💓','💞','💕','💢'], odd: 7 },    // angry heart intruder
  { emojis: ['🕯️','🪔','🔦','💡','🌕','🌟','✨','🔆'], odd: 2 },   // torch is not a decorative light
  { emojis: ['🎶','🎵','🎸','🎹','🎺','🎻','🥁','📻'], odd: 7 },   // radio not an instrument you play
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick 5 random rounds and shuffle each emoji order (odd position changes)
function buildRounds() {
  const picked = shuffle(BASE_ROUNDS).slice(0, 5);
  return picked.map(({ emojis, odd }) => {
    const oddEmoji = emojis[odd];
    // Rebuild with shuffled positions
    const rest = emojis.filter((_, i) => i !== odd);
    const shuffledRest = shuffle(rest);
    const newOddPos = Math.floor(Math.random() * 8);
    const newEmojis = [...shuffledRest];
    newEmojis.splice(newOddPos, 0, oddEmoji);
    return { emojis: newEmojis.slice(0, 8), odd: newOddPos };
  });
}

const ROUND_TIME = 6;

export default function OddOneOut({ onComplete }) {
  const [rounds] = useState(() => buildRounds());
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [feedback, setFeedback] = useState(null);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [round]);

  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(ROUND_TIME);
    lockedRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!lockedRef.current) handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function handleTimeout() {
    lockedRef.current = true;
    setFeedback({ chosen: -1, correct: rounds[round].odd });
    setLocked(true);
    setTimeout(() => advance(), 1400);
  }

  function handleClick(idx) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    clearInterval(timerRef.current);
    const isCorrect = idx === rounds[round].odd;
    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setFeedback({ chosen: idx, correct: rounds[round].odd });
    setLocked(true);
    setTimeout(() => advance(), 1000);
  }

  function advance() {
    const nextRound = round + 1;
    if (nextRound >= rounds.length) {
      onComplete(scoreToDiscount(scoreRef.current, rounds.length));
      return;
    }
    setRound(nextRound);
    setFeedback(null);
    setLocked(false);
  }

  const current = rounds[round];

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '480px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Round {round + 1} / {rounds.length}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--gold)' }}>
          Score: {score}
        </span>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--white)', textAlign: 'center' }}>
        Quick! Find the one that doesn't belong.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 72px)', gap: '12px' }}>
        {current.emojis.map((emoji, idx) => (
          <button key={idx} style={getButtonStyle(idx)} onClick={() => handleClick(idx)}>
            {emoji}
          </button>
        ))}
      </div>

      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TIME</span>
        <div style={{ flex: 1, height: '5px', background: 'var(--black-border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(timeLeft / ROUND_TIME) * 100}%`,
            background: timeLeft <= 2 ? '#f87171' : 'var(--gold)',
            borderRadius: '3px',
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: timeLeft <= 2 ? '#f87171' : 'var(--gold)', minWidth: '20px', textAlign: 'right' }}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
