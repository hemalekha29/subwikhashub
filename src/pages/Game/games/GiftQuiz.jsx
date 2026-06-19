import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

const TIME_PER_Q = 15;

const QUESTIONS = [
  {
    q: 'Which resin technique uses UV light to cure the art piece?',
    options: ['Alcohol Ink', 'UV Resin Casting', 'Epoxy Pouring', 'Silicone Mold'],
    correct: 1,
  },
  {
    q: 'Which Indian festival is famous for gifting diyas, sweets and lights?',
    options: ['Onam', 'Diwali', 'Pongal', 'Navratri'],
    correct: 1,
  },
  {
    q: 'What is the ideal temperature range for tempering chocolate for bouquets?',
    options: ['20–25°C', '28–32°C', '36–40°C', '15–18°C'],
    correct: 1,
  },
  {
    q: 'Pipe cleaner crafts are also known as?',
    options: ['Origami Art', 'Chenille Crafts', 'Macramé', 'Decoupage'],
    correct: 1,
  },
  {
    q: 'Which of these is NOT a gemstone used in jewellery gifting?',
    options: ['Amethyst', 'Obsidian', 'Acrylic', 'Citrine'],
    correct: 2,
  },
  {
    q: 'What does "bespoke" mean in the context of gifts?',
    options: ['Mass-produced', 'Custom-made for one person', 'Imported from abroad', 'Eco-friendly'],
    correct: 1,
  },
  {
    q: 'Which flower is traditionally used in Indian wedding gift décor?',
    options: ['Orchid', 'Marigold', 'Lavender', 'Peony'],
    correct: 1,
  },
];

export default function GiftQuiz({ onComplete }) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [qIndex]);

  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_Q);
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
    setFlash({ index: -1, correct: false });
    setTimeout(() => advance(scoreRef.current), 1200);
  }

  function handleAnswer(idx) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    clearInterval(timerRef.current);
    setLocked(true);
    const isCorrect = idx === QUESTIONS[qIndex].correct;
    setFlash({ index: idx, correct: isCorrect });
    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setTimeout(() => advance(scoreRef.current), 1000);
  }

  function advance(currentScore) {
    const nextIndex = qIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      onComplete(scoreToDiscount(currentScore, QUESTIONS.length));
      return;
    }
    setQIndex(nextIndex);
    setFlash(null);
    setLocked(false);
  }

  const current = QUESTIONS[qIndex];

  function getOptionStyle(idx) {
    const base = {
      padding: '14px 20px',
      borderRadius: '10px',
      border: '1px solid var(--black-border)',
      background: 'var(--black-card)',
      color: 'var(--white)',
      fontSize: '0.9rem',
      cursor: locked ? 'default' : 'pointer',
      textAlign: 'left',
      transition: 'background 0.2s, border-color 0.2s',
      width: '100%',
    };
    if (!flash) return base;
    if (idx === current.correct) {
      return { ...base, background: 'rgba(74,222,128,0.15)', borderColor: '#4ade80', color: '#4ade80' };
    }
    if (idx === flash.index && !flash.correct) {
      return { ...base, background: 'rgba(248,113,113,0.15)', borderColor: '#f87171', color: '#f87171' };
    }
    return base;
  }

  return (
    <div style={{ maxWidth: '520px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Q {qIndex + 1} / {QUESTIONS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--gold)' }}>
          Score: {score}
        </span>
      </div>

      {/* Timer bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TIME</span>
        <div style={{ flex: 1, height: '5px', background: 'var(--black-border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(timeLeft / TIME_PER_Q) * 100}%`,
            background: timeLeft <= 5 ? '#f87171' : 'var(--gold)',
            borderRadius: '3px',
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: timeLeft <= 5 ? '#f87171' : 'var(--gold)', minWidth: '22px', textAlign: 'right' }}>
          {timeLeft}
        </span>
      </div>

      <div style={{
        background: 'var(--black-card)',
        border: '1px solid var(--black-border)',
        borderRadius: '14px',
        padding: '24px',
      }}>
        <p style={{ fontSize: '1rem', color: 'var(--white)', lineHeight: '1.6', marginBottom: '20px' }}>
          {current.q}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {current.options.map((opt, idx) => (
            <button key={idx} style={getOptionStyle(idx)} onClick={() => handleAnswer(idx)}>
              <span style={{ color: 'var(--gold)', marginRight: '10px', fontWeight: 700 }}>
                {String.fromCharCode(65 + idx)})
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: i < qIndex ? 'var(--gold)' : i === qIndex ? 'var(--gold-light)' : 'var(--black-border)',
          }} />
        ))}
      </div>
    </div>
  );
}
