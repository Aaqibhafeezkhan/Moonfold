// Glass folders: plain-JS port of the glass-folder-cards component.
//
// Everything visual lives in styles.css. This file builds the DOM, paints the
// generated artwork, and sets geometry through the CSSOM (element.style.*),
// which the site's strict CSP (style-src 'self') allows, unlike style attributes
// written into the markup.

const W = 340;
const H = 272;
const HEADROOM = 54;
const FRONT_TOP = 74;
const FRONT_H = H - FRONT_TOP;
const SHEET_W = 272;
const SHEET_H = 184;
const MAX_VISIBLE = 4;
const MAX_WIDTH = 340;

const BACK_PATH =
  "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z";
const FRONT_PATH = `M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ${FRONT_H - 22}A22 22 0 0 1 318 ${FRONT_H}L22 ${FRONT_H}A22 22 0 0 1 0 ${FRONT_H - 22}Z`;

const SVG_NS = "http://www.w3.org/2000/svg";

const ART = {
  aurora: {
    style: "streak",
    colors: ["#f4efe9", "#e9c2b8", "#c2433f", "#2a1e2a", "#22395e", "#6f97c2", "#e5edf4"],
    scale: 0.7,
    warp: 1.4,
    angle: -0.62,
    gloss: 0.18,
    veins: 0,
  },
  ember: {
    style: "marble",
    colors: ["#07090c", "#16252c", "#3d5f68", "#1a1416", "#a3201a", "#ef4a2b", "#ff8a5c"],
    scale: 0.62,
    warp: 3.2,
    angle: -0.5,
    gloss: 0.55,
    veins: 0.6,
  },
  dusk: {
    style: "marble",
    colors: ["#120c18", "#3e2850", "#8f6c9c", "#2b1a24", "#b3502f", "#eab08a", "#fbe7d2"],
    scale: 0.75,
    warp: 3.6,
    angle: 0.8,
    gloss: 0.5,
    veins: 0.5,
  },
  glacier: {
    style: "streak",
    colors: ["#f7f8fa", "#d9e2ea", "#9fb4c7", "#e8edf2", "#bccbd8", "#ffffff"],
    scale: 0.7,
    warp: 1.6,
    angle: 0.35,
    gloss: 0.25,
    veins: 0,
  },
  verdant: {
    style: "marble",
    colors: ["#070b08", "#173024", "#4f7a5a", "#141812", "#a7843a", "#e9cf87", "#fbf3d6"],
    scale: 0.7,
    warp: 3.4,
    angle: 2.1,
    gloss: 0.5,
    veins: 0.5,
  },
};

// The folders on the page. Plain data: label, files, and which key to show.
const FOLDERS = [
  {
    label: "Workspace Files",
    tone: "light",
    art: "aurora",
    seed: 3,
    action: "add",
    noun: "item",
    files: [
      { name: "Architecture.md", meta: "MD · 4.8 KB", art: "ember" },
      { name: "Orchestrator.ts", meta: "TS · 12 KB", art: "dusk" },
      { name: "Brief.pdf", meta: "PDF · 320 KB" },
    ],
  },
  {
    label: "Agent Threads",
    tone: "light",
    art: "none",
    seed: 7,
    action: "more",
    noun: "session",
    files: [
      { name: "Claude — Core Refactor", meta: "Turn 14", art: "dusk" },
      { name: "Codex — Test Worker", meta: "Turn 8" },
      { name: "Cursor — Shell UI", meta: "Turn 21", art: "ember" },
      { name: "Handoff Brief.md", meta: "Preserved" },
    ],
  },
  {
    label: "Checkpoints",
    tone: "dark",
    art: "ember",
    seed: 11,
    action: "add",
    noun: "revision",
    files: [
      { name: "Git Ref: 7b8f2a", meta: "Clean tree", art: "verdant" },
      { name: "Diff review.patch", meta: "+142 -28" },
      { name: "Snapshot: pre-switch", meta: "Restorable", art: "aurora" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Artwork: a domain-warped noise field lit as a liquid surface.

function hexToRgb(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeFbm(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const grad = new Float32Array(512);
  const p = [];
  for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) {
    const a = r() * Math.PI * 2;
    grad[i * 2] = Math.cos(a);
    grad[i * 2 + 1] = Math.sin(a);
  }
  const noise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const h00 = perm[X + perm[Y]] * 2;
    const h10 = perm[X + 1 + perm[Y]] * 2;
    const h01 = perm[X + perm[Y + 1]] * 2;
    const h11 = perm[X + 1 + perm[Y + 1]] * 2;
    const d00 = grad[h00] * xf + grad[h00 + 1] * yf;
    const d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
    const d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1);
    const d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00));
  };
  return (x, y, octaves) => {
    let sum = 0;
    let amp = 0.5;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x, y);
      const nx = 1.6 * x + 1.2 * y + 7.1;
      y = -1.2 * x + 1.6 * y + 3.3;
      x = nx;
      amp *= 0.5;
    }
    return sum;
  };
}

