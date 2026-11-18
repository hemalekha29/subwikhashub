// Free-tier photo hosting — used instead of Firebase Storage, which requires the
// paid Blaze plan to provision a bucket at all (this project stays on Spark).
// The "unsigned upload preset" model means there is no secret to protect here: the
// cloud name and preset name are both meant to be public, the same way a Firebase
// apiKey is — anyone can see them in the browser, and that's fine by design.
export const CLOUDINARY_CLOUD_NAME = 'npkrqxkf';
export const CLOUDINARY_UPLOAD_PRESET = 'subwikha_uploads';

const MAX_FILE_BYTES = 15 * 1024 * 1024; // must match the preset's own limit in the Cloudinary dashboard

// Uploads one file directly from the browser to Cloudinary and returns its public
// HTTPS URL. `folder` groups uploads in the Cloudinary media library (e.g.
// 'orders/<orderId>', 'products/<slug>', 'gallery') the same way the old Firebase
// Storage paths did.
export async function uploadToCloudinary(file, folder) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is over 15 MB`);
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) formData.append('folder', folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Image upload failed');
  }
  return data.secure_url;
}

/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * A 12-megapixel phone photo is ~8 MB and takes a noticeable while to upload
 * over a shop's connection — and the customer is staring at a spinner the
 * whole time. Resizing it to a sensible print size (1600px on the long edge,
 * which is still more than enough for an A4 frame at 300dpi) makes the upload
 * several times smaller and faster, and it keeps the page from holding a huge
 * decoded bitmap in memory.
 *
 * Returns a File ready for uploadToCloudinary(), or the original file when the
 * browser can't do the resize (e.g. HEIC) — the upload still works, it is just
 * bigger.
 */
export async function prepareImageForUpload(file, maxDim = 1600, quality = 0.85) {
  if (!file || !file.type?.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2 * 1024 * 1024) {
      bitmap.close?.();
      return file; // Already small enough — don't waste a canvas round-trip.
    }
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    // A format the browser can't decode (HEIC on some browsers) — upload it as
    // it is rather than failing the whole personalization.
    console.warn('Could not resize the photo, uploading it as it is:', err);
    return file;
  }
}
