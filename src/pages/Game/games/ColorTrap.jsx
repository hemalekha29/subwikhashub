import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

// The Stroop effect — a genuinely hard, well-studied cognitive-interference test.
// Sounds trivial ("just click the ink color"), but the word's meaning fights your
// brain's instinct to read it, and error rates climb fast once the clock is on.
// Nothing else in the Game Zone tests this — the closest is OddOneOut, which is
// pure visual scanning with no interference component.
const COLORS = [
  { name: 'Red',    hex: '#f87171' },
  { name: 'Blue',   hex: '#60a5fa' },
  { name: 'Green',  hex: '#4ade80' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Purple', hex: '#c084fc' },
];
const TOTAL_ROUNDS = 10;
const START_TIME_MS = 2600;
const MIN_TIME_MS = 1200;
const TIME_STEP_MS = 150;

function randOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRound() {
  const word = randOf(COLORS);
  // Ink color deliberately differs from the word's meaning most of the time —
  // that mismatch is the entire source of difficulty.
  let ink = randOf(COLORS);
  if (Math.random() < 0.85) {
    while (ink.name === word.name) ink = randOf(COLORS);
  }
  const distractors = COLORS.filter(c => c.name !== ink.name);
  const options = [ink, ...shuffle(distractors).slice(0, 3)];
  return { word, ink, options: shuffle(options) };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ColorTrap({ onComplete }) {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [data, setData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(START_TIME_MS);
  const [flash, setFlash] = useState(null);
  const [locked, setLocked] = useState(false);
  const scoreRef = useRef(0);
  const tickRef = useRef(null);
  const deadlineRef = useRef(0);

  useEffect(() => () => clearInterval(tickRef.current), []);

  function roundBudget(r) {
    return Math.max(MIN_TIME_MS, START_TIME_MS - r * TIME_STEP_MS);
  }

  function startRound(r) {
    setData(generateRound());
    setFlash(null);
    setLocked(false);
    const budget = roundBudget(r);
    setTimeLeft(budget);
    deadlineRef.current = Date.now() + budget;
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const remaining = deadlineRef.current - Date.now();
      if (remaining <= 0) {
        clearInterval(tickRef.current);
        settle(false, r);
        return;
      }
      setTimeLeft(remaining);
    }, 80);
  }

  function begin() {
    setStarted(true);
    setRound(0);
    setScore(0);
    scoreRef.current = 0;
    startRound(0);
  }

  function settle(isCorrect, r) {
    if (locked) return;
    setLocked(true);
    clearInterval(tickRef.current);
    setFlash(isCorrect);
    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setTimeout(() => {
      const next = r + 1;
      if (next >= TOTAL_ROUNDS) {
        onComplete(scoreToDiscount(scoreRef.current, TOTAL_ROUNDS));
        return;
      }
      setRound(next);
      startRound(next);
    }, 400);
  }

  function handleAnswer(colorName) {
    if (locked || !data) return;
    settle(colorName === data.ink.name, round);
  }

  const pct = data ? Math.max(0, Math.min(100, (timeLeft / roundBudget(round)) * 100)) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '480px', width: '100%' }}>
      {!started ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: '1.7' }}>
            A word will appear — but you're not reading it. Click the button matching the
            <strong style={{ color: 'var(--white)' }}> ink color</strong> it's printed in, not what it says.
            Sounds easy. It isn't. 10 rounds, getting faster each time.
          </p>
          <button className="btn-gold" onClick={begin}>Start Game</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Round {round + 1} / {TOTAL_ROUNDS}
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold)' }}>
              Score: {score}
            </span>
          </div>

          <div style={{ width: '100%', height: '5px', background: 'var(--black-border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: pct < 25 ? '#f87171' : 'var(--gold)',
              transition: 'width 0.08s linear, background 0.2s',
            }} />
          </div>

          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: '2.6rem', letterSpacing: '0.05em',
            color: data?.ink.hex, textTransform: 'uppercase',
          }}>
            {data?.word.name}
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {data?.options.map((c, i) => {
              const isCorrectOpt = flash !== null && c.name === data.ink.name;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(c.name)}
                  disabled={locked}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: `1px solid ${isCorrectOpt ? '#4ade80' : 'var(--black-border)'}`,
                    background: isCorrectOpt ? 'rgba(74,222,128,0.15)' : 'var(--black-card)',
                    color: c.hex,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: locked ? 'default' : 'pointer',
                    minWidth: '84px',
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
