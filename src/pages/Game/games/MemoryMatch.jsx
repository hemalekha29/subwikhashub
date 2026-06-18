import { useState, useEffect, useRef } from 'react';
import styles from '../Game.module.css';

const EMOJI_POOL = [
  '🎁','🌸','💝','✨','💐','🎀','🏵️','🎊',
  '🍫','🕯️','🌻','💫','🎶','🌹','🧸','💎',
  '🎈','🌙','⭐','🦋','🍀','🌈','🎠','💌',
];

const PAIRS = 10;

function pickAndShuffle() {
  const pool = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
  const picked = pool.slice(0, PAIRS);
  const deck = [...picked, ...picked].map((v, id) => ({ id, v, flipped: false, matched: false }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((card, idx) => ({ ...card, id: idx }));
}

function getDiscount(seconds) {
  if (seconds <= 30) return 10;
  if (seconds <= 50) return 7;
  if (seconds <= 60) return 5;
  return 3;
}

export default function MemoryMatch({ onComplete }) {
  const [cards, setCards] = useState(pickAndShuffle);
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const intervalRef = useRef(null);
  const doneRef = useRef(false);
  const timeRef = useRef(0);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        timeRef.current += 1;
        setTime(timeRef.current);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleFlip = (card) => {
    if (locked || card.flipped || card.matched || doneRef.current) return;
    if (!running) setRunning(true);

    const next = cards.map(c => c.id === card.id ? { ...c, flipped: true } : c);
    const newSel = [...selected, card];
    setCards(next);
    setSelected(newSel);

    if (newSel.length === 2) {
      setLocked(true);
      setMoves(m => m + 1);
      if (newSel[0].v === newSel[1].v) {
        const withMatch = next.map(c =>
          c.v === newSel[0].v ? { ...c, matched: true } : c
        );
        const newMatched = matched + 1;
        setCards(withMatch);
        setMatched(newMatched);
        setSelected([]);
        setLocked(false);
        if (newMatched === PAIRS) {
          doneRef.current = true;
          setRunning(false);
          clearInterval(intervalRef.current);
          onComplete(getDiscount(timeRef.current));
        }
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            (c.id === newSel[0].id || c.id === newSel[1].id) && !c.matched
              ? { ...c, flipped: false }
              : c
          ));
          setSelected([]);
          setLocked(false);
        }, 500);
      }
    }
  };

  const mins = String(Math.floor(time / 60)).padStart(2, '0');
  const secs = String(time % 60).padStart(2, '0');

  return (
    <>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{mins}:{secs}</span>
          <span className={styles.statLabel}>Time</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{matched}/{PAIRS}</span>
          <span className={styles.statLabel}>Matched</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{moves}</span>
          <span className={styles.statLabel}>Moves</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 84px)', gap: '10px' }}>
        {cards.map(card => (
          <div
            key={card.id}
            className={`${styles.card} ${card.flipped || card.matched ? styles.cardFlipped : ''} ${card.matched ? styles.cardMatched : ''}`}
            onClick={() => handleFlip(card)}
          >
            <div className={styles.cardInner}>
              <div className={styles.cardFront}>✦</div>
              <div className={styles.cardBack}>{card.v}</div>
            </div>
          </div>
        ))}
      </div>

      {!running && (
        <p className={styles.hint}>Flip any card to start the timer</p>
      )}
    </>
  );
}
