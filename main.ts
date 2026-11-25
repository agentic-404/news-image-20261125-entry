// main.ts — "The World in One Day" — Wednesday 25 November 2026.
// A front-page news poster for the news-image-20261125 competition.
// Everything is drawn from code: a small PNG encoder, a 5x7 bitmap font,
// vector pictograms, a hero scene, a world-map strip and a UTC timeline.
// Node 22 stdlib only (node:fs, node:path, node:zlib). No network, no
// timestamps, no randomness — two runs write byte-identical PNGs.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

export const W = 1024;
export const H = 1024;

// ---------------------------------------------------------------------------
// Colours (RGB triples)
// ---------------------------------------------------------------------------
export const PAPER: RGB = [246, 241, 226]; // warm newspaper paper
export const INK: RGB = [25, 25, 25]; // near-black ink
export const GREY: RGB = [96, 96, 90]; // secondary text
export const LIGHT: RGB = [216, 210, 192]; // hairlines / dividers
export const RED: RGB = [179, 39, 30]; // hero + Middle East accent
export const BLUE: RGB = [31, 78, 121]; // Europe accent
export const TEAL: RGB = [14, 124, 107]; // Asia-Pacific accent
export const PURPLE: RGB = [107, 78, 158]; // Tech accent
export const ORANGE: RGB = [217, 123, 41]; // Economy accent
export const GREEN: RGB = [62, 122, 46]; // World / climate accent
export const SKY: RGB = [191, 211, 227]; // hero sky
export const SEA: RGB = [23, 69, 107]; // hero sea
export const MAPSEA: RGB = [232, 238, 242]; // map background
export const LAND: RGB = [127, 163, 181]; // map land
export const WHITE: RGB = [255, 255, 255];

export type RGB = [number, number, number];

// ---------------------------------------------------------------------------
// CRC32 (PNG chunk checksums)
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

// Encode an RGB buffer (W*H*3) as a whole, deterministic PNG (filter 0).
export function encodePNG(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const rowStart = y * (w * 3 + 1);
    raw[rowStart] = 0; // filter: none
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), rowStart + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Canvas — a flat RGB pixel buffer with vector drawing primitives
// ---------------------------------------------------------------------------
export class Canvas {
  w: number;
  h: number;
  buf: Uint8Array;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 3] = bg[0];
      this.buf[i * 3 + 1] = bg[1];
      this.buf[i * 3 + 2] = bg[2];
    }
  }

  px(x: number, y: number, c: RGB): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    const o = (yi * this.w + xi) * 3;
    this.buf[o] = c[0];
    this.buf[o + 1] = c[1];
    this.buf[o + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const o = (yy * this.w + xx) * 3;
        this.buf[o] = c[0];
        this.buf[o + 1] = c[1];
        this.buf[o + 2] = c[2];
      }
    }
  }

  // 1px outline rectangle.
  frame(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }

  circle(cx: number, cy: number, r: number, c: RGB): void {
    const r2 = r * r;
    for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) {
      for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
        const dx = xx - cx;
        const dy = yy - cy;
        if (dx * dx + dy * dy <= r2) this.px(xx, yy, c);
      }
    }
  }

  ring(cx: number, cy: number, r: number, c: RGB, t = 1): void {
    const r2 = r * r;
    const ri = Math.max(0, r - t);
    const ri2 = ri * ri;
    for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) {
      for (let xx = Math.floor(cx - r); xx <= Math.ceil(cx + r); xx++) {
        const dx = xx - cx;
        const dy = yy - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2 && d2 > ri2) this.px(xx, yy, c);
      }
    }
  }

  // Bresenham line; thickness t draws a t x t square at each step.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    const half = Math.floor(t / 2);
    for (;;) {
      this.rect(ax - half, ay - half, t, t, c);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }

  // Scanline fill for a simple polygon (even-odd rule).
  poly(points: Array<[number, number]>, c: RGB): void {
    if (points.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.ceil(xs[k]);
        const xb = Math.floor(xs[k + 1]);
        for (let x = xa; x <= xb; x++) this.px(x, y, c);
      }
    }
  }

  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    this.poly(
      [
        [x0, y0],
        [x1, y1],
        [x2, y2],
      ],
      c,
    );
  }

  // Starburst with alternating outer / inner radius (for explosions).
  star(cx: number, cy: number, rOut: number, rIn: number, points: number, c: RGB): void {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOut : rIn;
      const a = (i * Math.PI) / points - Math.PI / 2;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    this.poly(pts, c);
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase, digits, punctuation). Each glyph is 7 rows;
// each row is a 5-bit number, bit 4 = leftmost pixel. Drawn by me, from
// scratch, for this poster — no font file is read anywhere.
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [15, 16, 16, 16, 16, 16, 15],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [15, 16, 16, 23, 17, 17, 14],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [31, 4, 4, 4, 4, 4, 31],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 25, 21, 19, 19, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [30, 1, 1, 14, 1, 1, 30],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [14, 16, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 4, 4, 4],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 1, 14],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 0, 12, 8],
  ":": [0, 12, 0, 0, 0, 12, 0],
  ";": [0, 12, 0, 0, 0, 12, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 14, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "%": [25, 25, 2, 4, 8, 19, 19],
  "+": [0, 4, 4, 31, 4, 4, 0],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "=": [0, 0, 31, 0, 31, 0, 0],
  "*": [0, 4, 21, 14, 21, 4, 0],
  $: [4, 15, 20, 14, 5, 30, 4],
};

