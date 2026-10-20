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

import { colourMark, MOONFOLD_COLORS, placeMark } from "./lib/brand-mark.ts";

const repoRoot = NodePath.resolve(import.meta.dirname, "..");
const output = NodePath.join(repoRoot, "assets", "brand", "social-preview.png");

const FONT = `font-family="Noto Sans SC, Noto Sans, sans-serif"`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#121B52"/><stop offset="1" stop-color="#050A24"/></linearGradient></defs>
<rect width="1280" height="640" fill="url(#bg)"/>
${colourMark(placeMark(380, 255, 325))}
<text x="480" y="300" ${FONT} font-weight="700" font-size="104" fill="${MOONFOLD_COLORS.moonlight}">Moonfold</text>
<text x="482" y="375" ${FONT} font-size="34" fill="${MOONFOLD_COLORS.periwinkle}">When one coding agent hits its limit,</text>
<text x="482" y="420" ${FONT} font-size="34" fill="${MOONFOLD_COLORS.periwinkle}">the task continues in another.</text>
<text x="482" y="500" ${FONT} font-size="24" fill="#9AA3D4">Open source · local-first · bring your own agents</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(output);
