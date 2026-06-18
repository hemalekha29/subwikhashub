import { useState } from 'react';
import { scoreToDiscount } from '../Game';

const ROUNDS = [
  { clue: ['🌹','🍫','🎀'], options: ['Chocolate Bouquet','Resin Keychain','Night Light','Photo Frame'], answer: 0 },
  { clue: ['📸','✨','💎'], options: ['Wedding Frame','Resin Photo Keychain','Fridge Magnet','Birthday Frame'], answer: 1 },
  { clue: ['🐼','🌙','💡'], options: ['Pipe Cleaner Pot','Chocolate Bouquet','Panda Night Lamp','Evil Eye Keychain'], answer: 2 },
  { clue: ['💑','🖼️','💒'], options: ['Birthday Frame','Wedding & Couple Frame','Fridge Magnet','Photo Keychain'], answer: 1 },
  { clue: ['🌻','🌿','🪴'], options: ['Resin Keychain','Sunflower Pot','Chocolate Bouquet','Night Light'], answer: 1 },
];

export default function EmojiDecode({ onComplete }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // null | { chosen, correct: bool }
  const [locked, setLocked] = useState(false);

  const current = ROUNDS[round];

  function handleClick(idx) {
    if (locked) return;
    setLocked(true);
    const isCorrect = idx === current.answer;
    setFlash({ chosen: idx, correct: isCorrect });
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);

    setTimeout(() => {
      setFlash(null);
      const nextRound = round + 1;
      if (nextRound >= ROUNDS.length) {
        onComplete(scoreToDiscount(newScore, ROUNDS.length));
      } else {
        setRound(nextRound);
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
    if (idx === current.answer) {
      return { ...base, background: 'rgba(74,222,128,0.15)', borderColor: '#4ade80', color: '#4ade80' };
    }
    if (idx === flash.chosen && !flash.correct) {
      return { ...base, background: 'rgba(248,113,113,0.15)', borderColor: '#f87171', color: '#f87171' };
    }
    return base;
  }

  return (
    <div style={{ maxWidth: '520px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Round {round + 1} / {ROUNDS.length}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--gold)' }}>
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
        gap: '20px',
      }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          What gift do these emojis represent?
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', fontSize: '3rem', lineHeight: '1' }}>
          {current.clue.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          {current.options.map((opt, idx) => (
            <button key={idx} style={getOptionStyle(idx)} onClick={() => handleClick(idx)}>
              <span style={{ color: 'var(--gold)', marginRight: '10px', fontWeight: 700 }}>
                {String.fromCharCode(65 + idx)})
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {ROUNDS.map((_, i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: i < round ? 'var(--gold)' : i === round ? 'var(--gold-light)' : 'var(--black-border)',
          }} />
        ))}
      </div>
    </div>
  );
}