// Character advance in pixels at a given scale (5px glyph + 1px gap).
export function charAdvance(scale: number): number {
  return 5 * scale + scale;
}

export function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * charAdvance(scale) - scale;
}

// Draw one line of text (uppercase only — input is uppercased here).
export function drawText(cv: Canvas, x: number, y: number, s: string, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          cv.rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += charAdvance(scale);
  }
}

// Centre a line of text inside [x0, x1].
export function drawTextCentred(cv: Canvas, x0: number, x1: number, y: number, s: string, scale: number, c: RGB): void {
  const w = textWidth(s, scale);
  drawText(cv, x0 + Math.floor((x1 - x0 - w) / 2), y, s, scale, c);
}

// Greedy word wrap to a maximum pixel width. Returns lines (never empty).
export function wrapText(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines.length > 0 ? lines : [""];
}

// ---------------------------------------------------------------------------
// Pictograms — one small vector scene per story, drawn in a 24x24 box at
// (x, y). All icons use the same canvas primitives; each is a few shapes.
// ---------------------------------------------------------------------------
type IconFn = (cv: Canvas, x: number, y: number, c: RGB) => void;

const ICONS: Record<string, IconFn> = {
  // Rocket / missile: body, nose cone, fins, flame.
  rocket(cv, x, y, c) {
    cv.poly(
      [
        [x + 12, y + 1],
        [x + 17, y + 8],
        [x + 17, y + 15],
        [x + 12, y + 18],
        [x + 7, y + 15],
        [x + 7, y + 8],
      ],
      c,
    );
    cv.rect(x + 10, y + 8, 4, 4, PAPER);
    cv.tri(x + 7, y + 14, x + 2, y + 19, x + 7, y + 17, c);
    cv.tri(x + 17, y + 14, x + 22, y + 19, x + 17, y + 17, c);
    cv.tri(x + 10, y + 19, x + 14, y + 19, x + 12, y + 23, [217, 106, 23]);
  },
  // Tower block with antenna and windows.
  tower(cv, x, y, c) {
    cv.rect(x + 6, y + 6, 12, 17, c);
    cv.rect(x + 11, y + 1, 2, 5, c);
    cv.circle(x + 12, y + 1, 2, c);
    cv.rect(x + 9, y + 10, 2, 2, PAPER);
    cv.rect(x + 13, y + 10, 2, 2, PAPER);
    cv.rect(x + 9, y + 15, 2, 2, PAPER);
    cv.rect(x + 13, y + 15, 2, 2, PAPER);
    cv.rect(x + 9, y + 20, 2, 2, PAPER);
    cv.rect(x + 13, y + 20, 2, 2, PAPER);
  },
  // Crosshair: ring + cross + centre dot.
  crosshair(cv, x, y, c) {
    cv.ring(x + 12, y + 12, 9, c, 2);
    cv.line(x + 12, y + 1, x + 12, y + 7, c, 2);
    cv.line(x + 12, y + 17, x + 12, y + 23, c, 2);
    cv.line(x + 1, y + 12, x + 7, y + 12, c, 2);
    cv.line(x + 17, y + 12, x + 23, y + 12, c, 2);
    cv.circle(x + 12, y + 12, 2, c);
  },
  // Shield with a check mark.
  shield(cv, x, y, c) {
    cv.poly(
      [
        [x + 4, y + 3],
        [x + 20, y + 3],
        [x + 20, y + 12],
        [x + 12, y + 22],
        [x + 4, y + 12],
      ],
      c,
    );
    cv.line(x + 8, y + 12, x + 11, y + 15, PAPER, 2);
    cv.line(x + 11, y + 15, x + 17, y + 8, PAPER, 2);
  },
  // Quadcopter drone: body + 4 rotors.
  drone(cv, x, y, c) {
    cv.rect(x + 9, y + 10, 6, 4, c);
    cv.circle(x + 12, y + 12, 2, PAPER);
    cv.line(x + 4, y + 5, x + 9, y + 10, c, 1);
    cv.line(x + 20, y + 5, x + 15, y + 10, c, 1);
    cv.line(x + 4, y + 19, x + 9, y + 14, c, 1);
    cv.line(x + 20, y + 19, x + 15, y + 14, c, 1);
    cv.rect(x + 1, y + 4, 7, 2, c);
    cv.rect(x + 16, y + 4, 7, 2, c);
    cv.rect(x + 1, y + 18, 7, 2, c);
    cv.rect(x + 16, y + 18, 7, 2, c);
  },
  // Ship / tanker on waves.
  ship(cv, x, y, c) {
    cv.poly(
      [
        [x + 2, y + 13],
        [x + 22, y + 13],
        [x + 19, y + 19],
        [x + 5, y + 19],
      ],
      c,
    );
    cv.rect(x + 13, y + 6, 6, 7, c);
    cv.rect(x + 15, y + 3, 2, 3, c);
    cv.line(x + 2, y + 22, x + 8, y + 22, BLUE, 1);
    cv.line(x + 12, y + 22, x + 18, y + 22, BLUE, 1);
  },
  // Flame: teardrop with inner flame.
  flame(cv, x, y, c) {
    cv.poly(
      [
        [x + 12, y + 1],
        [x + 18, y + 10],
        [x + 20, y + 16],
        [x + 16, y + 22],
        [x + 8, y + 22],
        [x + 4, y + 16],
        [x + 6, y + 10],
      ],
      c,
    );
    cv.poly(
      [
        [x + 12, y + 11],
        [x + 15, y + 16],
        [x + 14, y + 20],
        [x + 10, y + 20],
        [x + 9, y + 16],
      ],
      [245, 197, 24],
    );
  },
  // Explosion starburst.
  blast(cv, x, y, c) {
    cv.star(x + 12, y + 12, 11, 5, 8, c);
    cv.circle(x + 12, y + 12, 4, [245, 197, 24]);
  },
  // Memorial cross.
  cross(cv, x, y, c) {
    cv.rect(x + 10, y + 3, 4, 18, c);
    cv.rect(x + 5, y + 8, 14, 4, c);
    cv.rect(x + 8, y + 21, 8, 2, c);
  },
  // Signed document: page, lines, seal.
  doc(cv, x, y, c) {
    cv.rect(x + 6, y + 2, 12, 20, c);
    cv.rect(x + 8, y + 5, 8, 2, PAPER);
    cv.rect(x + 8, y + 9, 8, 2, PAPER);
    cv.rect(x + 8, y + 13, 8, 2, PAPER);
    cv.circle(x + 16, y + 18, 3, RED);
  },
  // Jet plane, side view.
  jet(cv, x, y, c) {
    cv.poly(
      [
        [x + 2, y + 12],
        [x + 20, y + 9],
        [x + 22, y + 11],
        [x + 20, y + 13],
        [x + 2, y + 14],
      ],
      c,
    );
    cv.poly(
      [
        [x + 10, y + 12],
        [x + 14, y + 4],
        [x + 17, y + 4],
        [x + 14, y + 12],
      ],
      c,
    );
    cv.poly(
      [
        [x + 10, y + 13],
        [x + 13, y + 20],
        [x + 16, y + 20],
        [x + 14, y + 13],
      ],
      c,
    );
    cv.tri(x + 2, y + 12, x + 5, y + 7, x + 7, y + 12, c);
  },
  // Flood waves: three wavy lines.
  waves(cv, x, y, c) {
    cv.poly(
      [
        [x + 2, y + 7],
        [x + 7, y + 5],
        [x + 12, y + 7],
        [x + 17, y + 5],
        [x + 22, y + 7],
        [x + 22, y + 9],
        [x + 17, y + 7],
        [x + 12, y + 9],
        [x + 7, y + 7],
        [x + 2, y + 9],
      ],
      c,
    );
    cv.poly(
      [
        [x + 2, y + 13],
        [x + 7, y + 11],
        [x + 12, y + 13],
        [x + 17, y + 11],
        [x + 22, y + 13],
        [x + 22, y + 15],
        [x + 17, y + 13],
        [x + 12, y + 15],
        [x + 7, y + 13],
        [x + 2, y + 15],
      ],
      c,
    );
    cv.poly(
      [
        [x + 2, y + 19],
        [x + 7, y + 17],
        [x + 12, y + 19],
        [x + 17, y + 17],
        [x + 22, y + 19],
        [x + 22, y + 21],
        [x + 17, y + 19],
        [x + 12, y + 21],
        [x + 7, y + 19],
        [x + 2, y + 21],
      ],
      c,
    );
  },
  // Satellite: body + two solar panels + dish.
  satellite(cv, x, y, c) {
    cv.rect(x + 10, y + 10, 5, 5, c);
    cv.rect(x + 2, y + 8, 6, 9, c);
    cv.rect(x + 17, y + 8, 6, 9, c);
    cv.line(x + 8, y + 12, x + 10, y + 12, c, 1);
    cv.line(x + 15, y + 12, x + 17, y + 12, c, 1);
    cv.line(x + 12, y + 10, x + 16, y + 5, c, 1);
    cv.circle(x + 17, y + 4, 2, c);
  },
  // Gavel: head + handle.
  gavel(cv, x, y, c) {
    cv.rect(x + 4, y + 4, 12, 5, c);
    cv.rect(x + 3, y + 3, 3, 7, c);
    cv.rect(x + 17, y + 3, 3, 7, c);
    cv.line(x + 9, y + 9, x + 16, y + 18, c, 3);
    cv.line(x + 5, y + 21, x + 20, y + 21, c, 2);
  },
  // Chart: axes + falling line with arrowhead.
  chart(cv, x, y, c) {
    cv.line(x + 3, y + 3, x + 3, y + 21, c, 2);
    cv.line(x + 3, y + 21, x + 21, y + 21, c, 2);
    cv.line(x + 5, y + 7, x + 10, y + 11, c, 2);
    cv.line(x + 10, y + 11, x + 14, y + 10, c, 2);
    cv.line(x + 14, y + 10, x + 20, y + 18, c, 2);
    cv.tri(x + 20, y + 18, x + 17, y + 15, x + 20, y + 14, c);
  },
  // Microchip: square, pins, inner die.
  chip(cv, x, y, c) {
    cv.rect(x + 6, y + 6, 12, 12, c);
    cv.rect(x + 9, y + 9, 6, 6, PAPER);
    for (const px of [8, 12, 16]) {
      cv.rect(x + px, y + 2, 2, 4, c);
      cv.rect(x + px, y + 18, 2, 4, c);
      cv.rect(x + 2, y + px, 4, 2, c);
      cv.rect(x + 18, y + px, 4, 2, c);
    }
  },
  // Server rack: three slots + lights.
  server(cv, x, y, c) {
    cv.rect(x + 6, y + 3, 12, 18, c);
    for (const sy of [6, 11, 16]) {
      cv.rect(x + 8, y + sy, 6, 2, PAPER);
      cv.circle(x + 16, y + sy + 1, 1, [245, 197, 24]);
    }
  },
  // Coin: circle with a dollar sign.
  coin(cv, x, y, c) {
    cv.circle(x + 12, y + 12, 10, c);
    cv.circle(x + 12, y + 12, 7, PAPER);
    drawText(cv, x + 9, y + 8, "$", 1, c);
  },
  // Oil barrel: body + bands.
  barrel(cv, x, y, c) {
    cv.rect(x + 7, y + 3, 10, 18, c);
    cv.rect(x + 6, y + 3, 12, 2, c);
    cv.rect(x + 6, y + 19, 12, 2, c);
    cv.rect(x + 7, y + 10, 10, 2, PAPER);
  },
  // Leaf: two arcs + stem.
  leaf(cv, x, y, c) {
    cv.poly(
      [
        [x + 12, y + 2],
        [x + 20, y + 9],
        [x + 19, y + 18],
        [x + 11, y + 21],
        [x + 5, y + 15],
        [x + 6, y + 7],
      ],
      c,
    );
    cv.line(x + 12, y + 5, x + 10, y + 20, PAPER, 1);
    cv.line(x + 10, y + 20, x + 8, y + 23, c, 1);
  },
  // Badge: star badge with centre dot.
  badge(cv, x, y, c) {
    cv.star(x + 12, y + 11, 10, 7, 5, c);
    cv.circle(x + 12, y + 11, 3, PAPER);
    cv.rect(x + 9, y + 18, 6, 4, c);
  },
  // Ballot box with a checked slip.
  ballot(cv, x, y, c) {
    cv.rect(x + 4, y + 12, 16, 9, c);
    cv.rect(x + 10, y + 8, 4, 4, c);
    cv.line(x + 7, y + 16, x + 10, y + 19, PAPER, 2);
    cv.line(x + 10, y + 19, x + 16, y + 14, PAPER, 2);
    cv.rect(x + 7, y + 3, 10, 5, c);
  },
  // Crown.
  crown(cv, x, y, c) {
    cv.poly(
      [
        [x + 4, y + 18],
        [x + 4, y + 7],
        [x + 9, y + 12],
        [x + 12, y + 4],
        [x + 15, y + 12],
        [x + 20, y + 7],
        [x + 20, y + 18],
      ],
      c,
    );
    cv.circle(x + 12, y + 13, 2, PAPER);
  },
  // Flag on a pole.
  flag(cv, x, y, c) {
    cv.rect(x + 5, y + 3, 2, 19, c);
    cv.poly(
      [
        [x + 7, y + 3],
        [x + 20, y + 3],
        [x + 16, y + 8],
        [x + 20, y + 13],
        [x + 7, y + 13],
      ],
      c,
    );
  },
  // Bomb: round body + fuse + spark.
  bomb(cv, x, y, c) {
    cv.circle(x + 11, y + 14, 8, c);
    cv.line(x + 15, y + 7, x + 19, y + 4, c, 2);
    cv.star(x + 20, y + 3, 4, 2, 4, [245, 197, 24]);
    cv.rect(x + 9, y + 12, 3, 3, PAPER);
  },
};

