import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

const WORDS = [
  { word: 'BOUQUET', scrambled: 'UEBUOQT' },
  { word: 'KEYCHAIN', scrambled: 'NIAHCYEK' },
  { word: 'GIFTING', scrambled: 'GIFTNIG' },
  { word: 'MEMORY', scrambled: 'YROMEM' },
  { word: 'HANDMADE', scrambled: 'EMADNAHD' },
];

const TIME_PER_WORD = 30;

export default function WordScramble({ onComplete }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIME_PER_WORD);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);
  const roundRef = useRef(0);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [round]);

  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_WORD);
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
    setLocked(true);
    setFeedback('wrong');
    setTimeout(() => advance(), 1200);
  }

  function handleSubmit() {
    if (locked) return;
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

  const scrambledStyle = {
    fontFamily: 'var(--font-serif)',
    fontSize: '2.5rem',
    color: 'var(--gold)',
    letterSpacing: '0.15em',
    textAlign: 'center',
  };

  const inputStyle = {
    padding: '12px 20px',
    borderRadius: '10px',
    border: `1px solid ${feedback === 'correct' ? '#4ade80' : feedback === 'wrong' ? '#f87171' : 'var(--black-border)'}`,
    background: 'var(--black-card)',
    color: 'var(--white)',
    fontSize: '1.1rem',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    width: '100%',
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '460px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Word {round + 1} / {WORDS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold)' }}>
          Score: {score}
        </span>
      </div>

      <div style={{
        background: 'var(--black-card)',
        border: '1px solid var(--black-border)',
        borderRadius: '14px',
        padding: '36px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Unscramble this word
        </p>
        <p style={scrambledStyle}>{current.scrambled}</p>

        {feedback === 'wrong' && (
          <p style={{ color: '#f87171', fontSize: '0.9rem' }}>
            Answer: <strong style={{ color: 'var(--gold)' }}>{current.word}</strong>
          </p>
        )}
        {feedback === 'correct' && (
          <p style={{ color: '#4ade80', fontSize: '0.9rem' }}>Correct! +1 point</p>
        )}

        <input
          style={inputStyle}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={locked}
          placeholder="Type your answer..."
          autoFocus
        />

        <button
          className="btn-gold"
          onClick={handleSubmit}
          disabled={locked}
          style={{ opacity: locked ? 0.5 : 1 }}
        >
          Submit
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>TIME</span>
        <div style={{ flex: 1, height: '6px', background: 'var(--black-border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(timeLeft / TIME_PER_WORD) * 100}%`,
            background: timeLeft <= 10 ? '#f87171' : 'var(--gold)',
            borderRadius: '3px',
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: timeLeft <= 10 ? '#f87171' : 'var(--gold)', minWidth: '28px', textAlign: 'right' }}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
