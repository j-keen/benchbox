import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'client', 'public');

function createSvg(size, maskable = false) {
  // maskable icons need content in the "safe zone" (inner 80%)
  const fontSize = maskable ? size * 0.32 : size * 0.4;
  const y = size / 2 + fontSize * 0.35;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.15}" fill="#0ea5e9"/>
  <text x="50%" y="${y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${fontSize}" fill="white">BB</text>
</svg>`;
}

const icons = [
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const icon of icons) {
  const svg = createSvg(icon.size, icon.maskable);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, icon.name));
  console.log(`Created ${icon.name}`);
}

console.log('All icons generated!');