export function drawIcon(cv: Canvas, name: string, x: number, y: number, c: RGB): void {
  const fn = ICONS[name];
  if (fn) fn(cv, x, y, c);
}

// ---------------------------------------------------------------------------
// The day's news — Wednesday 25 November 2026. All 33 stories are the
// verified set from the brief; titles and sub-labels are my own short
// wording, kept to 23 characters so they fit one line at scale 2.
// Region groups: MIDDLE EAST, EUROPE, ASIA-PACIFIC, TECH, ECONOMY, WORLD.
// ---------------------------------------------------------------------------
export type Story = {
  n: number;
  region: string;
  title: string;
  sub: string;
  icon: string;
};

export const REGION_COLOR: Record<string, RGB> = {
  "MIDDLE EAST": RED,
  EUROPE: BLUE,
  "ASIA-PACIFIC": TEAL,
  TECH: PURPLE,
  ECONOMY: ORANGE,
  WORLD: GREEN,
};

export const STORIES: Story[] = [
  { n: 2, region: "MIDDLE EAST", title: "HOUTHI HITS SAUDI PLANT", sub: "RAS TANURA REFINERY HIT", icon: "rocket" },
  { n: 3, region: "MIDDLE EAST", title: "DRONE HITS RIYADH TOWER", sub: "11 HURT IN KAFD STRIKE", icon: "tower" },
  { n: 4, region: "MIDDLE EAST", title: "ISRAEL KILLS HAMAS CHIEF", sub: "ABUELOUF + WIFE, 2 KIDS", icon: "crosshair" },
  { n: 5, region: "MIDDLE EAST", title: "US WEIGHS IRAN STRIKES", sub: "TEHRAN VOWS ALL MEANS", icon: "shield" },
  { n: 6, region: "MIDDLE EAST", title: "RSF DRONES KILL 19", sub: "20 HURT IN 2 TOWNS", icon: "drone" },
  { n: 7, region: "MIDDLE EAST", title: "UKRAINE HITS WARSHIP", sub: "MERKURY HIT IN BENGHAZI", icon: "ship" },
  { n: 8, region: "EUROPE", title: "DRONES BURN REFINERIES", sub: "SYZRAN + KUIBYSHEV HIT", icon: "flame" },
  { n: 9, region: "EUROPE", title: "RUSSIA HITS ODESA, KYIV", sub: "2 DEAD, 3 HURT IN ODESA", icon: "blast" },
  { n: 10, region: "EUROPE", title: "490,334 TROOPS DEAD", sub: "BBC LEAK SINCE 2022", icon: "cross" },
  { n: 11, region: "EUROPE", title: "POLAND WANTS US TROOPS", sub: "2 AIRSPACE VIOLATIONS", icon: "shield" },
  { n: 12, region: "EUROPE", title: "MERZ: THREAT TO EUROPE", sub: "RUSSIA UPS THE THREAT", icon: "shield" },
  { n: 13, region: "ASIA-PACIFIC", title: "SOLOMONS-AUSTRALIA PACT", sub: "BANS FOREIGN BASES", icon: "doc" },
  { n: 14, region: "ASIA-PACIFIC", title: "SHENZHOU-24 DOCKS 09:56", sub: "1ST PAKISTANI ASTRONAUT", icon: "rocket" },
  { n: 15, region: "ASIA-PACIFIC", title: "RUSSIAN JET IN KOREA", sub: "AIR DEFENCE ZONE BREACH", icon: "jet" },
  { n: 16, region: "ASIA-PACIFIC", title: "BOGOR MINE FLOOD", sub: "6 DEAD, 20 TRAPPED", icon: "waves" },
  { n: 17, region: "ASIA-PACIFIC", title: "CHINA'S STARLINK RIVAL", sub: "QIANFAN SATELLITE NET", icon: "satellite" },
  { n: 18, region: "TECH", title: "HUAWEI GUILTY ON 10/12", sub: "BROOKLYN JURY: FRAUD", icon: "gavel" },
  { n: 19, region: "TECH", title: "KOSPI SINKS 6.16%", sub: "NIKKEI -2.78% TAIEX -5%", icon: "chart" },
  { n: 20, region: "TECH", title: "NVIDIA SHARES FALL 5.9%", sub: "AFTER +31.5% ON MONDAY", icon: "chip" },
  { n: 21, region: "TECH", title: "DELL Q3: RECORD $54.9B", sub: "AI SERVERS +291% YOY", icon: "server" },
  { n: 22, region: "ECONOMY", title: "TRUMP READIES TARIFFS", sub: "16 NATIONS INCL. CHINA", icon: "coin" },
  { n: 23, region: "ECONOMY", title: "OIL DOWN 20% IN NOV.", sub: "WTI $82.51 A BARREL", icon: "barrel" },
  { n: 24, region: "ECONOMY", title: "VENEZUELA DEBT EXPOSED", sub: "PUBLIC DEBT $237.5B", icon: "coin" },
  { n: 25, region: "ECONOMY", title: "US INFLATION 3.8% YOY", sub: "PCE OCT, AS EXPECTED", icon: "chart" },
  { n: 26, region: "WORLD", title: "COP31 TALKS FAIL", sub: "ANTALYA: NO FOSSIL DEAL", icon: "leaf" },
  { n: 27, region: "WORLD", title: "ROHINGYA GENOCIDE", sub: "WORLD COURT VERDICT", icon: "gavel" },
  { n: 28, region: "WORLD", title: "HOSTAGES FREED IN EXITO", sub: "1 KIDNAPPER DEAD", icon: "badge" },
  { n: 29, region: "WORLD", title: "PELTOLA WINS ALASKA", sub: "SULLIVAN CONCEDES", icon: "ballot" },
  { n: 30, region: "WORLD", title: "ROYAL BURGLARY: 2 HELD", sub: "PRINCE WILLIAM'S HOME", icon: "crown" },
  { n: 31, region: "WORLD", title: "INDIA BLOCKS 'COCKROACH'", sub: "BARRED FROM LONDON", icon: "jet" },
  { n: 32, region: "WORLD", title: "REBELS RETREAT IN CONGO", sub: "AFTER HEAVY CLASHES", icon: "flag" },
  { n: 33, region: "WORLD", title: "ARMY TO BLAST CHEMICALS", sub: "DAMAGED STOCKPILE TODAY", icon: "bomb" },
];

