import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

const WORDS = [
  { word: 'ANNIVERSARY', scrambled: 'RASVINRYANE' },
  { word: 'HANDCRAFTED', scrambled: 'DNCEFHARDTA' },
  { word: 'PERSONALIZE', scrambled: 'LEEIANPROZSZ' },
  { word: 'CELEBRATION', scrambled: 'ONIEATBERCLL' },
  { word: 'KEEPSAKE', scrambled: 'ESEAPKEK' },
  { word: 'CUSTOMIZED', scrambled: 'DZOMITCUSE' },
  { word: 'CHOCOLATE', scrambled: 'COHLCEATO' },
];

const TIME_PER_WORD = 18;

export default function WordScramble({ onComplete }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIME_PER_WORD);
  const [feedback, setFeedback] = useState(null);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);
  const roundRef = useRef(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [round]);

  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_WORD);
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
    setLocked(true);
    setFeedback('wrong');
    setTimeout(() => advance(), 1400);
  }

  function handleSubmit() {
    if (lockedRef.current) return;
    lockedRef.current = true;
    clearInterval(timerRef.current);
    const isCorrect = input.trim().toUpperCase() === WORDS[roundRef.current].word;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setLocked(true);
    if (isCorrect) {
      scoreRef.current = scoreRef.current + 1;
      setScore(scoreRef.current);
    }
    setTimeout(() => advance(), 1000);
  }

  function advance() {
    const nextRound = roundRef.current + 1;
    if (nextRound >= WORDS.length) {
      onComplete(scoreToDiscount(scoreRef.current, WORDS.length));
      return;
    }
    roundRef.current = nextRound;
    setRound(nextRound);
    setInput('');
    setFeedback(null);
    setLocked(false);
  }

  const current = WORDS[round];

  return (
    <div style={{ maxWidth: '460px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Word {round + 1} / {WORDS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--gold)' }}>
          Score: {score}
        </span>
      </div>

      <div style={{
        background: 'var(--black-card)',
        border: '1px solid var(--black-border)',
        borderRadius: '14px',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
      }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Unscramble this gift word
        </p>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--gold)', letterSpacing: '0.12em', textAlign: 'center' }}>
          {current.scrambled}
        </p>

        {feedback === 'wrong' && (
          <p style={{ color: '#f87171', fontSize: '0.85rem' }}>
            Answer: <strong style={{ color: 'var(--gold)' }}>{current.word}</strong>
          </p>
        )}
        {feedback === 'correct' && (
          <p style={{ color: '#4ade80', fontSize: '0.85rem' }}>Correct! +1 point</p>
        )}

        <input
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            border: `1px solid ${feedback === 'correct' ? '#4ade80' : feedback === 'wrong' ? '#f87171' : 'var(--black-border)'}`,
            background: 'var(--black-card)',
            color: 'var(--white)',
            fontSize: '1.05rem',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            width: '100%',
            outline: 'none',
          }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={locked}
          placeholder="Type your answer..."
          autoFocus
        />

        <button className="btn-gold" onClick={handleSubmit} disabled={locked} style={{ opacity: locked ? 0.5 : 1 }}>
          Submit
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TIME</span>
        <div style={{ flex: 1, height: '5px', background: 'var(--black-border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(timeLeft / TIME_PER_WORD) * 100}%`,
            background: timeLeft <= 6 ? '#f87171' : 'var(--gold)',
            borderRadius: '3px',
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: timeLeft <= 6 ? '#f87171' : 'var(--gold)', minWidth: '26px', textAlign: 'right' }}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
