// Resize and compress source art from assets-src/ into public/ and app/ for the web.
// Run: node scripts/prepare-assets.mjs   (then node scripts/make-face-assets.mjs)
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";

const SRC = "assets-src";
const IMG = "public/images";
mkdirSync(`${IMG}/screens`, { recursive: true });
const kb = (f) => `${(statSync(f).size / 1024).toFixed(0)}KB`;
const log = (f) => console.log(f.padEnd(44), kb(f));

// Mascot poses: already 512x768 with alpha. Trim the transparent margin identically for every pose
// is not safe (extents differ), so keep the canvas and just recompress.
for (const pose of ["idle", "watching", "thinking", "speaking"]) {
  const out = `${IMG}/buildy-${pose}.png`;
  await sharp(`${SRC}/mybuildy-${pose}.png`).png({ compressionLevel: 9, effort: 10 }).toFile(out);
  log(out);
}

// Screenshots from docs/assets.
for (const name of ["guidance-panel", "mascot", "memory", "set-goal", "settings"]) {
  const out = `${IMG}/screens/${name}.png`;
  await sharp(`${SRC}/${name}.png`).png({ compressionLevel: 9, effort: 10 }).toFile(out);
  log(out);
}

// Logo: the source is opaque on a near-black backdrop. Key the backdrop to alpha by brightness so
// the logo sits cleanly on both --ink and --surface, then crop tight.
{
  const { data, info } = await sharp(`${SRC}/mybuildy-logo.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const LO = 28, HI = 90; // max-channel values: <=LO fully transparent, >=HI opaque
  for (let i = 0; i < out.length; i += 4) {
    const m = Math.max(data[i], data[i + 1], data[i + 2]);
    const a = Math.min(1, Math.max(0, (m - LO) / (HI - LO)));
    out[i + 3] = Math.round(a * 255);
  }
  const keyed = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png().toBuffer();
  // The source art reads "My Buildy"; the name is one word. Close the word gap (source columns
  // 838–889 are empty; inside the words letter gaps are 5–11px) by removing GAP_CUT columns from
  // its middle, leaving a normal letter gap: "MyBuildy" in the original lettering.
  const GAP_FROM = 842, GAP_CUT = 44;
  const closed = await sharp({ create: { width: info.width - GAP_CUT, height: info.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: await sharp(keyed).extract({ left: 0, top: 0, width: GAP_FROM, height: info.height }).toBuffer(), left: 0, top: 0 },
      {
        input: await sharp(keyed).extract({ left: GAP_FROM + GAP_CUT, top: 0, width: info.width - GAP_FROM - GAP_CUT, height: info.height }).toBuffer(),
        left: GAP_FROM,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  // Full lockup (mark + wordmark) for the top bar.
  const lockup = `${IMG}/mybuildy-logo.png`;
  await sharp(closed).extract({ left: 95, top: 330, width: 1370 - GAP_CUT, height: 360 }).resize({ height: 96 })
    .png({ compressionLevel: 9 }).toFile(lockup);
  log(lockup);
  // Square mark (opaque, as designed) for favicon and apple-touch-icon.
  const mark = sharp(`${SRC}/mybuildy-logo.png`).extract({ left: 95, top: 330, width: 380, height: 360 })
    .resize(512, 512, { fit: "cover" });
  await mark.clone().resize(64, 64).png({ palette: true, quality: 95, compressionLevel: 9 }).toFile("app/icon.png");
  await mark.clone().resize(180, 180).png().toFile("app/apple-icon.png");
  log("app/icon.png"); log("app/apple-icon.png");
}

// Demo video poster, 1280x720: guidance panel beside the watching pose on the surface colour.
{
  const out = `${IMG}/demo-poster.jpg`;
  const panel = await sharp(`${SRC}/guidance-panel.png`).resize({ height: 560 }).toBuffer();
  const panelMeta = await sharp(panel).metadata();
  const bot = await sharp(`${SRC}/mybuildy-watching.png`).resize({ height: 620 }).toBuffer();
  const glow = Buffer.from(
    `<svg width="1280" height="720"><defs><radialGradient id="g" cx="0.32" cy="0.55" r="0.5">
      <stop offset="0" stop-color="#FC8400" stop-opacity="0.28"/><stop offset="1" stop-color="#0E0E11" stop-opacity="0"/>
    </radialGradient></defs><rect width="1280" height="720" fill="#0E0E11"/><rect width="1280" height="720" fill="url(#g)"/></svg>`,
  );
  await sharp(glow)
    .composite([
      { input: bot, left: 150, top: 70 },
      { input: panel, left: 1180 - (panelMeta.width ?? 500), top: 80 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  log(out);
}
