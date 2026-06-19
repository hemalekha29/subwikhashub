import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

const POOL = ['🎁','🌸','💝','✨','💐','🎀'];
const GRID_SIZE = 25; // 5×5
const SHOW_DURATION = 1200;
const TOTAL_ROUNDS = 5;

function generateRound(targetEmoji) {
  const grid = Array.from({ length: GRID_SIZE }, () =>
    POOL[Math.floor(Math.random() * POOL.length)]
  );
  const count = grid.filter(e => e === targetEmoji).length;
  return { grid, count };
}

function makeOptions(correct) {
  const offsets = [-2, -1, 1, 2];
  const candidates = [];
  for (const d of offsets) {
    const v = correct + d;
    if (v >= 0 && !candidates.includes(v)) candidates.push(v);
    if (candidates.length >= 3) break;
  }
  while (candidates.length < 3) {
    const v = correct + candidates.length + 1;
    if (!candidates.includes(v) && v !== correct) candidates.push(v);
  }
  const opts = [correct, ...candidates.slice(0, 3)];
  // Fisher-Yates shuffle
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

export default function SpeedCount({ onComplete }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState('show'); // show | answer
  const [roundData, setRoundData] = useState(() => {
    const target = POOL[0];
    return { ...generateRound(target), target, options: [] };
  });
  const [flash, setFlash] = useState(null); // null | { chosen, correct: bool }
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    initRound(0);
    return () => clearTimeout(timerRef.current);
  }, []);

  function initRound(roundIndex) {
    const target = POOL[roundIndex % POOL.length];
    const { grid, count } = generateRound(target);
    const options = makeOptions(count);
    setRoundData({ grid, count, target, options });
    setPhase('show');
    setFlash(null);
    setLocked(false);
    timerRef.current = setTimeout(() => {
      setPhase('answer');
    }, SHOW_DURATION);
  }

  function handleAnswer(value) {
    if (locked || phase !== 'answer') return;
    setLocked(true);
    const isCorrect = value === roundData.count;
    setFlash({ chosen: value, correct: isCorrect });
    if (isCorrect) {
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
    }
    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        onComplete(scoreToDiscount(scoreRef.current, TOTAL_ROUNDS));
        return;
      }
      setRound(nextRound);
      initRound(nextRound);
    }, 1000);
  }

  function getOptionStyle(value) {
    const base = {
      padding: '14px 24px',
      borderRadius: '10px',
      border: '1px solid var(--black-border)',
      background: 'var(--black-card)',
      color: 'var(--white)',
      fontSize: '1.1rem',
      fontFamily: 'var(--font-serif)',
      cursor: locked ? 'default' : 'pointer',
      minWidth: '70px',
      transition: 'background 0.2s, border-color 0.2s',
    };
    if (!flash) return base;
    if (value === roundData.count) {
      return { ...base, background: 'rgba(74,222,128,0.15)', borderColor: '#4ade80', color: '#4ade80' };
    }
    if (value === flash.chosen && !flash.correct) {
      return { ...base, background: 'rgba(248,113,113,0.15)', borderColor: '#f87171', color: '#f87171' };
    }
    return base;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '500px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Round {round + 1} / {TOTAL_ROUNDS}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold)' }}>
          Score: {score}
        </span>
      </div>

      {phase === 'show' ? (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Memorise the grid!
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 44px)', gap: '6px' }}>
            {roundData.grid.map((emoji, i) => (
              <div key={i} style={{
                width: '44px', height: '44px',
                background: 'var(--black-card)',
                border: '1px solid var(--black-border)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                {emoji}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Grid disappears in 1.2 seconds — be fast!
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: '1rem', color: 'var(--white)', textAlign: 'center' }}>
            How many <span style={{ fontSize: '1.5rem' }}>{roundData.target}</span> did you see?
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {roundData.options.map((val, i) => (
              <button key={i} style={getOptionStyle(val)} onClick={() => handleAnswer(val)}>
                {val}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
