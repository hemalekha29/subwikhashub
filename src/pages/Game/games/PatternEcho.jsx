import { useState, useEffect, useRef } from 'react';
import { scoreToDiscount } from '../Game';

const EMOJIS = ['🎁', '🌸', '💝', '✨', '💐', '🎀', '🏵️', '🎊'];
const MAX_ROUNDS = 10;
const MAX_MISTAKES = 2;
const FLASH_DURATION = 420;
const FLASH_GAP = 100;

function generateSequence(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * EMOJIS.length));
}

export default function PatternEcho({ onComplete }) {
  const [sequence, setSequence] = useState([]);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState('idle'); // idle | show | input
  const [highlighted, setHighlighted] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [locked, setLocked] = useState(false);
  const doneRef = useRef(false);

  function startRound(newLevel, newSequence) {
    setPhase('show');
    setPlayerIndex(0);
    setLocked(true);
    let i = 0;
    function flash() {
      if (i >= newSequence.length) {
        setHighlighted(null);
        setTimeout(() => {
          setPhase('input');
          setLocked(false);
        }, FLASH_GAP);
        return;
      }
      setHighlighted(newSequence[i]);
      setTimeout(() => {
        setHighlighted(null);
        setTimeout(() => {
          i++;
          flash();
        }, FLASH_GAP);
      }, FLASH_DURATION);
    }
    flash();
  }

  function begin() {
    const seq = generateSequence(2);
    setSequence(seq);
    setLevel(1);
    setMistakes(0);
    startRound(1, seq);
  }

  function handleClick(emojiIndex) {
    if (locked || phase !== 'input' || doneRef.current) return;
    const expected = sequence[playerIndex];

    if (emojiIndex === expected) {
      const nextIndex = playerIndex + 1;
      if (nextIndex >= sequence.length) {
        // Completed sequence
        const nextLevel = level + 1;
        if (nextLevel > MAX_ROUNDS) {
          doneRef.current = true;
          onComplete(scoreToDiscount(level, MAX_ROUNDS));
          return;
        }
        setLevel(nextLevel);
        const newSeq = generateSequence(nextLevel + 1);
        setSequence(newSeq);
        setPhase('show');
        setLocked(true);
        setTimeout(() => startRound(nextLevel, newSeq), 400);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      if (newMistakes >= MAX_MISTAKES) {
        doneRef.current = true;
        onComplete(scoreToDiscount(level - 1, MAX_ROUNDS));
        return;
      }
      // Flash wrong, replay sequence
      setLocked(true);
      setTimeout(() => {
        setPlayerIndex(0);
        startRound(level, sequence);
      }, 600);
    }
  }

  const phaseLabel = phase === 'show' ? 'Watch closely...' : phase === 'input' ? 'Your turn!' : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', maxWidth: '480px', width: '100%' }}>
      {phase === 'idle' ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '360px', lineHeight: '1.7' }}>
            Watch the emoji sequence, then repeat it by clicking. Sequence grows each round.
            Only 2 mistakes allowed — it's game over after that. Go up to 10 rounds!
          </p>
          <button className="btn-gold" onClick={begin}>Start Game</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--gold)', display: 'block' }}>{level}</span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Level</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1.2rem', display: 'block', letterSpacing: '3px' }}>
                {'✗'.repeat(mistakes)}<span style={{ color: 'var(--black-border)' }}>{'✗'.repeat(MAX_MISTAKES - mistakes)}</span>
              </span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Mistakes</span>
            </div>
          </div>

          {phaseLabel && (
            <p style={{
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              color: phase === 'input' ? 'var(--gold)' : 'var(--text-secondary)',
              textTransform: 'uppercase',
            }}>
              {phaseLabel}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 80px)', gap: '12px' }}>
            {EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleClick(idx)}
                style={{
                  width: '80px',
                  height: '80px',
                  fontSize: '2rem',
                  borderRadius: '12px',
                  border: highlighted === idx
                    ? '2px solid var(--gold)'
                    : '1px solid var(--black-border)',
                  background: highlighted === idx
                    ? 'rgba(201,168,76,0.18)'
                    : 'var(--black-card)',
                  cursor: phase === 'input' && !locked ? 'pointer' : 'default',
                  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                  boxShadow: highlighted === idx ? '0 0 16px rgba(201,168,76,0.35)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Sequence length: {sequence.length} &nbsp;|&nbsp; Step {phase === 'input' ? playerIndex + 1 : '—'} / {sequence.length}
          </p>
        </>
      )}
    </div>
  );
}