function createArtJob(width, height, recipe, seed) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const colors = recipe.colors;
  const stops = colors.map((c, i) => ({ t: i / (colors.length - 1), c: hexToRgb(c) }));
  const scale = recipe.scale ?? 0.7;
  const warp = recipe.warp ?? 3;
  const gloss = recipe.gloss ?? 0.4;
  const veins = recipe.veins ?? 0;
  const streak = recipe.style === "streak";
  const fbm = makeFbm(seed * 977 + 13);
  const r = rng(seed + 1);
  const ox = r() * 50;
  const oy = r() * 50;
  const angle = (recipe.angle ?? 0) + (r() - 0.5) * 0.5;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const m = Math.min(w, h);
  const gw = Math.ceil(w / 2) + 3;
  const gh = Math.ceil(h / 2) + 3;
  const G = new Float32Array(gw * gh);
  const GQ = new Float32Array(gw * gh);
  const F = new Float32Array(w * h);
  const Q = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  let row = 0;

  const field = (gy) => {
    for (let gx = 0; gx < gw; gx++) {
      const u = ((gx - 1) * 2 - w / 2) / m;
      const v = ((gy - 1) * 2 - h / 2) / m;
      let px = (u * ca - v * sa) * scale;
      let py = (u * sa + v * ca) * scale;
      if (streak) {
        px *= 0.14;
        py *= 2.2;
      }
      px += ox;
      py += oy;
      const qx = fbm(px, py, 3);
      const qy = fbm(px + 5.2, py + 1.3, 3);
      const rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3);
      const ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3);
      G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4);
      GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
    }
  };

  const upsample = () => {
    const cr = (a, b, c, d) => (-a + 9 * b + 9 * c - d) / 16;
    const T = new Float32Array(w * gh);
    for (let gy = 0; gy < gh; gy++) {
      const rr = gy * gw;
      for (let x = 0; x < w; x++) {
        const c = (x >> 1) + 1;
        T[gy * w + x] =
          x & 1 ? cr(G[rr + c - 1], G[rr + c], G[rr + c + 1], G[rr + c + 2]) : G[rr + c];
      }
    }
    for (let y = 0; y < h; y++) {
      const c = (y >> 1) + 1;
      for (let x = 0; x < w; x++) {
        F[y * w + x] =
          y & 1
            ? cr(T[(c - 1) * w + x], T[c * w + x], T[(c + 1) * w + x], T[(c + 2) * w + x])
            : T[c * w + x];
        const gx = (x >> 1) + 1;
        const q0 = GQ[c * gw + gx];
        const qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0;
        const q1 =
          y & 1
            ? x & 1
              ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2
              : GQ[(c + 1) * gw + gx]
            : qx;
        Q[y * w + x] = (qx + q1) / 2;
      }
    }
  };

  const colorize = () => {
    const sample = [];
    const stride = Math.max(1, Math.floor(F.length / 4096));
    for (let i = 0; i < F.length; i += stride) sample.push(F[i]);
    sample.sort((a, b) => a - b);
    const lo = sample[Math.floor(sample.length * 0.02)];
    const hi = sample[Math.floor(sample.length * 0.98)];
    const k = 1 / (hi - lo || 1);
    const lx = -0.55;
    const ly = -0.65;
    const lz = 0.52;
    const slope = k * m * 0.012;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let t = (F[i] - lo) * k;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let j = 1;
        while (j < stops.length - 1 && stops[j].t < t) j++;
        const a = stops[j - 1];
        const b = stops[j];
        let f = (t - a.t) / (b.t - a.t || 1);
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        f = f * f * (3 - 2 * f);
        const gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope;
        const gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope;
        const nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
        const spec = Math.pow(nd > 0 ? nd : 0, 24) * gloss * 255;
        const silk = 1 + 0.035 * Math.sin(t * 150 + Q[i] * 24);
        const vein = veins * Math.max(0, 1 - Math.abs(Q[i] - 0.42) * 14) * 0.6;
        const lit = (0.82 + 0.28 * nd) * silk * (1 - vein);
        pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * lit + spec;
        pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * lit + spec;
        pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * lit + spec;
        pixels[i * 4 + 3] = 255;
      }
    }
  };

  const step = (rows) => {
    if (row >= gh) return true;
    const end = Math.min(gh, row + Math.max(1, rows));
    while (row < end) field(row++);
    if (row < gh) return false;
    upsample();
    colorize();
    return true;
  };

  return { width: w, height: h, pixels, step };
}

