/**
 * The Moonfold mark (docs/BRAND.md): a crescent moon inside a tilted orbit ring, with a four-point
 * star on the ring. One parametric model, drawn as SVG fragments for every icon, the social image
 * and the docs site. Units are the moon's radius; `size` is the width the whole mark spans.
 */

// Geometry in units of the moon's radius, the moon centred at the origin.
const SHADOW = { cx: 0.28, cy: -0.29, r: 0.745 } as const;
const RING = { cx: 0.02, cy: -0.15, rx: 1.5, ry: 0.3, angle: -21.6, width: 0.045 } as const;
const STAR = { cx: 0.9, cy: -0.8, h: 0.44, w: 0.29 } as const;

export const MOONFOLD_COLORS = {
  ink: "#050A24",
  inkLight: "#121B52",
  moonlight: "#EEF1FF",
  periwinkle: "#8C9BFF",
  royal: "#3D4FE6",
  deep: "#1C2690",
  shadow: "#060B26",
  shadowRim: "#141E66",
} as const;

function round(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/** Extent of the full mark (moon, ring and star) in moon radii, used to centre and scale it. */
function markBounds(withStar: boolean): { minX: number; maxX: number; minY: number; maxY: number } {
  const t = (RING.angle * Math.PI) / 180;
  const halfX = Math.hypot(RING.rx * Math.cos(t), RING.ry * Math.sin(t));
  const halfY = Math.hypot(RING.rx * Math.sin(t), RING.ry * Math.cos(t));
  const ringPad = RING.width / 2;
  let minX = Math.min(-1, RING.cx - halfX - ringPad);
  let maxX = Math.max(1, RING.cx + halfX + ringPad);
  let minY = Math.min(-1, RING.cy - halfY - ringPad);
  let maxY = Math.max(1, RING.cy + halfY + ringPad);
  if (withStar) {
    minX = Math.min(minX, STAR.cx - STAR.w);
    maxX = Math.max(maxX, STAR.cx + STAR.w);
    minY = Math.min(minY, STAR.cy - STAR.h);
    maxY = Math.max(maxY, STAR.cy + STAR.h);
  }
  return { minX, maxX, minY, maxY };
}

interface Placement {
  /** Moon radius in output units. */
  readonly r: number;
  /** Moon centre in output units. */
  readonly x: number;
  readonly y: number;
}

/** Scales the mark so its widest side spans `size`, centred on (cx, cy). */
export function placeMark(size: number, cx: number, cy: number, withStar = true): Placement {
  const b = markBounds(withStar);
  const r = size / Math.max(b.maxX - b.minX, b.maxY - b.minY);
  return { r, x: cx - ((b.minX + b.maxX) / 2) * r, y: cy - ((b.minY + b.maxY) / 2) * r };
}

function ringArc(p: Placement, half: "back" | "front" | "full"): string {
  const rx = RING.rx * p.r;
  const ry = RING.ry * p.r;
  const cx = p.x + RING.cx * p.r;
  const cy = p.y + RING.cy * p.r;
  const t = `rotate(${RING.angle} ${round(cx)} ${round(cy)})`;
  const left = `${round(cx - rx)} ${round(cy)}`;
  const right = `${round(cx + rx)} ${round(cy)}`;
  // In SVG's y-down frame, sweep 0 from left to right passes below the centre: the front half.
  const d =
    half === "front"
      ? `M ${left} A ${round(rx)} ${round(ry)} 0 0 0 ${right}`
      : half === "back"
        ? `M ${left} A ${round(rx)} ${round(ry)} 0 0 1 ${right}`
        : `M ${left} A ${round(rx)} ${round(ry)} 0 0 1 ${right} A ${round(rx)} ${round(ry)} 0 0 1 ${left} Z`;
  return `<path d="${d}" transform="${t}"`;
}

function starPath(p: Placement, scale = 1): string {
  const cx = p.x + STAR.cx * p.r;
  const cy = p.y + STAR.cy * p.r;
  const h = STAR.h * p.r * scale;
  const w = STAR.w * p.r * scale;
  const c = Math.min(w, h) * 0.055;
  const pt = (x: number, y: number) => `${round(cx + x)} ${round(cy + y)}`;
  return (
    `M ${pt(0, -h)} Q ${pt(c, -c)} ${pt(w, 0)} Q ${pt(c, c)} ${pt(0, h)} ` +
    `Q ${pt(-c, c)} ${pt(-w, 0)} Q ${pt(-c, -c)} ${pt(0, -h)} Z`
  );
}

/**
 * The full-colour mark with glow. `id` prefixes gradient and filter ids so several marks can share
 * one document.
 */
export function colourMark(p: Placement, id = "mf"): string {
  const r = p.r;
  const moon = `${round(p.x)}`;
  const glow = round(r * 0.035);
  const shadowX = round(p.x + SHADOW.cx * r);
  const shadowY = round(p.y + SHADOW.cy * r);
  const ringWidth = round(RING.width * r);
  return (
    `<defs>` +
    `<linearGradient id="${id}-moon" x1="0.15" y1="0.1" x2="0.85" y2="0.95">` +
    `<stop offset="0" stop-color="${MOONFOLD_COLORS.moonlight}"/>` +
    `<stop offset="0.45" stop-color="${MOONFOLD_COLORS.periwinkle}"/>` +
    `<stop offset="1" stop-color="${MOONFOLD_COLORS.royal}"/></linearGradient>` +
    `<radialGradient id="${id}-shade" cx="0.4" cy="0.35" r="0.75">` +
    `<stop offset="0.6" stop-color="${MOONFOLD_COLORS.shadow}"/>` +
    `<stop offset="1" stop-color="${MOONFOLD_COLORS.shadowRim}"/></radialGradient>` +
    `<radialGradient id="${id}-spark"><stop offset="0" stop-color="${MOONFOLD_COLORS.periwinkle}" stop-opacity="0.7"/>` +
    `<stop offset="1" stop-color="${MOONFOLD_COLORS.royal}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${id}-halo"><stop offset="0.55" stop-color="${MOONFOLD_COLORS.royal}" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="${MOONFOLD_COLORS.royal}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}-ring" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${MOONFOLD_COLORS.periwinkle}"/><stop offset="0.5" stop-color="#FFFFFF"/>` +
    `<stop offset="1" stop-color="${MOONFOLD_COLORS.moonlight}"/></linearGradient>` +
    `<filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%">` +
    `<feGaussianBlur stdDeviation="${glow}" result="b"/>` +
    `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<clipPath id="${id}-disc"><circle cx="${moon}" cy="${round(p.y)}" r="${round(r)}"/></clipPath>` +
    `</defs>` +
    // A soft halo behind the moon.
    `<circle cx="${moon}" cy="${round(p.y)}" r="${round(r * 1.32)}" fill="url(#${id}-halo)"/>` +
    // The back of the ring, hidden where the moon passes in front of it.
    `${ringArc(p, "back")} fill="none" stroke="url(#${id}-ring)" stroke-width="${ringWidth}" stroke-linecap="round" filter="url(#${id}-glow)"/>` +
    // The moon: lit disc, then the shadowed part, leaving a crescent.
    `<g clip-path="url(#${id}-disc)">` +
    `<circle cx="${moon}" cy="${round(p.y)}" r="${round(r)}" fill="url(#${id}-moon)" filter="url(#${id}-glow)"/>` +
    `<circle cx="${shadowX}" cy="${shadowY}" r="${round(SHADOW.r * r)}" fill="url(#${id}-shade)"/>` +
    `</g>` +
    // The front of the ring, over the moon.
    `${ringArc(p, "front")} fill="none" stroke="url(#${id}-ring)" stroke-width="${ringWidth}" stroke-linecap="round" filter="url(#${id}-glow)"/>` +
    `<circle cx="${round(p.x + STAR.cx * r)}" cy="${round(p.y + STAR.cy * r)}" r="${round(STAR.h * r * 0.75)}" fill="url(#${id}-spark)"/>` +
    `<path d="${starPath(p)}" fill="#FFFFFF" filter="url(#${id}-glow)"/>`
  );
}

/**
 * A flat mark for small sizes (favicons, 16 to 48 px): no glow or halo, a thicker ring, and the
 * star only when there is room for it.
 */
export function smallMark(p: Placement, withStar: boolean, ringScale = 2.1, id = "mfs"): string {
  const r = p.r;
  const ringWidth = round(RING.width * r * ringScale);
  return (
    `<defs><linearGradient id="${id}-moon" x1="0.15" y1="0.1" x2="0.85" y2="0.95">` +
    `<stop offset="0" stop-color="${MOONFOLD_COLORS.moonlight}"/>` +
    `<stop offset="1" stop-color="${MOONFOLD_COLORS.periwinkle}"/></linearGradient>` +
    `<clipPath id="${id}-disc"><circle cx="${round(p.x)}" cy="${round(p.y)}" r="${round(r)}"/></clipPath></defs>` +
    `${ringArc(p, "back")} fill="none" stroke="${MOONFOLD_COLORS.moonlight}" stroke-width="${ringWidth}" stroke-linecap="round"/>` +
    `<g clip-path="url(#${id}-disc)"><circle cx="${round(p.x)}" cy="${round(p.y)}" r="${round(r)}" fill="url(#${id}-moon)"/>` +
    `<circle cx="${round(p.x + SHADOW.cx * r)}" cy="${round(p.y + SHADOW.cy * r)}" r="${round(SHADOW.r * r)}" fill="${MOONFOLD_COLORS.shadow}"/></g>` +
    `${ringArc(p, "front")} fill="none" stroke="#FFFFFF" stroke-width="${ringWidth}" stroke-linecap="round"/>` +
    (withStar ? `<path d="${starPath(p, 1.15)}" fill="#FFFFFF"/>` : "")
  );
}

/**
 * The mark in one colour: crescent, ring and star, with a gap cut along the ring where it crosses
 * the crescent so the shapes stay apart without a second colour.
 */
export function monoMark(p: Placement, colour: string, id = "mfm"): string {
  const r = p.r;
  const ringWidth = round(RING.width * r * 1.6);
  const gap = round(RING.width * r * 4.2);
  return (
    `<defs>` +
    `<mask id="${id}-crescent" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="10000" height="10000">` +
    `<circle cx="${round(p.x)}" cy="${round(p.y)}" r="${round(r)}" fill="#fff"/>` +
    `<circle cx="${round(p.x + SHADOW.cx * r)}" cy="${round(p.y + SHADOW.cy * r)}" r="${round(SHADOW.r * r)}" fill="#000"/>` +
    `${ringArc(p, "front")} fill="none" stroke="#000" stroke-width="${gap}"/></mask>` +
    `<mask id="${id}-back" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="10000" height="10000">` +
    `<rect x="-5000" y="-5000" width="10000" height="10000" fill="#fff"/>` +
    `<circle cx="${round(p.x)}" cy="${round(p.y)}" r="${round(r + RING.width * r * 2)}" fill="#000"/></mask>` +
    `</defs>` +
    `<g fill="${colour}" stroke="${colour}">` +
    `<rect x="-5000" y="-5000" width="10000" height="10000" mask="url(#${id}-crescent)" stroke="none"/>` +
    `<g mask="url(#${id}-back)">${ringArc(p, "back")} fill="none" stroke-width="${ringWidth}" stroke-linecap="round"/></g>` +
    `${ringArc(p, "front")} fill="none" stroke-width="${ringWidth}" stroke-linecap="round"/>` +
    `<path d="${starPath(p)}" stroke="none"/>` +
    `</g>`
  );
}
