import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

// Genuinely hard, unlike SpeedCount (which is a single glance-and-count task):
// difficulty escalates every round (two-digit multiplication and mixed
// operator-precedence expressions show up fast), and the per-question timer
// shrinks as rounds go on, so staying accurate under real time pressure is
// the actual challenge — most players won't cleanly ace this one.
const TOTAL_ROUNDS = 8;
const START_TIME_MS = 6000;
const MIN_TIME_MS = 2200;
const TIME_STEP_MS = 500;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Round difficulty ramps: early rounds are single operations, later rounds mix
// two operators with real operator-precedence (× before +), which is exactly
// the kind of thing that trips people up when they're rushing.
function generateProblem(round) {
  if (round < 2) {
    const a = randInt(3, 12), b = randInt(3, 12);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (round < 4) {
    const a = randInt(4, 15), b = randInt(2, 9);
    const op = Math.random() < 0.5 ? '-' : '×';
    return op === '-' ? { text: `${a} - ${b}`, answer: a - b } : { text: `${a} × ${b}`, answer: a * b };
  }
  if (round < 6) {
    const a = randInt(11, 20), b = randInt(2, 9);
    return { text: `${a} × ${b}`, answer: a * b };
  }
  // Order of operations — the real difficulty spike.
  const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 12);
  return { text: `${a} + ${b} × ${c}`, answer: a + b * c };
}

function makeOptions(correct) {
  const spread = Math.max(3, Math.round(Math.abs(correct) * 0.15));
  const seen = new Set([correct]);
  const opts = [correct];
  while (opts.length < 4) {
    const delta = randInt(-spread, spread) || 1;
    const v = correct + delta;
    if (!seen.has(v)) { seen.add(v); opts.push(v); }
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

export default function MathRush({ onComplete }) {
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState(null);
  const [options, setOptions] = useState([]);
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
    const p = generateProblem(r);
    setProblem(p);
    setOptions(makeOptions(p.answer));
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
    }, 100);
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
    }, 550);
  }

  function handleAnswer(val) {
    if (locked || !problem) return;
    settle(val === problem.answer, round);
  }

  const pct = problem ? Math.max(0, Math.min(100, (timeLeft / roundBudget(round)) * 100)) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '480px', width: '100%' }}>
      {!started ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: '1.7' }}>
            Solve the problem before the timer runs out. Problems get harder every round —
            and the clock gets shorter. 8 rounds, no mercy.
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
              transition: 'width 0.1s linear, background 0.2s',
            }} />
          </div>

          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: 'var(--white)', textAlign: 'center' }}>
            {problem?.text} = ?
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {options.map((val, i) => {
              const isCorrectOpt = flash !== null && val === problem.answer;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(val)}
                  disabled={locked}
                  style={{
                    padding: '14px 22px',
                    borderRadius: '10px',
                    border: `1px solid ${isCorrectOpt ? '#4ade80' : 'var(--black-border)'}`,
                    background: isCorrectOpt ? 'rgba(74,222,128,0.15)' : 'var(--black-card)',
                    color: isCorrectOpt ? '#4ade80' : 'var(--white)',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-serif)',
                    cursor: locked ? 'default' : 'pointer',
                    minWidth: '72px',
                  }}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
