// Generates public/og-image.jpg — the 1200×630 social/link-preview card (product collage +
// brand name) used as og:image / twitter:image on every page. The logo stays a logo (Organization
// schema); this is the share image. Re-run after changing product photos:  node scripts/make-og-image.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const img = (n) => path.join(root, 'public', 'images', n);

const W = 1200, H = 630;
const GOLD = '#c9a84c';

// 2×2 collage on the right (each tile 250×250 with a gap), text panel on the left.
const tile = 262, gap = 14;
const gridX = W - 2 * tile - gap - 44;
const gridY = (H - 2 * tile - gap) / 2;
const photos = ['bouquet-1.webp', 'frame-1.webp', 'resin-coaster-1.webp', 'lamp-1.webp'];

const tiles = await Promise.all(photos.map(async (f) =>
  sharp(img(f)).resize(tile, tile, { fit: 'cover', position: 'attention' })
    .composite([{ input: Buffer.from(`<svg width="${tile}" height="${tile}"><rect x="1" y="1" width="${tile - 2}" height="${tile - 2}" rx="10" fill="none" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="2"/></svg>`) }])
    .png().toBuffer()));

const svg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/><stop offset="1" stop-color="#1a1508"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="14" fill="none" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="2"/>
  <text x="64" y="205" font-family="Georgia, 'Times New Roman', serif" font-size="66" font-weight="700" fill="#ffffff">Subwikha’s</text>
  <text x="64" y="285" font-family="Georgia, 'Times New Roman', serif" font-size="66" font-weight="700" fill="#ffffff">Hub</text>
  <text x="64" y="345" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-style="italic" fill="${GOLD}">Where Memories Become Gifts</text>
  <line x1="64" y1="382" x2="330" y2="382" stroke="${GOLD}" stroke-opacity="0.6" stroke-width="2"/>
  <text x="64" y="428" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#e8e0d0">Handmade customized gifts</text>
  <text x="64" y="462" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#e8e0d0">Chocolate bouquets · Resin art</text>
  <text x="64" y="496" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#e8e0d0">Photo frames · Keychains</text>
  <text x="64" y="560" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="2" fill="${GOLD}">COIMBATORE · DELIVERED ACROSS INDIA</text>
</svg>`);

await sharp(svg)
  .composite(tiles.map((input, i) => ({
    input,
    left: Math.round(gridX + (i % 2) * (tile + gap)),
    top: Math.round(gridY + Math.floor(i / 2) * (tile + gap)),
  })))
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(root, 'public', 'og-image.jpg'));

console.log('wrote public/og-image.jpg (1200×630)');