// One shared painter: every folder queues its art here, and the queue spends a
// few milliseconds a frame, so the page never janks while artwork is made.
const artCache = new Map();
const queue = [];
let pumping = false;

function pump() {
  if (pumping) return;
  pumping = true;
  const tick = () => {
    const until = performance.now() + 7;
    while (queue.length && performance.now() < until) {
      const head = queue[0];
      if (head.job.step(4)) {
        queue.shift();
        const c = document.createElement("canvas");
        c.width = head.job.width;
        c.height = head.job.height;
        c.getContext("2d")?.putImageData(new ImageData(head.job.pixels, c.width, c.height), 0, 0);
        head.done(c);
      }
    }
    if (queue.length) requestAnimationFrame(tick);
    else pumping = false;
  };
  requestAnimationFrame(tick);
}

function paint(recipe, seed, w, h, priority) {
  const key = JSON.stringify([recipe, seed, w, h]);
  let p = artCache.get(key);
  if (!p) {
    p = new Promise((done) => {
      let at = queue.length;
      while (at > 1 && queue[at - 1].priority > priority) at--;
      queue.splice(at, 0, { job: createArtJob(w, h, recipe, seed), priority, done });
      pump();
    });
    artCache.set(key, p);
  }
  return p;
}

function artCanvas(className, art, seed, w, h, density, priority) {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const pw = Math.round(w * density);
  const ph = Math.round(h * density);
  paint(ART[art], seed, pw, ph, priority).then((src) => {
    canvas.width = src.width;
    canvas.height = src.height;
    canvas.getContext("2d")?.drawImage(src, 0, 0);
    canvas.dataset.ready = "";
  });
  return canvas;
}

// ---------------------------------------------------------------------------
// DOM

function el(tag, className, attrs) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function rimSvg(extraClass, height, pathData) {
  const svg = svgEl("svg", {
    class: `gf-rim ${extraClass}`,
    viewBox: `0 0 ${W} ${height}`,
    "aria-hidden": "true",
  });
  svg.append(svgEl("path", { d: pathData }));
  return svg;
}

const plural = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;

let uidCounter = 0;