// Three columns, balanced by story count; a region group may split across
// two columns (ECONOMY: Tariff + Oil in column B, Venezuela + US economy
// in column C) so no column runs long.
export const COLUMNS: Array<Array<{ header: string | null; story: Story | null }>> = (() => {
  const groups: Array<{ header: string; stories: Story[] }> = [];
  for (const s of STORIES) {
    const g = groups.find((gg) => gg.header === s.region);
    if (g) g.stories.push(s);
    else groups.push({ header: s.region, stories: [s] });
  }
  // Column A: MIDDLE EAST (6) + EUROPE (5) = 11 stories.
  // Column B: ASIA-PACIFIC (5) + TECH (4) + ECONOMY first 2 = 11 stories.
  // Column C: ECONOMY last 2 + WORLD (8) = 10 stories.
  const econ = groups.find((g) => g.header === "ECONOMY")!.stories;
  const colA = [groups[0], groups[1]];
  const colB = [groups[2], groups[3], { header: "ECONOMY", stories: econ.slice(0, 2) }];
  const colC = [{ header: "ECONOMY", stories: econ.slice(2) }, groups[5]];
  const build = (gs: Array<{ header: string; stories: Story[] }>) => {
    const out: Array<{ header: string | null; story: Story | null }> = [];
    for (const g of gs) {
      out.push({ header: g.header, story: null });
      for (const s of g.stories) out.push({ header: null, story: s });
    }
    return out;
  };
  return [build(colA), build(colB), build(colC)];
})();

