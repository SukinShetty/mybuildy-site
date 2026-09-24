// One-off: derive the hero's face layers from mybuildy-idle.png.
//   public/images/buildy-face-blank.png  idle pose with the visor filled flat (eyes removed, smile kept)
//   public/images/pupil.png              one eye (ring + highlights) on the visor colour, circular alpha
// Prints eye centres and visor bounds in source pixels (512x768) for components/hero-robot.tsx.
// Run: node scripts/make-face-assets.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "assets-src/mybuildy-idle.png";
const OUT = "public/images";
const VISOR = [5, 5, 6]; // --ink, so the filled visor matches the page exactly
mkdirSync(OUT, { recursive: true });

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const idx = (x, y) => (y * W + x) * 4;
const alpha = (x, y) => data[idx(x, y) + 3];

// 1. Visor = transparent region enclosed by the head rim. Flood fill from the gap between the eyes.
const SEED = [256, 212];
const inVisor = new Uint8Array(W * H);
{
  const stack = [SEED];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const k = y * W + x;
    if (inVisor[k] || alpha(x, y) >= 128) continue;
    // guard: visor must stay inside the head, never leak to the page background
    if (y < 150 || y > 320) throw new Error(`flood leaked at ${x},${y}`);
    inVisor[k] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}
let vx0 = W, vy0 = H, vx1 = 0, vy1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inVisor[y * W + x]) {
  vx0 = Math.min(vx0, x); vx1 = Math.max(vx1, x); vy0 = Math.min(vy0, y); vy1 = Math.max(vy1, y);
}

// 2. Islands = opaque pixels inside the visor bbox that the flood went around (eyes, smile).
//    Anything connected to the bbox edge is the rim; a pixel is an island if it's enclosed row-wise
//    and column-wise by visor pixels.
const enclosed = (x, y) => {
  let l = false, r = false, u = false, d = false;
  for (let i = x - 1; i >= vx0; i--) if (inVisor[y * W + i]) { l = true; break; }
  for (let i = x + 1; i <= vx1; i++) if (inVisor[y * W + i]) { r = true; break; }
  for (let j = y - 1; j >= vy0; j--) if (inVisor[j * W + x]) { u = true; break; }
  for (let j = y + 1; j <= vy1; j++) if (inVisor[j * W + x]) { d = true; break; }
  return l && r && u && d;
};
const island = new Int32Array(W * H).fill(-1);
const comps = [];
for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) {
  const k = y * W + x;
  if (inVisor[k] || island[k] >= 0 || !enclosed(x, y)) continue;
  const id = comps.length, c = { x0: x, x1: x, y0: y, y1: y, n: 0 };
  const stack = [[x, y]];
  while (stack.length) {
    const [px, py] = stack.pop();
    if (px < vx0 || px > vx1 || py < vy0 || py > vy1) continue;
    const q = py * W + px;
    if (inVisor[q] || island[q] >= 0 || !enclosed(px, py)) continue;
    island[q] = id; c.n++;
    c.x0 = Math.min(c.x0, px); c.x1 = Math.max(c.x1, px); c.y0 = Math.min(c.y0, py); c.y1 = Math.max(c.y1, py);
    stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  comps.push(c);
}
// The eye interiors are transparent too, so the flood never enters them — treat each eye as the
// filled disc spanned by its ring. Eyes are the two largest roughly-square components.
const big = comps.filter((c) => c.n > 40).sort((a, b) => b.n - a.n);
const eyes = big
  .filter((c) => { const w = c.x1 - c.x0, h = c.y1 - c.y0; return w > 20 && Math.abs(w - h) < 10; })
  .slice(0, 2)
  .sort((a, b) => a.x0 - b.x0);
if (eyes.length !== 2) throw new Error("could not find two eyes: " + JSON.stringify(big));
const eyeGeo = eyes.map((c) => ({
  cx: (c.x0 + c.x1) / 2, cy: (c.y0 + c.y1) / 2, r: Math.max(c.x1 - c.x0, c.y1 - c.y0) / 2 + 1.5,
}));

// 3. face-blank: every pixel inside the visor bbox that is visor or an eye disc -> flat VISOR colour.
//    Smile and rim are untouched. Eye discs blend at the edge with 1.5px feather.
const blank = Buffer.from(data);
const inEllipse = (x, y) => {
  const cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2, rx = (vx1 - vx0) / 2 + 1, ry = (vy1 - vy0) / 2 + 1;
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
};
for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) {
  const k = y * W + x, i = k * 4;
  let t = 0; // 0..1 how much to replace with flat visor
  if (inVisor[k]) t = 1;
  for (const e of eyeGeo) {
    const d = Math.hypot(x - e.cx, y - e.cy);
    t = Math.max(t, Math.min(1, Math.max(0, e.r + 1.5 - d) / 1.5));
  }
  if (!t || !inEllipse(x, y)) continue;
  // composite source over flat visor, then lerp toward pure visor by t
  const a = data[i + 3] / 255;
  for (let ch = 0; ch < 3; ch++) {
    const over = data[i + ch] * a + VISOR[ch] * (1 - a);
    blank[i + ch] = Math.round(over * (1 - t) + VISOR[ch] * t);
  }
  blank[i + 3] = 255;
}
await sharp(blank, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/buildy-face-blank.png`);

// 4. pupil.png: the left eye composited on the visor colour, circular alpha, 4x supersampled edge.
const e = eyeGeo[0];
const R = Math.ceil(e.r) + 1, S = R * 2;
const pupil = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const sx = Math.round(e.cx - R + x), sy = Math.round(e.cy - R + y);
  const i = idx(sx, sy), o = (y * S + x) * 4;
  const a = data[i + 3] / 255;
  for (let ch = 0; ch < 3; ch++) pupil[o + ch] = Math.round(data[i + ch] * a + VISOR[ch] * (1 - a));
  let cover = 0;
  for (let sy2 = 0; sy2 < 4; sy2++) for (let sx2 = 0; sx2 < 4; sx2++) {
    const d = Math.hypot(x + (sx2 + 0.5) / 4 - R, y + (sy2 + 0.5) / 4 - R);
    if (d <= e.r) cover++;
  }
  pupil[o + 3] = Math.round((cover / 16) * 255);
}
await sharp(pupil, { raw: { width: S, height: S, channels: 4 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/pupil.png`);

console.log(JSON.stringify({
  source: { width: W, height: H },
  visor: { x0: vx0, y0: vy0, x1: vx1, y1: vy1, cx: (vx0 + vx1) / 2, cy: (vy0 + vy1) / 2 },
  leftEye: eyeGeo[0], rightEye: eyeGeo[1],
  pupilPng: { size: S, radius: e.r },
  otherIslands: big.filter((c) => !eyes.includes(c)).map((c) => ({ ...c })),
}, null, 2));
