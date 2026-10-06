// Copy Buildy's frame-by-frame animation strips from the app's artwork into public/images/buildy/
// as lossless WebP (pixel-identical to the PNGs, alpha kept). Each strip is one row of 256x288 frames.
// Run: node scripts/prepare-buildy-strips.mjs [path to the animations folder]
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";

const SRC = process.argv[2] ?? "C:/Users/User/buildy-companion/buildy-companion/animations";
const OUT = "public/images/buildy";
const STRIPS = { idle: 6, review: 6, working: 6, waving: 4, jumping: 5, failed: 8 };
mkdirSync(OUT, { recursive: true });

for (const [name, frames] of Object.entries(STRIPS)) {
  const src = `${SRC}/${name}.png`;
  const out = `${OUT}/${name}.webp`;
  const meta = await sharp(src).metadata();
  if (meta.width !== frames * 256 || meta.height !== 288) {
    throw new Error(`${src} is ${meta.width}x${meta.height}, expected ${frames * 256}x288`);
  }
  await sharp(src).webp({ lossless: true, effort: 6, exact: true }).toFile(out);
  const [a, b] = await Promise.all([src, out].map((f) => sharp(f).ensureAlpha().raw().toBuffer()));
  if (!a.equals(b)) throw new Error(`${out} differs from ${src}`);
  console.log(out.padEnd(36), `${(statSync(src).size / 1024).toFixed(0)}KB ->`, `${(statSync(out).size / 1024).toFixed(0)}KB`, "identical");
}
