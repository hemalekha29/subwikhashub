import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { uploadToCloudinary, prepareImageForUpload } from '../../lib/cloudinary';
import {
  MAX_PHOTO_BYTES,
  isSupportedPhoto,
  personalizationHash,
  slotAspect,
} from '../../lib/personalization';
import PhotoCropper from './PhotoCropper';
import styles from './PersonalizeModal.module.css';

let photoCounter = 0;
const nextPhotoId = () => `p${Date.now().toString(36)}${(photoCounter += 1)}`;

/**
 * The personalization studio.
 *
 * It is rendered only while it is open (the product page lazy-loads it), so it
 * costs the ordinary shopper nothing until they actually want to personalize a
 * gift.
 *
 * Photos are shown in the preview the instant they are picked (a local object
 * URL), and the upload to Cloudinary happens in the background — the customer
 * never waits on the network to see their own photo.
 */
export default function PersonalizeModal({ product, preset, onClose, onConfirm }) {
  const [photos, setPhotos] = useState([]);
  const [fields, setFields] = useState({});
  const [editing, setEditing] = useState(null);   // the photo being cropped
  const [step, setStep] = useState('photos');
  const fileInputs = useRef({});
  const scrollRef = useRef(null);

  // Escape closes, and the page behind must not scroll while the studio is up.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (editing) setEditing(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [editing, onClose]);

  const photosFor = useCallback(
    (slotId) => photos.filter(p => p.slotId === slotId),
    [photos]
  );

  /** Picks up the files for a slot, shows them instantly, uploads in the background. */
  const handleFiles = async (slot, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const allowed = files.filter(f => isSupportedPhoto(f)).slice(0, slot.max);
    const rejected = files.filter(f => !isSupportedPhoto(f));
    if (rejected.length) toast.error('Only image files can be used here');

    const room = Math.max(0, slot.max - photosFor(slot.id).length);
    if (!room) {
      toast.error(`This frame takes ${slot.max} photo${slot.max === 1 ? '' : 's'} for that area`);
      return;
    }
    const chosen = allowed.slice(0, room);

    const added = chosen.map(file => ({
      id: nextPhotoId(),
      slotId: slot.id,
      slotLabel: slot.label,
      name: file.name,
      localUrl: URL.createObjectURL(file),
      url: '',
      status: 'uploading',
      natural: null,
      transform: { x: 0, y: 0, scale: 1 },
    }));
    setPhotos(prev => [...prev, ...added]);

    // Remember the photo's own size — the preview needs it to draw the crop
    // exactly as the cropper showed it.
    added.forEach(photo => {
      const img = new Image();
      img.onload = () => {
        setPhotos(prev => prev.map(p => (
          p.id === photo.id ? { ...p, natural: { w: img.naturalWidth, h: img.naturalHeight } } : p
        )));
      };
      img.src = photo.localUrl;
    });

    // Upload each photo in the background — the preview already shows it.
    added.forEach((photo, index) => {
      const file = chosen[index];
      (async () => {
        try {
          if (file.size > MAX_PHOTO_BYTES) {
            throw new Error(`${file.name} is over 15 MB`);
          }
          const prepared = await prepareImageForUpload(file);
          const url = await uploadToCloudinary(prepared, `personalize/${product.slug}`);
          setPhotos(prev => prev.map(p => (p.id === photo.id ? { ...p, url, status: 'ready' } : p)));
        } catch (err) {
          console.error(err);
          setPhotos(prev => prev.map(p => (p.id === photo.id ? { ...p, status: 'error' } : p)));
          toast.error(err.message || 'That photo could not be uploaded');
        }
      })();
    });
  };

  const removePhoto = (id) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target?.localUrl) URL.revokeObjectURL(target.localUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  // The latest photos, kept in a ref so the unmount cleanup can release the
  // local preview URLs — a customer who tries three photos shouldn't leave
  // three decoded images behind.
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // Release the local preview URLs when the studio closes — a customer who
  // tries three photos shouldn't leave three decoded images behind.
  useEffect(() => () => {
    photosRef.current.forEach(p => {
      if (p.localUrl) URL.revokeObjectURL(p.localUrl);
    });
  }, []);

  const applyCrop = (transform) => {
    setPhotos(prev => prev.map(p => (p.id === editing.id ? { ...p, transform } : p)));
    setEditing(null);
  };

  const pendingUploads = photos.filter(p => p.status === 'uploading').length;
  const failedUploads = photos.filter(p => p.status === 'error').length;

  const missing = useMemo(
    () => (preset.slots || []).filter(slot => slot.required && photosFor(slot.id).length === 0),
    [preset, photosFor]
  );

  const canConfirm = missing.length === 0 && pendingUploads === 0 && failedUploads === 0;

  const confirm = () => {
    if (missing.length) {
      toast.error(`Please add a photo for ${missing[0].label}`);
      return;
    }
    if (pendingUploads) {
      toast.error('Wait a moment — your photos are still uploading.');
      return;
    }
    if (failedUploads) {
      toast.error('One of your photos failed to upload. Please replace it.');
      return;
    }
    onConfirm({
      photos: photos.map(p => ({
        url: p.url,
        slot: p.slotId,
        slotLabel: p.slotLabel,
        name: p.name,
        transform: p.transform,
      })),
      fields,
      hash: personalizationHash({ photos, fields }),
    });
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={preset.title}>
      <div className={styles.modal}>
        <header className={styles.head}>
          <div>
            <h2 className={styles.title}>{preset.title}</h2>
            <p className={styles.subtitle}>{preset.subtitle}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className={styles.body} ref={scrollRef}>
          {/* ── Live preview ── */}
          <aside className={styles.previewCol}>
            <div className={styles.previewFrame} data-frame={preset.frame}>
              <div className={styles.previewInner}>
                {preset.slots.map(slot => (
                  <SlotPreview key={slot.id} slot={slot} photos={photosFor(slot.id)} />
                ))}
              </div>
              {(fields.title || fields.date) && (
                <p className={styles.previewTitle}>{[fields.title, fields.date].filter(Boolean).join(' · ')}</p>
              )}
              {fields.message && <p className={styles.previewMessage}>{fields.message}</p>}
              {fields.spotify && (
                <p className={styles.previewSpotify}>
                  ♪ <span>{fields.spotify.replace(/^https?:\/\/open\.spotify\.com\/\w+\//, '')}</span>
                </p>
              )}
              {fields.signature && <p className={styles.previewSignature}>— {fields.signature}</p>}
            </div>
            <p className={styles.previewNote}>This is how your frame will look. Our makers print it by hand.</p>
          </aside>

          {/* ── Controls ── */}
          <div className={styles.controls}>
            <div className={styles.steps}>
              <button
                className={`${styles.step} ${step === 'photos' ? styles.stepActive : ''}`}
                onClick={() => setStep('photos')}
              >
                <span className={styles.stepNum}>1</span> Photos
              </button>
              <button
                className={`${styles.step} ${step === 'details' ? styles.stepActive : ''}`}
                onClick={() => setStep('details')}
              >
                <span className={styles.stepNum}>2</span> Details
              </button>
            </div>

            {step === 'photos' && (
              <div className={styles.panel}>
                {preset.slots.map(slot => {
                  const slotPhotos = photosFor(slot.id);
                  return (
                    <div key={slot.id} className={styles.slotBlock}>
                      <div className={styles.slotHead}>
                        <h3 className={styles.slotTitle}>{slot.label}</h3>
                        <span className={styles.slotCount}>
                          {slotPhotos.length}/{slot.max}
                          {slot.required && <em> · required</em>}
                        </span>
                      </div>

                      <div className={styles.slotGrid}>
                        {slotPhotos.map(photo => (
                          <div key={photo.id} className={styles.thumb}>
                            <img src={photo.localUrl || photo.url} alt={photo.name} />
                            <div className={styles.thumbActions}>
                              <button type="button" onClick={() => setEditing({ ...photo, slot })}>Adjust</button>
                              <button type="button" onClick={() => removePhoto(photo.id)}>Remove</button>
                            </div>
                            {photo.status === 'uploading' && <span className={styles.thumbStatus}>Uploading…</span>}
                            {photo.status === 'error' && <span className={styles.thumbStatusError}>Failed</span>}
                          </div>
                        ))}

                        {slotPhotos.length < slot.max && (
                          <button
                            type="button"
                            className={styles.uploadBox}
                            onClick={() => fileInputs.current[slot.id]?.click()}
                          >
                            <span className={styles.uploadIcon}>↑</span>
                            <span className={styles.uploadText}>Upload photo</span>
                            <span className={styles.uploadHint}>JPG or PNG</span>
                          </button>
                        )}
                      </div>

                      <input
                        ref={el => { fileInputs.current[slot.id] = el; }}
                        type="file"
                        accept="image/*"
                        multiple={slot.max > 1}
                        hidden
                        onChange={e => {
                          handleFiles(slot, e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {step === 'details' && (
              <div className={styles.panel}>
                {preset.fields.map(field => (
                  <div key={field.key} className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor={`pz-${field.key}`}>{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`pz-${field.key}`}
                        className={styles.textarea}
                        rows={3}
                        maxLength={field.maxLength}
                        placeholder={field.placeholder}
                        value={fields[field.key] || ''}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        id={`pz-${field.key}`}
                        className={styles.input}
                        type="text"
                        maxLength={field.maxLength}
                        placeholder={field.placeholder}
                        value={fields[field.key] || ''}
                        onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                      />
                    )}
                    <span className={styles.counter}>
                      {(fields[field.key] || '').length}/{field.maxLength}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.secure}>🔒 All data is secure and will not be shared.</span>
          <div className={styles.footerActions}>
            {step === 'photos' ? (
              <button className={styles.secondary} onClick={() => setStep('details')}>Next — Details</button>
            ) : (
              <button className={styles.secondary} onClick={() => setStep('photos')}>Back — Photos</button>
            )}
            <button className={styles.primary} onClick={confirm} disabled={!canConfirm}>
              {pendingUploads ? 'Uploading…' : '🛒 Confirm & Add to Cart'}
            </button>
          </div>
        </footer>

        {editing && (
          <PhotoCropper
            photo={editing}
            slot={editing.slot}
            onCancel={() => setEditing(null)}
            onApply={applyCrop}
          />
        )}
      </div>
    </div>
  );
}

/** One photo area of the frame, in the preview. */
function SlotPreview({ slot, photos }) {
  const aspect = slotAspect(slot);
  if (!photos.length) {
    return (
      <div className={`${styles.slotEmpty} ${styles[`slot${slot.shape}`] || ''}`} style={{ aspectRatio: `${aspect}` }}>
        <span>{slot.label}</span>
      </div>
    );
  }

  // A slot that takes several photos is a collage — the photos sit side by
  // side, not on top of each other.
  if (slot.max > 1) {
    return (
      <div className={`${styles.slotCollage} ${styles[`slot${slot.shape}`] || ''}`} style={{ aspectRatio: `${aspect}` }}>
        {photos.map(p => (
          <div key={p.id} className={styles.slotCell}>
            <img src={p.localUrl || p.url} alt="" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`${styles.slotFilled} ${styles[`slot${slot.shape}`] || ''}`} style={{ aspectRatio: `${aspect}` }}>
      {photos.map(p => (
        <img key={p.id} src={p.localUrl || p.url} alt="" style={photoStyle(p, aspect)} />
      ))}
    </div>
  );
}

/**
 * Draws a photo in a slot exactly as the cropper framed it.
 *
 * The crop is stored as a zoom plus an offset in fractions of the slot, and
 * the photo is drawn at "cover" size for that zoom — so the preview is the
 * same picture the customer framed, at whatever size the preview happens to
 * be.
 */
function photoStyle(photo, aspect) {
  const nat = photo.natural;
  const t = photo.transform || { x: 0, y: 0, scale: 1 };
  if (!nat || !nat.w || !nat.h) {
    return { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };
  }
  const scale = t.scale || 1;
  const fw = Math.max(1, nat.w / (aspect * nat.h)) * scale;   // width vs. the slot
  const fh = Math.max(1, (aspect * nat.h) / nat.w) * scale;   // height vs. the slot
  return {
    position: 'absolute',
    left: `calc(50% + ${(t.x || 0) * 100}%)`,
    top: `calc(50% + ${(t.y || 0) * 100}%)`,
    width: `${fw * 100}%`,
    height: `${fh * 100}%`,
    marginLeft: `${-fw * 50}%`,
    marginTop: `${-fh * 50}%`,
    objectFit: 'fill',
    maxWidth: 'none',
    willChange: 'transform',
  };
}
