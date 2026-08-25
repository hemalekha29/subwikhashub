import { useState, useRef } from 'react';
import { scoreToDiscount } from '../Game';

// A real "digit span" test — the classic cognitive-psychology working-memory
// benchmark. Most adults can reliably hold 6-7 digits; going further takes
// genuine focus. Unlike PatternEcho (which repeats a spatial click sequence
// from memory), this is pure numeric working memory with no visual anchor to
// lean on, which is what makes it noticeably harder.
const START_LENGTH = 4;
const MAX_LEVEL = 8; // sequence length caps at START_LENGTH + MAX_LEVEL - 1 = 11 digits
const MAX_MISTAKES = 2;
const DIGIT_SHOW_MS = 750;
const DIGIT_GAP_MS = 200;

function generateSequence(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10));
}

export default function DigitSpan({ onComplete }) {
  const [level, setLevel] = useState(0); // 0 = idle
  const [phase, setPhase] = useState('idle'); // idle | show | input
  const [sequence, setSequence] = useState([]);
  const [shownDigit, setShownDigit] = useState(null);
  const [input, setInput] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const doneRef = useRef(false);

  function playSequence(seq) {
    setPhase('show');
    setInput([]);
    setFeedback(null);
    let i = 0;
    function step() {
      if (i >= seq.length) {
        setShownDigit(null);
        setTimeout(() => setPhase('input'), 300);
        return;
      }
      setShownDigit(seq[i]);
      setTimeout(() => {
        setShownDigit(null);
        setTimeout(() => { i++; step(); }, DIGIT_GAP_MS);
      }, DIGIT_SHOW_MS);
    }
    step();
  }

  function begin() {
    doneRef.current = false;
    setMistakes(0);
    setLevel(1);
    const seq = generateSequence(START_LENGTH);
    setSequence(seq);
    playSequence(seq);
  }

  function pressDigit(d) {
    if (phase !== 'input' || doneRef.current) return;
    const next = [...input, d];
    setInput(next);
    if (next.length === sequence.length) {
      const correct = next.every((v, i) => v === sequence[i]);
      setFeedback(correct ? 'correct' : 'wrong');
      if (correct) {
        const nextLevel = level + 1;
        if (nextLevel > MAX_LEVEL) {
          doneRef.current = true;
          setTimeout(() => onComplete(scoreToDiscount(MAX_LEVEL, MAX_LEVEL)), 700);
          return;
        }
        setTimeout(() => {
          setLevel(nextLevel);
          const seq = generateSequence(START_LENGTH + nextLevel - 1);
          setSequence(seq);
          playSequence(seq);
        }, 700);
      } else {
        const nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);
        if (nextMistakes >= MAX_MISTAKES) {
          doneRef.current = true;
          setTimeout(() => onComplete(scoreToDiscount(level - 1, MAX_LEVEL)), 900);
          return;
        }
        setTimeout(() => playSequence(sequence), 900); // same length again
      }
    }
  }

  function backspace() {
    if (phase !== 'input') return;
    setInput(prev => prev.slice(0, -1));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '420px', width: '100%' }}>
      {phase === 'idle' ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '360px', lineHeight: '1.7' }}>
            Watch the digits flash one at a time, then type them back in the exact order.
            The sequence grows every round — most people top out around 6 or 7. How far can you go?
          </p>
          <button className="btn-gold" onClick={begin}>Start Game</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--gold)', display: 'block' }}>
                {START_LENGTH + level - 1}
              </span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Digits</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1.2rem', display: 'block', letterSpacing: '3px' }}>
                {'✗'.repeat(mistakes)}<span style={{ color: 'var(--black-border)' }}>{'✗'.repeat(MAX_MISTAKES - mistakes)}</span>
              </span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Mistakes</span>
            </div>
          </div>

          {phase === 'show' ? (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Memorise</p>
              <div style={{
                width: '110px', height: '110px', borderRadius: '16px',
                border: '1px solid var(--black-border)', background: 'var(--black-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', color: shownDigit === null ? 'transparent' : 'var(--white)' }}>
                  {shownDigit ?? '0'}
                </span>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {feedback === 'correct' ? '✓ Correct!' : feedback === 'wrong' ? `✗ It was ${sequence.join('')}` : 'Type it back'}
              </p>
              <div style={{ display: 'flex', gap: '8px', minHeight: '32px' }}>
                {sequence.map((_, i) => (
                  <span key={i} style={{
                    width: '28px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: `2px solid ${feedback ? (feedback === 'correct' ? '#4ade80' : '#f87171') : 'var(--gold)'}`,
                    fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--white)',
                  }}>
                    {input[i] ?? ''}
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: '10px' }}>
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <button key={d} onClick={() => pressDigit(d)} disabled={!!feedback}
                    style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid var(--black-border)', background: 'var(--black-card)', color: 'var(--white)', fontSize: '1.2rem', cursor: feedback ? 'default' : 'pointer' }}>
                    {d}
                  </button>
                ))}
                <button onClick={backspace} disabled={!!feedback}
                  style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid var(--black-border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: feedback ? 'default' : 'pointer' }}>
                  ⌫
                </button>
                <button onClick={() => pressDigit(0)} disabled={!!feedback}
                  style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid var(--black-border)', background: 'var(--black-card)', color: 'var(--white)', fontSize: '1.2rem', cursor: feedback ? 'default' : 'pointer' }}>
                  0
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
