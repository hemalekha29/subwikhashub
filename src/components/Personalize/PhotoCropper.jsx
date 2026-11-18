import { useCallback, useEffect, useRef, useState } from 'react';
import { slotAspect } from '../../lib/personalization';
import styles from './PersonalizeModal.module.css';

/**
 * The crop box.
 *
 * Performance notes — this is the one part of the modal that runs at 60fps, so
 * it deliberately does NOT re-render React on every pointer move:
 *
 *  • While dragging, the transform is written straight to the DOM node
 *    (requestAnimationFrame → `style.transform`). React state is only touched
 *    when the drag ends (or when the zoom slider moves).
 *  • The photo is a single <img> moved with `transform` only — no width/height
 *    changes, no layout, so the browser keeps it on the GPU.
 *  • The zoom slider and the buttons are the accessible equivalents of pinch,
 *    so nothing here depends on a touch gesture.
 *
 * The crop is stored as a ZOOM plus an OFFSET IN FRACTIONS of the crop box, so
 * the same crop looks identical in the preview, in the cart and on the print —
 * whatever size it is drawn at.
 */
export default function PhotoCropper({ photo, slot, onCancel, onApply }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  // The live crop, mirrored in a ref so the drag handler never waits for a
  // render. x and y are fractions of the crop box.
  const live = useRef({
    x: photo?.transform?.x || 0,
    y: photo?.transform?.y || 0,
    scale: photo?.transform?.scale || 1,
  });
  const [scale, setScale] = useState(live.current.scale);

  const pointers = useRef(new Map());
  const pinchStart = useRef(null);
  const rafId = useRef(0);

  const [natural, setNatural] = useState(null);   // { w, h } of the photo
  const [box, setBox] = useState(null);           // { w, h } of the crop box

  // Keep the box size in state so the photo can be sized to cover it. The
  // measurement happens after the first paint, so the browser has laid the
  // element out and the number is the real one.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const raf = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  /** The size the photo must be drawn at to cover the box at scale 1. */
  const cover = (() => {
    if (!natural || !box || !box.w || !box.h) return null;
    const scaleToCover = Math.max(box.w / natural.w, box.h / natural.h);
    return { w: natural.w * scaleToCover, h: natural.h * scaleToCover };
  })();

  /**
   * Keeps the crop inside the photo: the edges of the frame may never show.
   * The limits are in fractions of the box, so they hold at any size.
   */
  const clamp = useCallback((x, y, s) => {
    if (!cover || !box) return { x, y, scale: s };
    const fw = cover.w / box.w;   // how much wider the photo is than the box
    const fh = cover.h / box.h;
    const maxX = Math.max(0, (fw * s - 1) / 2);
    const maxY = Math.max(0, (fh * s - 1) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
      scale: s,
    };
  }, [cover, box]);

  /** Writes the transform to the DOM without going through React. */
  const paint = useCallback(() => {
    const el = frameRef.current;
    if (!el || !box) return;
    const t = live.current;
    el.style.transform =
      `translate3d(${t.x * box.w}px, ${t.y * box.h}px, 0) scale(${t.scale})`;
  }, [box]);

  const schedule = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      paint();
    });
  }, [paint]);

  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: live.current.scale,
      };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two fingers: pinch to zoom.
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const next = Math.min(4, Math.max(1, pinchStart.current.scale * (distance / pinchStart.current.distance)));
      live.current = clamp(live.current.x, live.current.y, next);
      setScale(live.current.scale);
      schedule();
      return;
    }

    // One finger: drag the photo around.
    const dx = box ? (e.clientX - prev.x) / box.w : 0;
    const dy = box ? (e.clientY - prev.y) / box.h : 0;
    live.current = clamp(live.current.x + dx, live.current.y + dy, live.current.scale);
    schedule();
  };

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const onWheel = (e) => {
    e.preventDefault();
    const next = Math.min(4, Math.max(1, live.current.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
    live.current = clamp(live.current.x, live.current.y, next);
    setScale(live.current.scale);
    schedule();
  };

  // The wheel listener is attached by hand because React registers its own
  // wheel handlers as passive — a passive listener cannot stop the page from
  // scrolling behind the cropper.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const setZoom = (value) => {
    const s = Math.min(4, Math.max(1, value));
    live.current = clamp(live.current.x, live.current.y, s);
    setScale(live.current.scale);
    schedule();
  };

  const reset = () => {
    live.current = clamp(0, 0, 1);
    setScale(1);
    schedule();
  };

  const aspect = slotAspect(slot);

  return (
    <div className={styles.cropOverlay} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
      <div className={styles.cropBox}>
        <p className={styles.cropHint}>Drag to reposition · scroll or pinch to zoom</p>

        <div
          ref={canvasRef}
          className={styles.cropCanvas}
          style={{ aspectRatio: `${aspect}` }}
          onPointerDown={onPointerDown}
        >
          {/* The frame is always rendered — the photo has to be in the DOM to
              report its own size, which is what makes the "cover" size
              possible. Until then it simply fills the box. */}
          <div
            ref={frameRef}
            className={styles.cropFrame}
            style={{
              width: cover ? `${cover.w}px` : '100%',
              height: cover ? `${cover.h}px` : '100%',
              marginLeft: cover ? `${-cover.w / 2}px` : 0,
              marginTop: cover ? `${-cover.h / 2}px` : 0,
              left: '50%',
              top: '50%',
            }}
          >
            <img
              src={photo.localUrl || photo.url}
              alt=""
              draggable={false}
              onLoad={e => {
                const img = e.currentTarget;
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
          </div>
          <div className={styles.cropGrid} />
        </div>

        <div className={styles.cropControls}>
          <button type="button" className={styles.cropBtn} onClick={reset}>Reset</button>
          <input
            className={styles.cropZoom}
            type="range"
            min="1"
            max="4"
            step="0.02"
            value={scale}
            onChange={e => setZoom(parseFloat(e.target.value))}
            aria-label="Zoom"
          />
          <span className={styles.cropZoomLabel}>{Math.round(scale * 100)}%</span>
        </div>

        <div className={styles.cropActions}>
          <button type="button" className={styles.cropSecondary} onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={styles.cropPrimary}
            onClick={() => onApply({ ...live.current })}
          >
            Use this crop
          </button>
        </div>
      </div>
    </div>
  );
}
