// @effect-diagnostics nodeBuiltinImport:off - A small asset script.
/**
 * Renders the 1280x640 GitHub social preview, `assets/brand/social-preview.png`, from the brand
 * mark (docs/BRAND.md). Text is set in Noto Sans (SIL OFL), which must be installed on the
 * machine that renders it. Upload the PNG in the repository's Settings > Social preview.
 *
 *   node scripts/render-social-preview.ts
 */
import * as NodePath from "node:path";

import sharp from "sharp";

const repoRoot = NodePath.resolve(import.meta.dirname, "..");
const output = NodePath.join(repoRoot, "assets", "brand", "social-preview.png");

// The mark's geometry, as in assets/brand/moonfold-mark.svg.
const MARK = [
  `<g transform="translate(581.68 498.81) rotate(-32)">`,
  `<path d="M 103.4 -458.48 A 470 470 0 1 0 103.4 458.48 A 470 470 0 0 1 103.4 -458.48 Z" fill="#F4B740"/>`,
  `<path d="M 103.4 -458.48 A 470 470 0 0 0 103.4 458.48 Z" fill="#FFE2A3"/>`,
  `<path d="M 103.4 -458.48 L 103.4 458.48" stroke="#C8891C" stroke-width="11.75" stroke-linecap="round"/>`,
  `</g>`,
].join("");

const FONT = `font-family="Noto Sans SC, Noto Sans, sans-serif"`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B2254"/><stop offset="1" stop-color="#0A0E26"/></linearGradient></defs>
<rect width="1280" height="640" fill="url(#bg)"/>
<g transform="translate(250 320) scale(0.36) translate(-512 -512)">${MARK}</g>
<text x="470" y="300" ${FONT} font-weight="700" font-size="104" fill="#FFE2A3">Moonfold</text>
<text x="472" y="375" ${FONT} font-size="34" fill="#F4B740">When one coding agent hits its limit,</text>
<text x="472" y="420" ${FONT} font-size="34" fill="#F4B740">the task continues in another.</text>
<text x="472" y="500" ${FONT} font-size="24" fill="#9AA3D4">Open source · local-first · bring your own agents</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(output);
