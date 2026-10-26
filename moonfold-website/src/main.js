/**
 * Moonfold Website — Client Runtime
 * Handles navigation, the demo reel with modal player, the hero flickering
 * grid, glass folder cards, and the halftone wordmark canvas.
 */

// ---------------------------------------------------------------------------
// 1. Immersive fullscreen navigation
// ---------------------------------------------------------------------------
const fsToggle = document.querySelector(".fs-toggle");
const fsNav = document.querySelector("#fs-nav");
const fsHeader = document.querySelector("#fs-header");
const mainEl = document.getElementById("main");
const footerEl = document.querySelector(".site-footer");
let fsCleanupTimer = null;

function fsLockPage(locked) {
  for (const el of [mainEl, footerEl]) {
    if (el) el.toggleAttribute("inert", locked);
  }
}

function fsOpenNav() {
  if (!fsToggle || !fsNav) return;
  clearTimeout(fsCleanupTimer);
  document.body.classList.remove("fs-nav-closing");
  document.body.classList.add("fs-nav-open", "fs-locked");
  fsToggle.setAttribute("aria-expanded", "true");
  fsToggle.setAttribute("aria-label", "Close navigation");
  fsNav.setAttribute("aria-hidden", "false");
  fsLockPage(true);
}

function fsCloseNav(keepLock) {
  if (!fsToggle || !fsNav) return;
  if (!document.body.classList.contains("fs-nav-open")) return;
  document.body.classList.remove("fs-nav-open");
  document.body.classList.add("fs-nav-closing");
  fsToggle.setAttribute("aria-expanded", "false");
  fsToggle.setAttribute("aria-label", "Open navigation");
  fsNav.setAttribute("aria-hidden", "true");
  if (!keepLock) {
    document.body.classList.remove("fs-locked");
    fsLockPage(false);
  }
  fsCleanupTimer = setTimeout(() => {
    document.body.classList.remove("fs-nav-closing", "fs-locked");
    fsLockPage(false);
  }, 1600);
}

// Nav labels turn into rolling characters; the real text stays for readers.
for (const link of [...document.querySelectorAll(".fs-links a")]) {
  const label = link.textContent.trim();
  const roll = document.createElement("span");
  roll.className = "fs-roll";
  roll.setAttribute("aria-hidden", "true");
  [...label].forEach((char, index) => {
    const piece = document.createElement("span");
    if (char === " ") {
      piece.className = "nv-space";
    } else {
      piece.className = "nv-char";
      const inner = document.createElement("i");
      inner.dataset.c = char;
      inner.style.transitionDelay = `${index * 14}ms`;
      piece.appendChild(inner);
    }
    roll.appendChild(piece);
  });
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = label;
  link.textContent = "";
  link.append(roll, sr);
}

if (fsToggle && fsNav) {
  fsToggle.addEventListener("click", () => {
    if (document.body.classList.contains("fs-nav-open")) {
      fsCloseNav(true);
    } else {
      fsOpenNav();
    }
  });

  fsNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) fsCloseNav(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("fs-nav-open")) {
      fsCloseNav(true);
      fsToggle.focus();
    }
  });
}

// The fixed header flips light/dark over dark sections (manifesto, closing).
if (fsHeader) {
  const darkSections = [...document.querySelectorAll("[data-fs-dark]")];
  if (darkSections.length) {
    const darkVisible = new Set();
    const darkObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            darkVisible.add(entry.target);
          } else {
            darkVisible.delete(entry.target);
          }
        }
        fsHeader.classList.toggle("fs-dark", darkVisible.size > 0);
      },
      { rootMargin: "0px 0px -93% 0px", threshold: 0 },
    );
    for (const section of darkSections) darkObserver.observe(section);
  }
}

// ---------------------------------------------------------------------------
// 2. Demo Reel: Ambient Tile Playback & Modal Player
// ---------------------------------------------------------------------------
const demoModal = document.querySelector("#demo-modal");
const demoModalVideo = document.querySelector("#demo-modal-video");
const demoModalTitle = document.querySelector(".demo-modal-title");
const demoModalClose = document.querySelector(".demo-modal-close");
const demoTiles = [...document.querySelectorAll(".demo-tile")];
let demoOpener = null;
const demoTilesInView = new Set();

function isMotionReduced() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playDemoTile(tile) {
  if (!isMotionReduced())
    tile
      .querySelector("video")
      ?.play()
      .catch(() => {});
}

function pauseDemoTile(tile) {
  tile.querySelector("video")?.pause();
}

const demoTileObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const tile = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
        demoTilesInView.add(tile);
        if (demoModal && demoModal.hidden) playDemoTile(tile);
      } else {
        demoTilesInView.delete(tile);
        pauseDemoTile(tile);
      }
    }
  },
  { threshold: [0, 0.35] },
);
demoTiles.forEach((tile) => demoTileObserver.observe(tile));

function openDemoModal(src, title, opener) {
  if (!demoModal || !demoModalVideo) return;
  demoOpener = opener || null;
  demoTiles.forEach(pauseDemoTile);
  if (demoModalTitle) demoModalTitle.textContent = title || "";
  demoModalVideo.src = src;
  demoModal.hidden = false;
  document.body.classList.add("demo-modal-open");
  demoModalVideo.load();
  demoModalVideo.play().catch(() => {});
  demoModalClose?.focus();
}

function closeDemoModal() {
  if (!demoModal || demoModal.hidden) return;
  demoModalVideo.pause();
  demoModalVideo.removeAttribute("src");
  demoModalVideo.load();
  demoModal.hidden = true;
  document.body.classList.remove("demo-modal-open");
  (demoOpener || demoTiles[0])?.focus();
  demoOpener = null;
}

document.querySelectorAll("[data-demo]").forEach((node) => {
  node.addEventListener("click", () => {
    openDemoModal(node.getAttribute("data-demo"), node.getAttribute("data-demo-title"), node);
  });
});

demoModalClose?.addEventListener("click", closeDemoModal);

demoModal?.addEventListener("click", (event) => {
  if (event.target.closest(".demo-modal-frame")) return;
  closeDemoModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !demoModal.hidden) {
    closeDemoModal();
  }
});

const yearEl = document.querySelector("#year");
if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

// ---------------------------------------------------------------------------
// 3. Glass Folder Cards: 3D Perspective Tilt, Open/Close & Artwork Painting
// ---------------------------------------------------------------------------
const ART_PALETTES = {
  aurora: ["#22395e", "#6f97c2", "#e9c2b8", "#c2433f", "#2a1e2a"],
  ember: ["#07090c", "#16252c", "#3d5f68", "#a3201a", "#ef4a2b", "#ff8a5c"],
  dusk: ["#120c18", "#3e2850", "#8f6c9c", "#b3502f", "#eab08a"],
  verdant: ["#070b08", "#173024", "#4f7a5a", "#a7843a", "#e9cf87"],
};

function renderFolderArt(canvas, presetName) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const colors = ART_PALETTES[presetName] || ART_PALETTES.aurora;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  colors.forEach((c, i) => {
    grad.addColorStop(i / (colors.length - 1), c);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft marbling curves
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.filter = "blur(18px)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(
      w * (0.2 + 0.6 * Math.sin(i * 1.7)),
      h * (0.3 + 0.5 * Math.cos(i * 2.1)),
      w * 0.45,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = colors[(i * 2) % colors.length];
    ctx.fill();
  }
  ctx.restore();
}

document.querySelectorAll(".gf-root").forEach((folder) => {
  // Paint canvas artwork for back panel and sheets
  folder.querySelectorAll("canvas.gf-art, canvas.gf-sheet-art").forEach((canvas) => {
    const artName = canvas.getAttribute("data-art") || folder.getAttribute("data-art") || "aurora";
    renderFolderArt(canvas, artName);
  });

  // Pointer tracking for tilt and specular shine
  let raf = 0;
  let px = 0;
  let py = 0;
  const writeTilt = () => {
    raf = 0;
    folder.style.setProperty("--gf-px", px.toFixed(3));
    folder.style.setProperty("--gf-py", py.toFixed(3));
  };

  folder.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const rect = folder.getBoundingClientRect();
    px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    if (!raf) raf = requestAnimationFrame(writeTilt);
  });

  folder.addEventListener("pointerleave", () => {
    px = 0;
    py = 0;
    if (!raf) raf = requestAnimationFrame(writeTilt);
  });

  // Open / Close toggle via hit area
  const hitBtn = folder.querySelector(".gf-hit");
  const folderLabel = folder.querySelector(".gf-title")?.textContent || "Folder";
  const folderMeta = folder.querySelector(".gf-meta")?.textContent || "";

  if (hitBtn) {
    hitBtn.addEventListener("click", () => {
      const isOpen = folder.hasAttribute("data-open");
      if (isOpen) {
        folder.removeAttribute("data-open");
        hitBtn.setAttribute("aria-expanded", "false");
        hitBtn.setAttribute("aria-label", `Open ${folderLabel}, ${folderMeta}`);
      } else {
        folder.setAttribute("data-open", "");
        hitBtn.setAttribute("aria-expanded", "true");
        hitBtn.setAttribute("aria-label", `Close ${folderLabel}, ${folderMeta}`);
      }
    });
  }
});

