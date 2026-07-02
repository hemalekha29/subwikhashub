import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

const TIME_PER_ROUND = 8;
const ROUNDS_PER_GAME = 8;

// A larger pool than what's actually played each round — rounds are picked and
// shuffled per playthrough (and each round's options are shuffled too) so the
// game can't be memorized by position, and near-identical decoys raise difficulty.
const ROUND_POOL = [
  { clue: ['🌹','🍫','🎀'], options: ['Chocolate Bouquet', 'Pipe Cleaner Flower Bouquet', 'Resin Heart Keychain', 'Custom Photo Frame'], answer: 0 },
  { clue: ['📸','✨','💎'], options: ['A4 Wedding & Couple Frame', 'Resin Photo Keychain', 'Custom Fridge Magnet', 'Custom A4 Birthday Frame'], answer: 1 },
  { clue: ['🐼','🌙','💡'], options: ['Pipe Cleaner Sunflower Pot', 'Cute Animal Night Light', 'Panda Colour-Changing Lamp', 'Evil Eye Bell Keychain'], answer: 2 },
  { clue: ['💑','🖼️','💒'], options: ['Custom A4 Birthday Frame', 'A4 Wedding & Couple Frame', 'Custom Fridge Magnet', 'Resin Photo Keychain'], answer: 1 },
  { clue: ['🌻','🌿','🪴'], options: ['Resin Letter Keychain', 'Pipe Cleaner Sunflower Pot', 'Chocolate Bouquet', 'Cute Animal Night Light'], answer: 1 },
  { clue: ['🔑','💎','🌸'], options: ['Evil Eye Bell Keychain', 'Resin Heart Keychain', 'Pipe Cleaner Flower Keychain', 'Custom 4×4 Frame'], answer: 1 },
  { clue: ['🧲','🖼️','🏠'], options: ['Custom Photo Frame', 'Custom Fridge Magnet', 'Chocolate Bouquet', 'Cute Animal Night Light'], answer: 1 },
  { clue: ['🌍','🔮','🌸'], options: ['Resin Globe Keychain', 'Resin Letter Keychain', 'Pink Daisy Keychain', 'Custom Resin Photo Coaster'], answer: 0 },
  { clue: ['🐰🐻','🌙','😴'], options: ['Panda Colour-Changing Lamp', 'Cute Animal Night Light', 'Pipe Cleaner Sunflower Pot', 'A4 Wedding & Couple Frame'], answer: 1 },
  { clue: ['👁️','🔔','🧿'], options: ['Resin Heart Keychain', 'Evil Eye Bell Keychain', 'Resin Globe Keychain', 'Custom 4×4 Frame'], answer: 1 },
  { clue: ['🌹','🔴','🔑'], options: ['Red Rose Keychain', 'Pink Daisy Keychain', 'Pipe Cleaner Flower Keychain', 'Resin Heart Keychain'], answer: 0 },
  { clue: ['🌼','🩷','🔑'], options: ['Pink Daisy Keychain', 'Red Rose Keychain', 'Resin Letter Keychain', 'Pipe Cleaner Sunflower Pot'], answer: 0 },
  { clue: ['🥇','☀️','🖼️'], options: ['Custom Resin Photo Coaster', 'Custom A4 Birthday Frame', 'Custom Photo Frame', 'Custom 4×4 Frame'], answer: 0 },
  { clue: ['🔲','⬜','🖼️'], options: ['Custom Photo Frame', 'Custom 4×4 Frame', 'A4 Wedding & Couple Frame', 'Custom A4 Birthday Frame'], answer: 1 },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSession() {
  return shuffle(ROUND_POOL)
    .slice(0, ROUNDS_PER_GAME)
    .map(round => {
      const correctText = round.options[round.answer];
      const options = shuffle(round.options);
      return { clue: round.clue, options, answer: options.indexOf(correctText) };
    });
}

export default function EmojiDecode({ onComplete }) {
  const [rounds] = useState(buildSession);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [round]);

  function startTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_ROUND);
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
    setFlash({ chosen: -1, correct: false });
    setTimeout(() => advance(scoreRef.current), 1200);
  }

  function handleClick(idx) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    clearInterval(timerRef.current);
    setLocked(true);
    const current = rounds[round];
    const isCorrect = idx === current.answer;
    setFlash({ chosen: idx, correct: isCorrect });
    if (isCorrect) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setTimeout(() => advance(scoreRef.current), 1000);
  }

  function advance(currentScore) {
    const nextRound = round + 1;
    if (nextRound >= rounds.length) {
      onComplete(scoreToDiscount(currentScore, rounds.length));
      return;
    }
    setRound(nextRound);
    setFlash(null);
    setLocked(false);
  }

  const current = rounds[round];

  function getOptionStyle(idx) {
    const base = {
      padding: '13px 18px',
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
    if (idx === current.answer) {
      return { ...base, background: 'rgba(74,222,128,0.15)', borderColor: '#4ade80', color: '#4ade80' };
    }
    if (idx === flash.chosen && !flash.correct) {
      return { ...base, background: 'rgba(248,113,113,0.15)', borderColor: '#f87171', color: '#f87171' };
    }
    return base;
  }

  return (
    <div style={{ maxWidth: '520px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          Round {round + 1} / {rounds.length}
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
            width: `${(timeLeft / TIME_PER_ROUND) * 100}%`,
            background: timeLeft <= 4 ? '#f87171' : 'var(--gold)',
            borderRadius: '3px',
            transition: 'width 1s linear',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: timeLeft <= 4 ? '#f87171' : 'var(--gold)', minWidth: '22px', textAlign: 'right' }}>
          {timeLeft}
        </span>
      </div>

      <div style={{
        background: 'var(--black-card)',
        border: '1px solid var(--black-border)',
        borderRadius: '14px',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
        {rounds.map((_, i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: i < round ? 'var(--gold)' : i === round ? 'var(--gold-light)' : 'var(--black-border)',
          }} />
        ))}
      </div>
    </div>
  );
}
