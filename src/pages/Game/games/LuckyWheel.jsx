import { useState, useRef, useEffect } from 'react';

const SEGMENTS = ['3%','5%','3%','7%','3%','5%','3%','10%'];
const SEGMENT_PERCENTS = [3, 5, 3, 7, 3, 5, 3, 10];
const COLORS = {
  3: '#1a1a1a',
  5: '#222',
  7: '#c9a84c',
  10: '#e0c56a',
};
const TEXT_COLORS = {
  3: '#c9a84c',
  5: '#c9a84c',
  7: '#0a0a0a',
  10: '#0a0a0a',
};

const NUM_SEGMENTS = SEGMENTS.length;
const CANVAS_SIZE = 320;
const RADIUS = CANVAS_SIZE / 2 - 4;

function drawWheel(canvas, rotation) {
  const ctx = canvas.getContext('2d');
  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const sliceAngle = (2 * Math.PI) / NUM_SEGMENTS;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const startAngle = rotation + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const pct = SEGMENT_PERCENTS[i];

    // Slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, RADIUS, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = COLORS[pct];
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = TEXT_COLORS[pct];
    ctx.font = `bold ${pct === 10 ? '18' : '15'}px serif`;
    ctx.fillText(SEGMENTS[i], RADIUS - 16, 6);
    ctx.restore();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#c9a84c';
  ctx.fill();
}

export default function LuckyWheel({ onComplete }) {
  const canvasRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [cssRotation, setCssRotation] = useState(0);
  const [spun, setSpun] = useState(false);
  const rotationRef = useRef(0);

  useEffect(() => {
    if (canvasRef.current) {
      drawWheel(canvasRef.current, rotationRef.current);
    }
  }, []);

  function handleSpin() {
    if (spinning || spun) return;

    // Pre-determine result
    const resultIndex = Math.floor(Math.random() * NUM_SEGMENTS);
    const percent = SEGMENT_PERCENTS[resultIndex];

    // Calculate target rotation:
    // Each segment is 360/8 = 45 degrees
    // The pointer is at top (pointing down), so it points at angle = -90 degrees (or 270)
    // Segment i starts at i * (360/8) = i * 45 degrees from rotation origin
    // We want segment resultIndex to be at the top (pointer position)
    // Center of segment i (in canvas-draw terms, with rotation=0): i * 45 + 22.5 degrees
    // We need: rotation + center_of_segment = 270 degrees (pointing up from bottom, canvas has -π/2 at top)
    // In CSS transform terms: target = 270 - center_of_segment_from_0 + multiple full rotations

    const sliceDeg = 360 / NUM_SEGMENTS;
    const segmentCenter = resultIndex * sliceDeg + sliceDeg / 2;
    // pointer is at 270deg in CSS (top = 270 in canvas angle terms)
    // We need: currentRotation + spinAmount + segmentCenter = 270 + 360*n
    const targetAngle = 270 - segmentCenter;
    const fullRotations = 5 * 360; // at least 5 full spins
    const spinAmount = fullRotations + ((targetAngle - (cssRotation % 360) + 360) % 360);
    const finalRotation = cssRotation + spinAmount;

    setCssRotation(finalRotation);
    setSpinning(true);

    setTimeout(() => {
      setSpinning(false);
      setSpun(true);
      onComplete(percent);
    }, 3100);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '360px', lineHeight: '1.7' }}>
        Spin the wheel to win a discount! Whatever it lands on is yours.
      </p>

      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Pointer triangle at top */}
        <div style={{
          position: 'absolute',
          top: '-2px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '22px solid var(--gold)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }} />

        {/* Spinning wrapper */}
        <div style={{
          transform: `rotate(${cssRotation}deg)`,
          transition: spinning ? 'transform 3s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
          borderRadius: '50%',
          boxShadow: '0 0 24px rgba(201,168,76,0.15)',
          overflow: 'hidden',
          lineHeight: 0,
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ borderRadius: '50%', display: 'block' }}
          />
        </div>
      </div>

      {!spun ? (
        <button
          className="btn-gold"
          onClick={handleSpin}
          disabled={spinning}
          style={{ opacity: spinning ? 0.7 : 1, minWidth: '160px', fontSize: '1rem' }}
        >
          {spinning ? 'Spinning...' : 'Spin the Wheel!'}
        </button>
      ) : (
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem' }}>
          Collecting your reward...
        </p>
      )}
    </div>
  );
}