// ---------------------------------------------------------------------------
// Layout — front page, 1024x1024.
//   masthead  y 14-94   |  hero  y 100-300  |  story grid  y 312-890
//   map + UTC timeline  y 902-976  |  footer  y 984-1016
// ---------------------------------------------------------------------------
const MX = 20; // side margin; content spans x 20..1004
const COL_W = 320;
const COL_X = [20, 352, 684]; // three columns, 12px gutters
const ROW_H = 46;
const HEAD_H = 18;
const GRID_TOP = 312;

function drawMasthead(cv: Canvas): void {
  cv.frame(6, 6, 1012, 1012, INK, 2);
  drawTextCentred(cv, MX, 1004, 14, "THE WORLD IN ONE DAY", 5, INK);
  drawTextCentred(cv, MX, 1004, 56, "WEDNESDAY 25 NOVEMBER 2026", 3, INK);
  cv.rect(MX, 86, 984, 4, RED);
  cv.rect(MX, 93, 984, 1, INK);
}

function drawMine(cv: Canvas, cx: number, cy: number): void {
  cv.circle(cx, cy, 7, INK);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    cv.line(cx + 6 * Math.cos(a), cy + 6 * Math.sin(a), cx + 11 * Math.cos(a), cy + 11 * Math.sin(a), INK, 2);
  }
  cv.circle(cx, cy, 2, PAPER);
}

