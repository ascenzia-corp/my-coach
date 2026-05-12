// Generates minimal PWA icons: black disc + white "M".
// Run once after install: `node scripts/generate-icons.mjs`
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sizes = [
  { size: 192, file: "icon-192.png", maskable: false },
  { size: 512, file: "icon-512.png", maskable: false },
  { size: 512, file: "icon-512-maskable.png", maskable: true },
];

function svg(size, maskable) {
  // Maskable variants need a safe area ~80% of canvas — disc smaller, full bleed bg.
  const cx = size / 2;
  const cy = size / 2;
  const radius = maskable ? size * 0.5 : size * 0.46;
  const fontSize = Math.round(size * (maskable ? 0.5 : 0.55));
  const bg = maskable
    ? `<rect width="${size}" height="${size}" fill="#0a0a0a"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#0a0a0a"/>
  <text x="${cx}" y="${cy}" fill="#fafafa"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
        font-weight="700" font-size="${fontSize}"
        text-anchor="middle" dominant-baseline="central">M</text>
</svg>`;
}

const outDir = resolve(process.cwd(), "public");
for (const { size, file, maskable } of sizes) {
  const buf = await sharp(Buffer.from(svg(size, maskable))).png().toBuffer();
  await writeFile(resolve(outDir, file), buf);
  console.log("wrote", file);
}
