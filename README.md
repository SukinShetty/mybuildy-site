# mybuildy.com

Marketing site for [My Buildy](https://github.com/SukinShetty/mybuildy): a small orange robot that watches your terminal and tells you in plain English what your AI coding agent just did.

Next.js 15 (App Router), TypeScript, Tailwind v4, shadcn/ui, framer-motion, lucide-react.

## Develop

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start   # production preview
```

Optional: set `NEXT_PUBLIC_DEMO_VIDEO_ID` (see `.env.example`) to a YouTube id to enable the demo video. Empty shows a "coming today" state.

## How it stays current

- Download buttons read `releases/latest` from the GitHub API at build time (revalidated hourly) and match assets by suffix: `.exe`, `-arm64.dmg`, `-x64.dmg`. If there is no release they link to the releases page. No version number is hardcoded.
- The GitHub star count is fetched the same way and hidden if the request fails.

## Assets

Source art lives in `assets-src/` (copied from the app repo). Regenerate the web assets with:

```bash
node scripts/prepare-assets.mjs     # resize/compress poses, screenshots, logo, icons, demo poster
node scripts/make-face-assets.mjs   # buildy-face-blank.png + pupil.png, prints eye and visor coordinates
```

`components/hero-robot.tsx` is self-contained so the layered 2D robot can later be swapped for a 3D model.
