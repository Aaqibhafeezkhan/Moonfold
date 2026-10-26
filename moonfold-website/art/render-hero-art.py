# Renders the original halftone landscape in the website hero: a ringed moon over layered
# mountain ranges, drawn as peach dots on a transparent canvas (the hero's cobalt background shows
# through). The moon is Moonfold's own mark (docs/BRAND.md); everything else is generated here from
# a fixed seed, so the art is reproducible and nothing in it comes from another site.
#
#   python art/render-hero-art.py <out-dir>
#
# Writes hero-art-wide.webp (desktop and tablet) and hero-art-tall.webp (phones) to <out-dir>.
# Needs numpy, scipy and Pillow.
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, gaussian_filter1d

PEACH = (246, 197, 156)
PAPER = (247, 244, 237)  # the page colour below the hero, so the foreground hill melts into it
COLOURS = [PEACH, PAPER]

# Moonfold mark geometry in moon radii (scripts/lib/brand-mark.ts).
SHADOW = (0.28, -0.29, 0.745)
RING = (0.02, -0.15, 1.5, 0.3, -21.6)
STAR = (0.9, -0.8, 0.44, 0.29)


def smooth_noise(rng, n, scale, octaves=4):
    out = np.zeros(n, np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        raw = gaussian_filter1d(rng.standard_normal(n + 400).astype(np.float32), scale / (2**o))[200:-200]
        raw /= raw.std() + 1e-6
        out += raw * amp
        total += amp
        amp *= 0.5
    return out / total


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Art:
    def __init__(self, width, height, pitch, seed):
        self.w, self.h, self.pitch = width, height, pitch
        self.rng = np.random.default_rng(seed)
        self.xx = np.arange(width, dtype=np.float32)[None, :]
        self.yy = np.arange(height, dtype=np.float32)[:, None]
        self.field = np.zeros((height, width), np.float32)  # peach intensity 0..1
        self.colour = np.zeros((height, width), np.uint8)  # index into COLOURS
        self.solid = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    # -- layers ------------------------------------------------------------------------------
    def clouds(self, spans, strength):
        """Soft puffy banks, lit on top. spans: (x0, x1, base_y, height) per bank."""
        mask = np.zeros((self.h, self.w), np.float32)
        top = np.full(self.w, 1e9, np.float32)
        for x0, x1, base, height in spans:
            count = max(5, int((x1 - x0) / (height * 0.55)))
            for _ in range(count):
                cx = self.rng.uniform(x0, x1)
                taper = 1 - abs((cx - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2
                r = height * self.rng.uniform(0.3, 0.62) * (0.45 + 0.7 * taper)
                cy = base - r * self.rng.uniform(0.2, 0.9)
                d2 = (self.xx - cx) ** 2 + (self.yy - cy) ** 2
                mask = np.maximum(mask, (d2 <= r * r).astype(np.float32))
            mask[(self.yy > base).repeat(self.w, 1)] = 0
        mask = gaussian_filter(mask, 2.0)
        # Brightness falls from the top edge of each column of cloud.
        col_top = np.argmax(mask > 0.5, axis=0).astype(np.float32)
        depth = np.clip(self.yy - col_top[None, :], 0, None)
        lit = 0.95 * np.exp(-depth / (self.h * 0.05)) + 0.22
        value = np.clip(mask * lit * strength, 0, 1)
        self._lay(value, mask > 0.35, 0)

    def _sheared_noise(self, sx, sy, lean):
        """Anisotropic noise whose creases run down and to the left, like rock folds."""
        extra = int(lean * self.h) + 4
        raw = gaussian_filter(self.rng.standard_normal((self.h, self.w + extra)).astype(np.float32), (sy, sx))
        raw /= raw.std() + 1e-6
        cols = (self.xx + lean * self.yy).astype(np.int32)
        return np.take_along_axis(raw, np.broadcast_to(cols, (self.h, self.w)), axis=1)

    def range(self, peaks, base, detail, scale, lit, dark, fade, colour=0):
        """Mountains. peaks: (x, height, half-width). Relief is shaded as if the moon, up and to
        the right, lit it: faces turned towards it get dense dots, the rest fall back to sparse."""
        n = self.w
        lean = 0.30
        x = np.arange(n, dtype=np.float32)
        tri = np.stack([h * np.clip(1 - np.abs(x - cx) / hw, 0, 1) ** 1.05 for cx, h, hw in peaks])
        jag = smooth_noise(self.rng, n, 6, 3) * 0.6 + smooth_noise(self.rng, n, 28, 3) * 0.4
        crest = tri.max(0) + detail * jag * self.h * 0.013
        ridge = base - crest
        depth = self.yy - ridge[None, :]
        inside = depth >= 0
        # Relief: coarse and fine ridged noise, flattened near the crest so the skyline stays clean.
        coarse = 1 - np.abs(self._sheared_noise(self.w * 0.020, self.h * 0.20, lean))
        fine = 1 - np.abs(self._sheared_noise(self.w * 0.0065, self.h * 0.07, lean))
        z = (0.65 * coarse + 0.35 * fine) * smoothstep(0, 120, depth) * 160 + depth * 0.35
        z = gaussian_filter(z, 1.6)
        gx = np.gradient(z, axis=1)
        gy = np.gradient(z, axis=0)
        slope = gx * 0.85 + gy * 0.35
        slope /= np.percentile(np.abs(slope[inside]), 92) + 1e-6
        face = np.clip(0.5 + 0.55 * slope, 0, 1)
        face = smoothstep(0.12, 0.9, face)
        glow = np.exp(-depth / fade)
        value = (dark + (lit - dark) * face) * (0.50 + 0.50 * glow)
        # A bright rim along the skyline where the peaks catch the light.
        value = np.maximum(value, lit * 0.95 * np.exp(-np.clip(depth, 0, None) / 16) * smoothstep(0.1, 0.5, face + 0.2))
        self._lay(np.clip(value, 0, 1), inside, colour)

    def hills(self, base, amp, scale, rim, body, fade, colour=0, ramp=None):
        """Rolling hills: bright rim along the crest, thinning towards a sparse body. With ramp, the
        body fills to solid by that depth (the foreground hill that melts into the page)."""
        n = self.w
        ridge = base + amp * smooth_noise(self.rng, n, scale, 3)
        depth = self.yy - ridge[None, :]
        rim_i = rim * np.exp(-np.clip(depth, 0, None) / fade)
        value = rim_i + body * (1 - np.exp(-np.clip(depth, 0, None) / (fade * 3)))
        if ramp:
            value = np.maximum(value, smoothstep(0, ramp, depth))
        self._lay(np.clip(value, 0, 1), depth >= 0, colour)
        return ridge

    def _lay(self, value, region, colour):
        self.field = np.where(region, value, self.field)
        self.colour = np.where(region, colour, self.colour).astype(np.uint8)

    def halo(self, cx, cy, radius, strength):
        d = np.hypot(self.xx - cx, self.yy - cy)
        glow = strength * np.clip(1 - d / radius, 0, 1) ** 2
        self.field = np.maximum(self.field, np.where(self.colour == 0, glow, 0).astype(np.float32) * (self.field < 0.02))

    def stars(self, count, region, small, big):
        x0, y0, x1, y1 = region
        for i in range(count):
            x, y = self.rng.uniform(x0, x1), self.rng.uniform(y0, y1)
            if 0.26 * self.w < x < 0.74 * self.w and y < 0.34 * self.h:
                continue
            r = big if i % 9 == 0 else small
            d = np.hypot(self.xx - x, self.yy - y)
            self._solid_disc(x, y, r)

    def _solid_disc(self, x, y, r):
        draw = ImageDraw.Draw(self.solid)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=PEACH + (255,))

    # -- vector marks, drawn solid over the dots ----------------------------------------------
    def mark(self, cx, cy, radius):
        ss = 3
        size = int(radius * 4.2)
        s = size * ss
        c = s / 2
        r = radius * ss
        mask = Image.new("L", (s, s), 0)
        draw = ImageDraw.Draw(mask)
        # Crescent: moon disc minus shadow disc, then a gap cut along the front of the ring.
        draw.ellipse((c - r, c - r, c + r, c + r), fill=255)
        sx, sy, sr = c + SHADOW[0] * r, c + SHADOW[1] * r, SHADOW[2] * r
        draw.ellipse((sx - sr, sy - sr, sx + sr, sy + sr), fill=0)

        def ring_points(half):
            rcx, rcy, rx, ry, ang = RING
            a = math.radians(ang)
            pts = []
            for i in range(721):
                th = math.pi * i / 720 if half == "front" else -math.pi * i / 720
                u, v = rx * math.cos(th), ry * math.sin(th)
                pts.append((c + (rcx + u * math.cos(a) - v * math.sin(a)) * r, c + (rcy + u * math.sin(a) + v * math.cos(a)) * r))
            return pts

        def stroke(image, pts, width, fill):
            d = ImageDraw.Draw(image)
            rad = width / 2
            for x, y in pts[::2]:
                d.ellipse((x - rad, y - rad, x + rad, y + rad), fill=fill)

        gap = 0.19 * r
        stroke(mask, ring_points("front"), gap, 0)
        ring = Image.new("L", (s, s), 0)
        width = 0.075 * r
        # Back half of the ring only shows outside the moon.
        back = Image.new("L", (s, s), 0)
        stroke(back, ring_points("back"), width, 255)
        d = ImageDraw.Draw(back)
        pad = 0.07 * r
        d.ellipse((c - r - pad, c - r - pad, c + r + pad, c + r + pad), fill=0)
        ring.paste(255, mask=back)
        stroke(ring, ring_points("front"), width, 255)
        mask = Image.fromarray(np.maximum(np.array(mask), np.array(ring)))
        # Four-point star.
        sx0, sy0, sh, sw = c + STAR[0] * r, c + STAR[1] * r, STAR[2] * r * 1.1, STAR[3] * r * 1.1
        k = min(sw, sh) * 0.055

        def bez(p0, p1, p2):
            return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in np.linspace(0, 1, 24)]

        top, rgt, bot, lft = (sx0, sy0 - sh), (sx0 + sw, sy0), (sx0, sy0 + sh), (sx0 - sw, sy0)
        poly = (
            bez(top, (sx0 + k, sy0 - k), rgt) + bez(rgt, (sx0 + k, sy0 + k), bot)
            + bez(bot, (sx0 - k, sy0 + k), lft) + bez(lft, (sx0 - k, sy0 - k), top)
        )
        ImageDraw.Draw(mask).polygon(poly, fill=255)
        mask = mask.resize((size, size), Image.LANCZOS)
        layer = Image.new("RGBA", (size, size), PEACH + (0,))
        layer.putalpha(mask)
        self.solid.alpha_composite(layer, (int(cx - size / 2), int(cy - size / 2)))

    def poly(self, points, supersample=3):
        """A solid silhouette (observatory, trees)."""
        ss = supersample
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        x0, y0, x1, y1 = int(min(xs)) - 2, int(min(ys)) - 2, int(max(xs)) + 3, int(max(ys)) + 3
        m = Image.new("L", ((x1 - x0) * ss, (y1 - y0) * ss), 0)
        ImageDraw.Draw(m).polygon([((x - x0) * ss, (y - y0) * ss) for x, y in points], fill=255)
        m = m.resize((x1 - x0, y1 - y0), Image.LANCZOS)
        layer = Image.new("RGBA", m.size, PEACH + (0,))
        layer.putalpha(m)
        self.solid.alpha_composite(layer, (x0, y0))

    def ellipse(self, cx, cy, rx, ry, supersample=3):
        pts = [(cx + rx * math.cos(t), cy + ry * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 64)]
        self.poly(pts, supersample)

    # -- halftone ---------------------------------------------------------------------------
    def render(self):
        p = self.pitch
        field = gaussian_filter(self.field, p * 0.35)
        a = math.radians(45)
        ca, sa = math.cos(a), math.sin(a)
        X = np.broadcast_to(self.xx, (self.h, self.w))
        Y = np.broadcast_to(self.yy, (self.h, self.w))
        u = (X * ca + Y * sa) / p
        v = (-X * sa + Y * ca) / p
        iu, iv = np.round(u), np.round(v)
        best = np.full((self.h, self.w), -1e9, np.float32)
        best_col = np.zeros((self.h, self.w), np.uint8)
        best_r = np.zeros((self.h, self.w), np.float32)
        for du in (-1, 0, 1):
            for dv in (-1, 0, 1):
                cu, cv = iu + du, iv + dv
                cx = (cu * ca - cv * sa) * p
                cy = (cu * sa + cv * ca) * p
                px = np.clip(cx.astype(np.int32), 0, self.w - 1)
                py = np.clip(cy.astype(np.int32), 0, self.h - 1)
                inten = field[py, px]
                # Area-true radius up to a touching dot, then a ramp to full overlap.
                r = np.where(
                    inten < 0.78,
                    p * np.sqrt(np.maximum(inten, 0) / math.pi),
                    p * (0.498 + (inten - 0.78) / 0.22 * 0.30),
                )
                value = r - np.hypot(X - cx, Y - cy)
                better = value > best
                best = np.where(better, value, best)
                best_r = np.where(better, r, best_r)
                best_col = np.where(better, self.colour[py, px], best_col)
        alpha = np.clip(best + 0.5, 0, 1) * np.clip(best_r / 1.0, 0, 1)
        rgba = np.zeros((self.h, self.w, 4), np.uint8)
        for idx, col in enumerate(COLOURS):
            sel = best_col == idx
            for ch in range(3):
                rgba[..., ch][sel] = col[ch]
        rgba[..., 3] = (alpha * 255).astype(np.uint8)
        img = Image.fromarray(rgba, "RGBA")
        img.alpha_composite(self.solid)
        return img


def wide():
    art = Art(2880, 1000, 16, seed=11)
    w, h = art.w, art.h
    art.range(
        [(x * w, ht, hw * w) for x, ht, hw in [(0.02, 180, 0.14), (0.12, 250, 0.16), (0.3, 210, 0.15), (0.46, 260, 0.17), (0.68, 220, 0.16), (0.84, 280, 0.17), (0.98, 200, 0.13)]],
        0.70 * h, 1.0, 5, 0.55, 0.30, 190,
    )
    art.clouds([(0.0, 0.3 * w, 0.69 * h, 150), (0.64 * w, 1.0 * w, 0.65 * h, 160)], 0.8)
    art.range(
        [(x * w, ht, hw * w) for x, ht, hw in [(0.06, 260, 0.12), (0.16, 360, 0.13), (0.27, 300, 0.11), (0.38, 440, 0.15), (0.5, 360, 0.12), (0.61, 490, 0.16), (0.74, 350, 0.13), (0.86, 410, 0.14), (0.96, 290, 0.11)]],
        0.83 * h, 1.15, 5.5, 0.95, 0.40, 280,
    )
    art.clouds([(0.30 * w, 0.68 * w, 0.85 * h, 110), (0.0, 0.2 * w, 0.88 * h, 100), (0.82 * w, 1.0 * w, 0.88 * h, 100)], 0.75)
    art.hills(0.85 * h, 46, 360, 0.80, 0.12, 48)
    art.hills(0.905 * h, 26, 280, 0.0, 0.0, 54, colour=1, ramp=62)
    art.halo(0.82 * w, 0.27 * h, 440, 0.55)
    art.mark(0.82 * w, 0.27 * h, 165)
    art.stars(70, (0.04 * w, 0.02 * h, 0.96 * w, 0.40 * h), 3, 5)
    return art


def tall():
    art = Art(1400, 1180, 14, seed=23)
    w, h = art.w, art.h
    art.range(
        [(x * w, ht, hw * w) for x, ht, hw in [(0.0, 150, 0.22), (0.3, 210, 0.24), (0.62, 190, 0.24), (0.95, 220, 0.22)]],
        0.68 * h, 1.0, 5, 0.55, 0.30, 170,
    )
    art.clouds([(0.0, 0.5 * w, 0.68 * h, 140), (0.6 * w, 1.0 * w, 0.64 * h, 140)], 0.8)
    art.range(
        [(x * w, ht, hw * w) for x, ht, hw in [(0.08, 300, 0.2), (0.3, 400, 0.22), (0.55, 470, 0.24), (0.82, 360, 0.2)]],
        0.82 * h, 1.15, 5.5, 0.95, 0.40, 230,
    )
    art.clouds([(0.1 * w, 0.8 * w, 0.83 * h, 100)], 0.75)
    art.hills(0.85 * h, 46, 260, 0.80, 0.12, 44)
    art.hills(0.915 * h, 24, 220, 0.0, 0.0, 50, colour=1, ramp=60)
    art.halo(0.68 * w, 0.2 * h, 560, 0.5)
    art.mark(0.68 * w, 0.2 * h, 140)
    art.stars(30, (0.04 * w, 0.02 * h, 0.96 * w, 0.30 * h), 3, 5)
    return art


if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for name, build in (("wide", wide), ("tall", tall)):
        img = build().render()
        img.save(out / f"hero-art-{name}.png")
        img.save(out / f"hero-art-{name}.webp", quality=88, alpha_quality=100, method=6)
        print(name, img.size, (out / f"hero-art-{name}.webp").stat().st_size // 1024, "KB")
