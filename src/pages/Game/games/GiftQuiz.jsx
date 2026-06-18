import { useState } from 'react';
import { scoreToDiscount } from '../Game';

const QUESTIONS = [
  {
    q: 'Which flower is most popular in gift bouquets?',
    options: ['Sunflower', 'Rose', 'Daisy', 'Lily'],
    correct: 1,
  },
  {
    q: "Valentine's Day is celebrated on?",
    options: ['Feb 10', 'Feb 12', 'Feb 14', 'Feb 15'],
    correct: 2,
  },
  {
    q: "What does 'handcrafted' mean?",
    options: ['Machine-made', 'Imported', 'Made by hand', 'Mass-produced'],
    correct: 2,
  },
  {
    q: 'Which Indian festival is best known for gifting sweets & lights?',
    options: ['Holi', 'Diwali', 'Eid', 'Pongal'],
    correct: 1,
  },
  {
    q: 'Resin art is made by?',
    options: ['Weaving fabric', 'Casting clear resin', 'Moulding clay', 'Knitting wire'],
    correct: 1,
  },
];

export default function GiftQuiz({ onComplete }) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // null | { index, correct: bool }
  const [locked, setLocked] = useState(false);

  const current = QUESTIONS[qIndex];

  function handleAnswer(idx) {
    if (locked) return;
    setLocked(true);
    const isCorrect = idx === current.correct;
    setFlash({ index: idx, correct: isCorrect });
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);

    setTimeout(() => {
      setFlash(null);
      const nextIndex = qIndex + 1;
      if (nextIndex >= QUESTIONS.length) {
        onComplete(scoreToDiscount(newScore, QUESTIONS.length));
      } else {
        setQIndex(nextIndex);
        setLocked(false);
      }
    }, 1000);
  }

  function getOptionStyle(idx) {
    const base = {
      padding: '14px 20px',
      borderRadius: '10px',
      border: '1px solid var(--black-border)',
      background: 'var(--black-card)',
      color: 'var(--white)',
      fontSize: '0.95rem',
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
    <div style={{ maxWidth: '520px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Question {qIndex + 1} / {QUESTIONS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold)' }}>
          Score: {score}
        </span>
      </div>

      <div style={{
        background: 'var(--black-card)',
        border: '1px solid var(--black-border)',
        borderRadius: '14px',
        padding: '28px 24px',
      }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--white)', lineHeight: '1.6', marginBottom: '24px' }}>
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
