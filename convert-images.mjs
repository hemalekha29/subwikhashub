import sharp from 'sharp';
import { readdirSync, unlinkSync, renameSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const DIR = './public/images';
const CONVERT_EXTS = ['.jpg', '.jpeg', '.png']; // gets converted to .webp
const RESIZE_EXTS = ['.webp']; // already .webp, just gets resized in place if oversized
// Product photos don't need to be larger than this to look sharp in the gallery/zoom —
// several existing files were uploaded at full camera resolution (2000-4000px+),
// producing 1-3MB images that were never actually downscaled (see the audit note this
// script previously only ran `webp({quality:85})` with no resize step at all).
const MAX_DIMENSION = 1600;
// Catches files that are already within MAX_DIMENSION but still oversized because they
// were saved at a very high/near-lossless quality originally — re-encoding at our
// standard quality:85 shrinks these even without resizing.
const FORCE_REENCODE_ABOVE_BYTES = 300 * 1024;

function fmtKB(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

const files = readdirSync(DIR);
let converted = 0, resized = 0, skipped = 0;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const input = join(DIR, file);

  if (CONVERT_EXTS.includes(ext)) {
    const output = join(DIR, basename(file, ext) + '.webp');
    try {
      await sharp(input)
        // .rotate() with no args bakes the EXIF Orientation tag into the actual pixel
        // data before resizing/re-encoding. Without this, a photo taken sideways (very
        // common — phone cameras almost always store landscape-orientation pixels plus
        // an EXIF flag telling the viewer to rotate it) converts to a genuinely-sideways
        // WebP, because WebP output doesn't reliably carry that EXIF correction forward
        // the way JPEG does. This bit us for real — see the "Resin Letter Keychain" fix.
        .rotate()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(output);
      unlinkSync(input);
      console.log(`✓ converted  ${file} → ${basename(output)} (${fmtKB(statSync(output).size)})`);
      converted++;
    } catch (e) {
      console.log(`✗ ${file}: ${e.message}`);
    }
    continue;
  }

  if (RESIZE_EXTS.includes(ext)) {
    const before = statSync(input).size;
    const meta = await sharp(input).metadata();
    const oversizedDimensions = (meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION;
    if (!oversizedDimensions && before <= FORCE_REENCODE_ABOVE_BYTES) {
      skipped++;
      continue;
    }
    const tmp = input + '.tmp';
    try {
      await sharp(input)
        .rotate() // see the identical comment in the CONVERT_EXTS branch above
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(tmp);
      unlinkSync(input);
      renameSync(tmp, input);
      const after = statSync(input).size;
      console.log(`✓ resized    ${file}  ${fmtKB(before)} → ${fmtKB(after)} (was ${meta.width}×${meta.height}px)`);
      resized++;
    } catch (e) {
      console.log(`✗ ${file}: ${e.message}`);
    }
  }
}

console.log(`\nDone. ${converted} converted, ${resized} resized, ${skipped} already within ${MAX_DIMENSION}px.`);
