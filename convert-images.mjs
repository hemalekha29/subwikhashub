import sharp from 'sharp';
import { readdirSync, unlinkSync } from 'fs';
import { join, extname, basename } from 'path';

const DIR = './public/images';
const EXTS = ['.jpg', '.jpeg', '.png'];

const files = readdirSync(DIR).filter(f => EXTS.includes(extname(f).toLowerCase()));

if (files.length === 0) {
  console.log('No JPG/PNG files found to convert.');
  process.exit(0);
}

for (const file of files) {
  const input = join(DIR, file);
  const output = join(DIR, basename(file, extname(file)) + '.webp');
  try {
    await sharp(input).webp({ quality: 85 }).toFile(output);
    unlinkSync(input);
    console.log(`✓ ${file} → ${basename(output)}`);
  } catch (e) {
    console.log(`✗ ${file}: ${e.message}`);
  }
}

console.log('\nDone! All images converted to WebP.');