function buildFolder(config, desk) {
  const uid = `gf${uidCounter++}`;
  const files = config.files.slice();
  let nextId = files.length;
  const ids = files.map((_, i) => i);
  let open = false;
  let menuOpen = false;
  let bump = 0;
  let dropped = null;
  let k = 1;
  let density = 1;

  const root = el("div", "gf-root");
  root.dataset.tone = config.tone;
  root.dataset.place = "bottom-left";

  const stage = el("div", "gf-stage");
  const tilt = el("div", "gf-tilt");
  stage.append(tilt);
  root.append(stage);

  tilt.append(el("div", "gf-shadow", { "aria-hidden": "true" }));

  const back = el("div", "gf-back", { "aria-hidden": "true" });
  back.style.clipPath = `path('${BACK_PATH}')`;
  const backArt = el("div", "gf-art-slot");
  backArt.style.display = "contents";
  back.append(backArt, el("div", "gf-back-sheen"));
  tilt.append(back, rimSvg("gf-back-rim", H, BACK_PATH));

  const front = el("div", "gf-front");
  front.style.clipPath = `path('${FRONT_PATH}')`;
  const rim = rimSvg("gf-front-rim", FRONT_H, FRONT_PATH);
  const defs = svgEl("defs", {});
  const gradient = svgEl("linearGradient", {
    id: `gf-rim-${uid}`,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });
  gradient.append(
    svgEl("stop", { offset: "0", "stop-color": "#fff", "stop-opacity": "0.95" }),
    svgEl("stop", { offset: "0.35", "stop-color": "#fff", "stop-opacity": "0.35" }),
    svgEl("stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "0.12" }),
  );
  defs.append(gradient);
  rim.prepend(defs);
  rim.querySelector("path").setAttribute("stroke", `url(#gf-rim-${uid})`);

  const hit = el("button", "gf-hit", { type: "button" });
  const label = el("div", "gf-label");
  const title = el("span", "gf-title");
  title.textContent = config.label;
  const meta = el("span", "gf-meta");
  label.append(title, meta);
  front.append(
    el("div", "gf-tint", { "aria-hidden": "true" }),
    el("div", "gf-spec", { "aria-hidden": "true" }),
    rim,
    hit,
    label,
  );
  tilt.append(front);

  const filesEl = el("div", "gf-files", {
    role: "list",
    "aria-label": `${config.label} contents`,
  });
  filesEl.inert = true;
  tilt.append(filesEl);

  let keyEl = null;
  let menuEl = null;
  if (config.action !== "none") {
    keyEl = el("button", `gf-key gf-key--${config.action}`, { type: "button" });
    tilt.append(keyEl);
  }

  const metaLine = () => plural(files.length, config.noun);

  const syncLabels = () => {
    const line = metaLine();
    meta.textContent = line;
    // restart the roll-over animation
    meta.style.animation = "none";
    void meta.offsetWidth;
    meta.style.animation = "";
    hit.setAttribute("aria-label", `${open ? "Close" : "Open"} ${config.label}, ${line}`);
    hit.setAttribute("aria-expanded", String(open));
  };

  const setOpen = (next) => {
    open = next;
    root.toggleAttribute("data-open", open);
    filesEl.inert = !open;
    syncLabels();
  };

  const setMenu = (next) => {
    menuOpen = next;
    if (!menuEl) return;
    menuEl.toggleAttribute("data-open", menuOpen);
    keyEl.setAttribute("aria-expanded", String(menuOpen));
    for (const item of menuEl.querySelectorAll("[role=menuitem]")) item.disabled = !menuOpen;
    if (menuOpen) menuEl.querySelector("[role=menuitem]")?.focus();
  };

  const renderGlyph = () => {
    if (!keyEl) return;
    keyEl.replaceChildren();
    if (config.action === "add") {
      keyEl.setAttribute("aria-label", `Add a file to ${config.label}`);
      const svg = svgEl("svg", {
        class: "gf-glyph gf-glyph--plus",
        viewBox: "0 0 24 24",
        "aria-hidden": "true",
      });
      svg.append(svgEl("path", { d: "M12 4.5v15M4.5 12h15" }));
      keyEl.append(svg);
    } else {
      keyEl.setAttribute("aria-label", `More options for ${config.label}`);
      keyEl.setAttribute("aria-haspopup", "menu");
      keyEl.setAttribute("aria-expanded", "false");
      keyEl.setAttribute("aria-controls", `gf-menu-${uid}`);
      const svg = svgEl("svg", {
        class: "gf-glyph gf-glyph--more",
        viewBox: "0 0 30 12",
        "aria-hidden": "true",
      });
      for (const x of [1, 11, 21])
        svg.append(svgEl("rect", { x, y: "1.5", width: "8", height: "9", rx: "3.4" }));
      keyEl.append(svg);
    }
  };

  const renderFiles = () => {
    filesEl.replaceChildren();
    const start = Math.max(0, files.length - MAX_VISIBLE);
    const visible = files.slice(start);
    visible.forEach((file, v) => {
      const id = ids[start + v];
      const slot = visible.length <= 1 ? 0 : (v / (visible.length - 1)) * 2 - 1;
      const jitter = rng(hashString(file.name) + id);
      const item = el("div", "gf-sheet-slot", { role: "listitem" });
      const sheet = el(
        "button",
        `gf-sheet${file.art ? " gf-sheet--art" : ""}${id === dropped ? " gf-sheet--drop" : ""}`,
        {
          type: "button",
        },
      );
      sheet.style.setProperty("--gf-slot", String(slot));
      sheet.style.setProperty("--gf-depth", String(visible.length - 1 - v));
      sheet.style.setProperty("--gf-jx", `${((jitter() - 0.5) * 10).toFixed(2)}px`);
      sheet.style.setProperty("--gf-jr", `${((jitter() - 0.5) * 3.2).toFixed(2)}deg`);
      sheet.style.zIndex = String(v + 1);
      if (file.art) {
        sheet.append(
          artCanvas(
            "gf-sheet-art",
            file.art,
            hashString(file.name) % 997,
            SHEET_W,
            SHEET_H,
            Math.min(density, 1.25),
            1,
          ),
        );
      } else {
        const lines = el("span", "gf-lines", { "aria-hidden": "true" });
        for (const width of ["86%", "92%", "64%", "88%", "42%"]) {
          const line = document.createElement("i");
          line.style.width = width;
          lines.append(line);
        }
        sheet.append(lines);
      }
      const head = el("span", "gf-sheet-head");
      const name = el("span", "gf-sheet-name");
      name.textContent = file.name;
      head.append(name);
      if (file.meta) {
        const m = el("span", "gf-sheet-meta");
        m.textContent = file.meta;
        head.append(m);
      }
      sheet.append(head);
      if (id === dropped) {
        sheet.addEventListener("animationend", () => sheet.classList.remove("gf-sheet--drop"), {
          once: true,
        });
      }
      item.append(sheet);
      filesEl.append(item);
    });
  };

  // geometry follows the room the folder has, at most its natural width
  const layout = (width) => {
    k = width / W;
    density = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1)) * k;
    root.style.width = `${width}px`;
    root.style.height = `${(H + HEADROOM) * k}px`;
    stage.style.transform = `translateY(${HEADROOM * k}px) scale(${k})`;
  };
  root.layout = layout;

  const paintBack = () => {
    backArt.replaceChildren();
    if (config.art !== "none") {
      backArt.append(artCanvas("gf-art", config.art, config.seed, W + 24, H + 24, density, 0));
    }
  };

  hit.addEventListener("click", () => {
    setMenu(false);
    setOpen(!open);
  });

  if (config.action === "add") {
    keyEl.addEventListener("click", () => {
      const id = nextId++;
      files.push({ name: `Untitled ${files.length + 1}`, meta: "Just now" });
      ids.push(id);
      dropped = id;
      bump++;
      front.classList.remove("gf-front--bump");
      void front.offsetWidth;
      front.classList.add("gf-front--bump");
      syncLabels();
      renderFiles();
      renderGlyph();
    });
  } else if (config.action === "more") {
    menuEl = el("div", "gf-menu", {
      id: `gf-menu-${uid}`,
      role: "menu",
      "aria-label": `${config.label} options`,
    });
    const items = [
      { label: () => (open ? "Close folder" : "Open folder"), run: () => setOpen(!open) },
      {
        label: () => "Add a session",
        run: () => {
          files.push({ name: `Untitled ${files.length + 1}`, meta: "Just now" });
          ids.push(nextId++);
          syncLabels();
          renderFiles();
        },
      },
    ];
    for (const item of items) {
      const b = el("button", "gf-menu-item", { type: "button", role: "menuitem" });
      b.disabled = true;
      b.addEventListener("click", () => {
        setMenu(false);
        keyEl.focus();
        item.run();
      });
      menuEl.append(b);
    }
    const refreshLabels = () =>
      [...menuEl.children].forEach((b, i) => (b.textContent = items[i].label()));
    refreshLabels();
    keyEl.addEventListener("click", () => {
      refreshLabels();
      setMenu(!menuOpen);
    });
    menuEl.addEventListener("keydown", (e) => {
      const list = [...menuEl.querySelectorAll("[role=menuitem]")];
      const at = list.indexOf(document.activeElement);
      const go = (i) => {
        e.preventDefault();
        list[(i + list.length) % list.length]?.focus();
      };
      if (e.key === "ArrowDown") go(at + 1);
      else if (e.key === "ArrowUp") go(at - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(list.length - 1);
      else if (e.key === "Tab") setMenu(false);
    });
    tilt.append(menuEl);
  }

  // pointer: light and parallax follow the cursor, no re-renders
  let raf = 0;
  let px = 0;
  let py = 0;
  const writeTilt = () => {
    raf = 0;
    root.style.setProperty("--gf-px", px.toFixed(3));
    root.style.setProperty("--gf-py", py.toFixed(3));
  };
  root.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const rect = root.getBoundingClientRect();
    px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    if (!raf) raf = requestAnimationFrame(writeTilt);
  });
  root.addEventListener("pointerleave", () => {
    px = 0;
    py = 0;
    if (!raf) raf = requestAnimationFrame(writeTilt);
  });

  // Escape and a press outside close whatever is open
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (menuOpen) {
      setMenu(false);
      keyEl?.focus();
    } else if (open) {
      setOpen(false);
      hit.focus();
    }
  });
  document.addEventListener("pointerdown", (e) => {
    const t = e.target;
    if (menuOpen && !menuEl.contains(t) && !keyEl.contains(t)) setMenu(false);
    if (open && !menuOpen && !root.contains(t)) setOpen(false);
  });

  desk.append(root);
  syncLabels();
  renderGlyph();
  return {
    root,
    start(width) {
      layout(width);
      paintBack();
      renderFiles();
    },
    resize(width) {
      layout(width);
    },
  };
}

function initFolders() {
  const desk = document.querySelector(".glass-folders-desk");
  if (!desk) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const widthFor = () => Math.max(220, Math.min(MAX_WIDTH, desk.clientWidth));
  const built = FOLDERS.map((config) => buildFolder(config, desk));
  built.forEach((f) => f.start(widthFor()));

  // each folder assembles itself the first time it is on screen
  const reveal = (f) => f.root.setAttribute("data-entered", "");
  if (reduced || typeof IntersectionObserver === "undefined") {
    built.forEach(reveal);
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          const i = built.findIndex((f) => f.root === entry.target);
          window.setTimeout(() => entry.target.setAttribute("data-entered", ""), i * 140);
        }
      },
      { threshold: 0.25 },
    );
    built.forEach((f) => io.observe(f.root));
  }

  let last = widthFor();
  new ResizeObserver(() => {
    const next = widthFor();
    if (next === last) return;
    last = next;
    built.forEach((f) => f.resize(next));
  }).observe(desk);
}

initFolders();