// Escape key to close any open folders
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".gf-root[data-open]").forEach((f) => {
      f.removeAttribute("data-open");
      const hit = f.querySelector(".gf-hit");
      if (hit) hit.setAttribute("aria-expanded", "false");
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Flickering Grid in Hero
// ---------------------------------------------------------------------------
function initHeroGrid() {
  const canvas = document.getElementById("hero-grid-canvas");
  const banner = canvas ? canvas.closest(".hero-banner") : null;
  if (!canvas || !banner) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const squareSize = 5;
  const gridGap = 7;
  const cell = squareSize + gridGap;
  const flickerChance = 0.3; // fraction of cells that re-roll per second
  const maxOpacity = 0.3;
  // Squares are blues out of the logo, with rare deeper navy flashes.
  const blue = [96, 141, 198];
  const deep = [52, 96, 158];

  let w = 0;
  let h = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let squares = new Float32Array(0);
  let tones = new Uint8Array(0);
  let raf = 0;
  let lastTime = 0;
  let inView = false;
  let resizeRaf = 0;

  const roll = (i) => {
    squares[i] = Math.random() * maxOpacity;
    tones[i] = Math.random() < 0.16 ? 1 : 0;
  };

  function drawCell(col, row) {
    const i = col * rows + row;
    ctx.clearRect(col * cell, row * cell, squareSize, squareSize);
    if (squares[i] <= 0.004) return;
    const [r, g, b] = tones[i] ? deep : blue;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${squares[i]})`;
    ctx.fillRect(col * cell, row * cell, squareSize, squareSize);
  }

  function drawAll() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) drawCell(col, row);
    }
  }

  function layout() {
    const rect = banner.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    cols = Math.ceil(w / cell);
    rows = Math.ceil(h / cell);
    const count = cols * rows;
    squares = new Float32Array(count);
    tones = new Uint8Array(count);
    for (let i = 0; i < count; i++) roll(i);
    drawAll();
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    // Only the squares that re-roll this frame get repainted.
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const i = col * rows + row;
        if (Math.random() < flickerChance * dt) {
          roll(i);
          drawCell(col, row);
        }
      }
    }
    if (inView && !reducedMotion) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (raf || !inView || reducedMotion) return;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const resizeObserver = new ResizeObserver(() => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      layout();
    });
  });
  resizeObserver.observe(banner);

  if (!reducedMotion) {
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) wake();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(banner);
  }

  layout();
}

// ---------------------------------------------------------------------------
// 5. Favorites Marquee
// ---------------------------------------------------------------------------
function initFavoritesMarquee() {
  const marquee = document.querySelector(".marquee-inner");
  if (!marquee) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const observer = new IntersectionObserver(
    ([entry]) => marquee.classList.toggle("is-offscreen", !entry.isIntersecting),
    { threshold: 0 },
  );
  observer.observe(marquee);
}

// ---------------------------------------------------------------------------
// 6. Halftone Wordmark Canvas in Footer
// ---------------------------------------------------------------------------
function initHalftoneFooter() {
  const canvas = document.getElementById("halftone-footer-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let px = -1e5;
  let py = -1e5;
  let raf = 0;
  let awake = true;
  let ring = { x: 0, y: 0, t: -1 };

  // Flat array per dot: [x, y, vx, vy, hx, hy, r]
  let dots = new Float32Array(0);
  let count = 0;

  const dotGap = 6;
  const radius = 80;
  const ink = [255, 255, 255]; // White wordmark
  const warm = [255, 90, 31]; // Orange (#ff5a1f) on hover / displacement

  function layout() {
    const rect = canvas.parentElement
      ? canvas.parentElement.getBoundingClientRect()
      : canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // Render offscreen mask to measure letter coverage
    const mask = document.createElement("canvas");
    mask.width = w;
    mask.height = h;
    const m = mask.getContext("2d", { willReadFrequently: true });
    if (!m) return;

    const word = "moonfold";
    const baseSize = 100;
    m.font = `800 ${baseSize}px "Instrument Serif", Georgia, serif`;
    const base = m.measureText(word);
    const baseAscent = base.actualBoundingBoxAscent || baseSize * 0.72;
    const baseDescent = base.actualBoundingBoxDescent || baseSize * 0.22;
    const widthFit = base.width > 0 ? ((w * 0.98) / base.width) * baseSize : 80;
    const heightFit = ((h * 0.98) / (baseAscent + baseDescent)) * baseSize;
    const fitSize = Math.min(widthFit, heightFit);

    m.font = `800 ${fitSize}px "Instrument Serif", Georgia, serif`;
    const box = m.measureText(word);
    const descent = box.actualBoundingBoxDescent || fitSize * 0.22;
    m.fillStyle = "#000";
    m.textAlign = "center";
    m.textBaseline = "alphabetic";
    m.fillText(word, w / 2, h - descent);

    const img = m.getImageData(0, 0, w, h).data;
    const cols = Math.ceil(w / dotGap);
    const rows = Math.ceil(h / dotGap);
    const tmp = [];

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        let sum = 0;
        for (let sy = 0; sy < 3; sy++) {
          for (let sx = 0; sx < 3; sx++) {
            const ix = Math.min(w - 1, Math.floor(gx * dotGap + ((sx + 0.5) * dotGap) / 3));
            const iy = Math.min(h - 1, Math.floor(gy * dotGap + ((sy + 0.5) * dotGap) / 3));
            sum += img[(iy * w + ix) * 4 + 3];
          }
        }
        const cov = sum / (9 * 255);
        if (cov < 0.05) continue;
        const hx = gx * dotGap + dotGap / 2;
        const hy = gy * dotGap + dotGap / 2;
        const r = Math.sqrt(cov) * dotGap * 0.56;
        tmp.push(hx, hy, 0, 0, hx, hy, r);
      }
    }

    dots = new Float32Array(tmp);
    count = tmp.length / 7;
    awake = true;
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const r = !reducedMotion ? radius : 0;
    const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
    const ringR = ringAge * 0.85;
    let moving = false;

    for (let i = 0; i < count; i++) {
      const j = i * 7;
      let x = dots[j];
      let y = dots[j + 1];
      let vx = dots[j + 2];
      let vy = dots[j + 3];
      const hx = dots[j + 4];
      const hy = dots[j + 5];

      if (!reducedMotion) {
        if (ringAge < 800) {
          const dx = hx - ring.x;
          const dy = hy - ring.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const band = 1 - Math.min(1, Math.abs(d - ringR) / 24);
          if (band > 0) {
            const f = band * 3.0 * (1 - ringAge / 800);
            vx += (dx / d) * f;
            vy += (dy / d) * f;
          }
        }

        // Push away from pointer
        const dx = x - px;
        const dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (r > 0 && d2 < r * r) {
          const d = Math.sqrt(d2) + 0.001;
          const f = (1 - d / r) * 2.5;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }

        // Spring back to rest
        vx = (vx + (hx - x) * 0.06) * 0.82;
        vy = (vy + (hy - y) * 0.06) * 0.82;
        x += vx;
        y += vy;

        if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.04) {
          moving = true;
        } else {
          x = hx;
          y = hy;
          vx = 0;
          vy = 0;
        }

        dots[j] = x;
        dots[j + 1] = y;
        dots[j + 2] = vx;
        dots[j + 3] = vy;
      }

      const dist = Math.hypot(x - hx, y - hy);
      const warmth = Math.min(1, dist / 24);
      if (warmth > 0.02) {
        ctx.fillStyle = `rgb(${Math.round(ink[0] + (warm[0] - ink[0]) * warmth)}, ${Math.round(ink[1] + (warm[1] - ink[1]) * warmth)}, ${Math.round(ink[2] + (warm[2] - ink[2]) * warmth)})`;
      } else {
        ctx.fillStyle = `rgba(${ink[0]}, ${ink[1]}, ${ink[2]}, 0.85)`;
      }

      ctx.beginPath();
      ctx.arc(x, y, dots[j + 6], 0, 6.2832);
      ctx.fill();
    }

    awake = moving || ringAge < 800 || px > -1e4;
  }

  function loop(now) {
    raf = 0;
    draw(now);
    if (awake) raf = requestAnimationFrame(loop);
  }

  function wake() {
    awake = true;
    if (!raf) raf = requestAnimationFrame(loop);
  }

  const toLocal = (e) => {
    const b = canvas.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  };

  canvas.addEventListener("pointermove", (e) => {
    const [lx, ly] = toLocal(e);
    px = lx;
    py = ly;
    wake();
  });

  canvas.addEventListener("pointerleave", () => {
    px = -1e5;
    py = -1e5;
    wake();
  });

  canvas.addEventListener("pointerdown", (e) => {
    const [lx, ly] = toLocal(e);
    ring = { x: lx, y: ly, t: performance.now() };
    wake();
  });

  layout();
  draw(performance.now());
  wake();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      layout();
      wake();
    });
  }

  window.addEventListener("resize", () => {
    layout();
    wake();
  });
}

// ---------------------------------------------------------------------------
// 7. Release Downloads: resolve the latest assets from GitHub Releases
// ---------------------------------------------------------------------------
const DOWNLOAD_LATEST_API = "https://api.github.com/repos/Mr-Dark-debug/Moonfold/releases/latest";
const DOWNLOAD_LIST_API = "https://api.github.com/repos/Mr-Dark-debug/Moonfold/releases?per_page=1";
const DOWNLOAD_CACHE_KEY = "moonfold-latest-release";
const DOWNLOAD_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
// Asset name suffixes per desktop-release packaging; filenames carry the
// version, so hrefs must be resolved per release instead of a static URL.
const DOWNLOAD_PATTERNS = {
  "win-x64": /-x64\.exe$/,
  "win-arm64": /-arm64\.exe$/,
  "linux-appimage": /-x86_64\.AppImage$/,
  "linux-deb": /-amd64\.deb$/,
  "mac-arm64": /-arm64\.dmg$/,
  "mac-x64": /-x64\.dmg$/,
};
const downloadMain = document.getElementById("download-main");
const downloadVersion = document.querySelector("[data-download-version]");
const downloadItems = [...document.querySelectorAll("[data-download-pattern]")];
const downloadToggle = document.querySelector(".download-toggle");
const downloadMenu = document.getElementById("download-menu");
const downloadToggleWrap = document.querySelector(".download-toggle-wrap");

function closeDownloadMenu() {
  if (!downloadMenu || !downloadToggle) return;
  downloadMenu.hidden = true;
  downloadToggle.setAttribute("aria-expanded", "false");
}

if (downloadToggle && downloadMenu && downloadToggleWrap) {
  downloadToggle.addEventListener("click", () => {
    const open = !downloadMenu.hidden;
    downloadMenu.hidden = open;
    downloadToggle.setAttribute("aria-expanded", String(!open));
  });

  document.addEventListener("click", (event) => {
    if (!downloadMenu.hidden && !event.target.closest(".download-toggle-wrap")) {
      closeDownloadMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !downloadMenu.hidden) {
      closeDownloadMenu();
      downloadToggle.focus();
    }
  });
}

function assetUrl(release, patternKey) {
  if (!release) return null;
  const pattern = DOWNLOAD_PATTERNS[patternKey];
  if (!pattern) return null;
  const asset = release.assets?.find((candidate) => pattern.test(candidate.name));
  return asset?.browser_download_url ?? null;
}

function applyResolvedRelease(release) {
  if (!release || !release.tag_name) return;
  for (const item of downloadItems) {
    const url = assetUrl(release, item.dataset.downloadPattern);
    if (url) item.href = url;
  }
  if (downloadMain) {
    const windowsUrl = assetUrl(release, "win-x64");
    if (windowsUrl) downloadMain.href = windowsUrl;
  }
  if (downloadVersion) {
    downloadVersion.textContent = `Latest · ${release.tag_name}`;
  }
}

function readReleaseCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(DOWNLOAD_CACHE_KEY));
    if (!cached || Date.now() - cached.at > DOWNLOAD_CACHE_MAX_AGE_MS) return null;
    return cached.release;
  } catch {
    return null;
  }
}

function writeReleaseCache(release) {
  try {
    sessionStorage.setItem(DOWNLOAD_CACHE_KEY, JSON.stringify({ at: Date.now(), release }));
  } catch {
    // Storage can be unavailable (private modes); resolving again next visit is fine.
  }
}

async function initReleaseDownloads() {
  const cached = readReleaseCache();
  if (cached) {
    applyResolvedRelease(cached);
    return;
  }
  let release = null;
  try {
    release = await (
      await fetch(DOWNLOAD_LATEST_API, {
        headers: { Accept: "application/vnd.github+json" },
      })
    ).json();
  } catch {
    release = null;
  }
  // /releases/latest skips prereleases; fall back to the newest listed release
  // so a beta-only repo still gets real download links.
  if (!release || !release.assets?.length) {
    try {
      release = (
        await (
          await fetch(DOWNLOAD_LIST_API, {
            headers: { Accept: "application/vnd.github+json" },
          })
        ).json()
      )?.[0];
    } catch {
      release = null;
    }
  }
  if (!release || !release.assets?.length) {
    if (downloadVersion) downloadVersion.textContent = "Browse all releases";
    return;
  }
  writeReleaseCache(release);
  applyResolvedRelease(release);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initHeroGrid();
    initFavoritesMarquee();
    initHalftoneFooter();
    initReleaseDownloads();
  });
} else {
  initHeroGrid();
  initFavoritesMarquee();
  initHalftoneFooter();
  initReleaseDownloads();
}