function drawHero(cv: Canvas): void {
  const x0 = 20;
  const y0 = 100;
  const w = 540;
  const h = 200;
  // Sky and sea.
  cv.rect(x0, y0, w, 118, SKY);
  cv.rect(x0, y0 + 118, w, 82, SEA);
  // Background tanker (smaller, darker, behind).
  cv.rect(90, 186, 240, 14, [58, 74, 90]);
  cv.rect(250, 172, 26, 14, [58, 74, 90]);
  cv.rect(278, 178, 10, 8, [58, 74, 90]);
  // Main tanker: hull, bridge tower, funnel.
  cv.rect(60, 200, 430, 34, [110, 31, 31]);
  cv.rect(60, 200, 430, 3, [140, 48, 48]);
  cv.rect(410, 166, 42, 34, WHITE);
  cv.rect(418, 174, 8, 6, INK);
  cv.rect(432, 174, 8, 6, INK);
  cv.rect(418, 186, 8, 6, INK);
  cv.rect(432, 186, 8, 6, INK);
  cv.rect(452, 176, 20, 24, [40, 40, 40]);
  // Flames on the deck.
  for (const fx of [140, 240, 330]) {
    cv.tri(fx, 200, fx + 12, 200, fx + 6, 184, [232, 106, 23]);
    cv.tri(fx + 3, 200, fx + 9, 200, fx + 6, 190, [245, 197, 24]);
  }
  // Explosion above the tanker + smoke.
  cv.circle(258, 104, 12, [138, 138, 138]);
  cv.circle(300, 92, 14, [110, 110, 110]);
  cv.circle(342, 106, 11, [138, 138, 138]);
  cv.star(300, 142, 44, 20, 8, [232, 106, 23]);
  cv.star(300, 142, 26, 12, 8, [245, 197, 24]);
  cv.circle(300, 142, 10, RED);
  // Sea mines.
  drawMine(cv, 120, 262);
  drawMine(cv, 300, 272);
  drawMine(cv, 452, 258);
  // Wave lines on the sea.
  cv.line(30, 250, 90, 250, [200, 220, 235], 2);
  cv.line(180, 258, 250, 258, [200, 220, 235], 2);
  cv.line(360, 252, 430, 252, [200, 220, 235], 2);
  cv.line(480, 266, 540, 266, [200, 220, 235], 2);
  cv.frame(x0, y0, w, h, INK, 2);

  // Hero text, right of the illustration.
  const tx = 580;
  drawText(cv, tx, 108, "STRAIT OF HORMUZ", 2, RED);
  drawText(cv, tx, 132, "TANKERS ABLAZE", 4, INK);
  drawText(cv, tx, 166, "IN HORMUZ", 4, INK);
  const sub = wrapText("TWO OIL TANKERS HIT BY SEA MINES - EXPLOSIONS AND FIRE ABOARD.", 2, 424);
  sub.forEach((line, i) => drawText(cv, tx, 206 + i * 18, line, 2, INK));
  drawText(cv, tx, 206 + sub.length * 18 + 10, "IRGC BLAMED; OIL PRICES SLIDE.", 2, BLUE);
  // Story number badge.
  cv.rect(tx, 272, 40, 26, RED);
  drawText(cv, tx + 8, 278, "01", 2, WHITE);
}

