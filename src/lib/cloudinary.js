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