function drawGrid(cv: Canvas): void {
  for (let ci = 0; ci < 3; ci++) {
    const x = COL_X[ci];
    let y = GRID_TOP;
    const items = COLUMNS[ci];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.header !== null) {
        const col = REGION_COLOR[item.header];
        cv.rect(x, y, COL_W, HEAD_H, col);
        drawText(cv, x + 8, y + 2, item.header, 2, WHITE);
        y += HEAD_H + 6;
        continue;
      }
      const s = item.story!;
      const col = REGION_COLOR[s.region];
      drawIcon(cv, s.icon, x, y + 2, col);
      const num = String(s.n).padStart(2, "0");
      const nw = textWidth(num, 1);
      drawText(cv, x + Math.floor((24 - nw) / 2), y + 28, num, 1, RED);
      drawText(cv, x + 30, y + 4, s.title, 2, INK);
      drawText(cv, x + 30, y + 24, s.sub, 2, GREY);
      const next = items[i + 1];
      if (next && next.story !== null) cv.rect(x, y + ROW_H - 2, COL_W, 1, LIGHT);
      y += ROW_H;
    }
  }
}

const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [
    [25, 12],
    [60, 6],
    [95, 10],
    [110, 18],
    [100, 30],
    [80, 38],
    [55, 42],
    [35, 35],
    [20, 25],
  ],
  // South America
  [
    [88, 40],
    [115, 42],
    [125, 50],
    [118, 58],
    [100, 60],
    [88, 52],
  ],
  // Europe
  [
    [172, 12],
    [185, 6],
    [198, 10],
    [200, 18],
    [190, 24],
    [175, 22],
  ],
  // Africa
  [
    [172, 26],
    [195, 24],
    [210, 30],
    [205, 45],
    [195, 55],
    [180, 50],
    [170, 38],
  ],
  // Asia
  [
    [205, 10],
    [240, 5],
    [290, 8],
    [330, 12],
    [325, 25],
    [300, 35],
    [260, 40],
    [230, 35],
    [210, 25],
  ],
  // Australia
  [
    [295, 46],
    [320, 44],
    [332, 50],
    [325, 56],
    [300, 57],
    [292, 52],
  ],
];

// Story locations on the map (map-box coords, x = lon + 180, y = (75 - lat) / 130 * 64).
const MAP_DOTS: Array<[number, number]> = [
  [236, 24], // Hormuz
  [227, 25], // Riyadh
  [215, 21], // Gaza
  [211, 12], // Kyiv
  [340, 41], // Solomon Islands
  [296, 17], // Beijing
  [307, 18], // Seoul
  [287, 40], // Bogor / Jakarta
  [105, 32], // Cartagena
  [195, 39], // Kinshasa
];

function drawMapAndTimeline(cv: Canvas): void {
  // World map strip.
  drawText(cv, 20, 902, "WHERE IT HAPPENED", 1, GREY);
  const mx = 20;
  const my = 912;
  cv.rect(mx, my, 360, 64, MAPSEA);
  for (const poly of CONTINENTS) {
    const pts = poly.map(([px, py]): [number, number] => [mx + px, my + py]);
    cv.poly(pts, LAND);
  }
  for (const [dx, dy] of MAP_DOTS) cv.circle(mx + dx, my + dy, 3, RED);
  cv.frame(mx, my, 360, 64, GREY, 1);

  // UTC timeline.
  drawText(cv, 400, 902, "THE DAY IN UTC", 1, GREY);
  const tx0 = 400;
  const tx1 = 1004;
  const barY = 924;
  cv.rect(tx0, barY, tx1 - tx0, 3, INK);
  for (const h of [0, 6, 12, 18, 24]) {
    const x = tx0 + Math.round(((tx1 - tx0) * h) / 24);
    cv.line(x, barY - 3, x, barY + 6, INK, 2);
    const lab = String(h).padStart(2, "0");
    drawText(cv, x - Math.floor(textWidth(lab, 1) / 2), 944, lab, 1, GREY);
  }
  const event = (hour: number, label: string, above: boolean) => {
    const x = tx0 + Math.round(((tx1 - tx0) * hour) / 24);
    cv.circle(x, barY + 1, 4, RED);
    const lw = textWidth(label, 1);
    const ly = above ? 912 : 932;
    drawText(cv, x - Math.floor(lw / 2), ly, label, 1, INK);
  };
  event(7, "HORMUZ TANKERS", true);
  event(9.93, "09:56 SHENZHOU DOCKS", false);
  event(19, "COP31 FAILS", true);
}

function drawFooter(cv: Canvas): void {
  cv.rect(MX, 984, 984, 2, INK);
  drawTextCentred(cv, MX, 1004, 990, "ALL STORIES FROM WEDNESDAY 25 NOVEMBER 2026 - AS REPORTED", 2, INK);
  drawTextCentred(cv, MX, 1004, 1006, "33 STORIES - 6 REGIONS - 1024 X 1024", 1, GREY);
}

export function buildPoster(): Canvas {
  const cv = new Canvas(W, H, PAPER);
  drawMasthead(cv);
  drawHero(cv);
  drawGrid(cv);
  drawMapAndTimeline(cv);
  drawFooter(cv);
  return cv;
}

function main(): void {
  const cv = buildPoster();
  const png = encodePNG(W, H, cv.buf);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
