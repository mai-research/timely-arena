import { canvasPalette } from "@/lib/canvas-palette";
// Adapted from the user-supplied BondType reference; driven by the shared Motion clock.
import {
  BASELINE_1,
  BOND_OFF_BEFORE_HOME,
  BOND_AIR_CELLS,
  BOND_BOW_CELLS,
  BOND_BOW_S,
  BOND_CELL_SCALE,
  BOND_MIN_CELLS,
  BOND_WEIGHT_CELLS,
  BOND_ON_TICK,
  CAP_PIXELS,
  JITTER_CELLS,
  JITTER_EASE_TICKS,
  JITTER_GATE,
  JITTER_S,
  FONT_WEIGHT,
  CAP_H,
  EASE_MOVE,
  EASE_RETURN,
  FPS,
  HOLD_TICKS,
  LINES,
  LINE_PITCH,
  MOVE_TICKS,
  POSES,
  RETURN_TICKS,
  SCATTERS_MAX,
  SCATTERS_MIN,
} from "./params";

interface Letter {
  ch: string;

  x: number;
  y: number;

  left: number;
  right: number;
  top: number;
  bottom: number;

  px: number[];
  py: number[];

  line: number;
  slot: number;
}

function edgeDist(hw: number, hh: number, ux: number, uy: number): number {
  const tx = ux !== 0 ? hw / Math.abs(ux) : Infinity;
  const ty = uy !== 0 ? hh / Math.abs(uy) : Infinity;
  return Math.min(tx, ty);
}

function sample(table: number[], t: number): number {
  if (t <= 0) return table[0];
  const i = Math.floor(t);
  if (i >= table.length - 1) return table[table.length - 1];
  return table[i] + (table[i + 1] - table[i]) * (t - i);
}

export class BondType {
  private ctx: CanvasRenderingContext2D | null;
  private tick = 0;
  private dpr = 1;

  private letters: Letter[] = [];

  private pairs: [number, number][] = [];

  private seq: number[] = [];
  private cycleTicks = 0;
  private font = "";

  private cell = 1;

  private clock = 0;

  readonly ok: boolean;

  constructor(
    private canvas: HTMLCanvasElement,

    private family: string = '"Silkscreen", monospace',
  ) {
    this.ctx = canvas.getContext("2d");
    this.ok = !!this.ctx;
    this.newCycle();
  }

  resize(width: number, height: number) {
    if (!width || !height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.layout();
    this.render(this.tick);
  }

  private layout() {
    const ctx = this.ctx;
    if (!ctx) return;
    const H = this.canvas.height;
    const W = this.canvas.width;

    ctx.font = `${FONT_WEIGHT} 100px ${this.family}`;
    const probe = ctx.measureText("H");
    const capAt100 = probe.actualBoundingBoxAscent || 72;
    const widest = Math.max(...LINES.map(word => ctx.measureText(word).width));
    const size = Math.min((CAP_H * H * 100) / capAt100, W * 0.54 * 100 / widest);
    this.font = `${FONT_WEIGHT} ${size}px ${this.family}`;
    ctx.font = this.font;
    this.cell = this.measureCell(size, CAP_H * H) * BOND_CELL_SCALE;

    this.letters = [];
    this.pairs = [];

    LINES.forEach((word, li) => {
      const baseline = (BASELINE_1 + li * LINE_PITCH) * H;
      const total = ctx.measureText(word).width;
      const lineLeft = (W - total) / 2;
      const start = this.letters.length;

      for (let i = 0; i < word.length; i++) {
        const x = lineLeft + ctx.measureText(word.slice(0, i)).width;
        const m = ctx.measureText(word[i]);
        this.letters.push({
          ch: word[i],
          x,
          y: baseline,
          left: -(m.actualBoundingBoxLeft || 0),
          right: m.actualBoundingBoxRight || m.width,
          top: -(m.actualBoundingBoxAscent || size * 0.5),
          bottom: m.actualBoundingBoxDescent || 0,
          px: [],
          py: [],
          line: li,
          slot: i,
        });

        if (i > 0) this.pairs.push([start + i - 1, start + i]);
      }

      const ls = this.letters.slice(start);
      const cx = (l: Letter) => l.x + (l.left + l.right) / 2;
      const typesetCenter = (cx(ls[0]) + cx(ls[ls.length - 1])) / 2;
      const resample = (values: number[], u: number) => sample(values, u * (values.length - 1));
      POSES.forEach((pose) => {
        // Resample the reference's five-letter contours for both brand-word lengths.
        const gaps = Array.from({ length: ls.length - 1 }, (_, i) =>
          resample(pose.gaps[li], i / Math.max(1, ls.length - 2)) * H);
        const margin = Math.max(this.cell * 4, W * 0.05);
        const firstHalf = (ls[0].right - ls[0].left) / 2;
        const lastHalf = (ls[ls.length - 1].right - ls[ls.length - 1].left) / 2;
        const rawSpan = gaps.reduce((sum, gap) => sum + gap, 0);
        const span = Math.min(rawSpan, W - 2 * margin - firstHalf - lastHalf);
        const scale = span / rawSpan;
        const center = Math.max(margin + firstHalf + span / 2,
          Math.min(W - margin - lastHalf - span / 2, typesetCenter + pose.shift[li] * H));
        let x = center - span / 2;
        ls.forEach((l, i) => {
          if (i > 0) x += gaps[i - 1] * scale;
          l.px.push(x - cx(l));
          const dy = resample(pose.dy[li], i / (ls.length - 1)) * H;
          // Keep each line inside its own half, including its ink bounds and twitch.
          const pad = this.cell * 3;
          const low = (li === 0 ? pad : H * 0.51) - l.top;
          const high = (li === 0 ? H * 0.49 : H - pad) - l.bottom;
          l.py.push(Math.max(low, Math.min(high, l.y + dy)) - l.y);
        });
      });
    });
  }

  private measureCell(fontSize: number, capPx: number): number {
    const fallback = Math.max(1, Math.round(capPx / CAP_PIXELS));
    try {
      const w = Math.ceil(fontSize * 4);
      const h = Math.ceil(fontSize * 1.6);
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const o = off.getContext("2d", { willReadFrequently: true });
      if (!o) return fallback;
      o.fillStyle = "#000";
      o.fillRect(0, 0, w, h);
      o.fillStyle = "#fff";
      o.font = `${FONT_WEIGHT} ${fontSize}px ${this.family}`;
      o.textBaseline = "alphabetic";
      o.fillText("HIEL", 4, h * 0.8);
      const runs: number[] = [];

      for (const fy of [0.45, 0.55, 0.65]) {
        const y = Math.floor(h * 0.8 - capPx * fy);
        if (y < 0 || y >= h) continue;
        const d = o.getImageData(0, y, w, 1).data;
        let run = 0;
        for (let x = 0; x < w; x++) {
          if (d[x * 4] > 127) run++;
          else {
            if (run > 0) runs.push(run);
            run = 0;
          }
        }
        if (run > 0) runs.push(run);
      }
      if (!runs.length) return fallback;
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
      let g = runs[0];
      for (const r of runs) g = gcd(g, r);

      return g >= 2 ? g : fallback;
    } catch {
      return fallback;
    }
  }

  private newCycle() {
    const n =
      SCATTERS_MIN +
      Math.floor(Math.random() * (SCATTERS_MAX - SCATTERS_MIN + 1));
    const seq: number[] = [];
    let last = -1;
    for (let k = 0; k < n; k++) {
      let p = Math.floor(Math.random() * POSES.length);

      if (p === last) p = (p + 1) % POSES.length;
      seq.push(p);
      last = p;
    }
    this.seq = seq;
    this.cycleTicks = seq.length * MOVE_TICKS + RETURN_TICKS + HOLD_TICKS;
  }

  private offsetAt(l: Letter, t: number): [number, number] {
    const moves = this.seq.length;
    const scatterEnd = moves * MOVE_TICKS;

    if (t < scatterEnd) {
      const k = Math.min(moves - 1, Math.floor(t / MOVE_TICKS));
      const local = t - k * MOVE_TICKS;

      const p = sample(EASE_MOVE, local * (EASE_MOVE.length - 1) / MOVE_TICKS);
      const from = k === 0 ? [0, 0] : [l.px[this.seq[k - 1]], l.py[this.seq[k - 1]]];
      const to = [l.px[this.seq[k]], l.py[this.seq[k]]];
      return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
    }

    const local = t - scatterEnd;
    if (local >= RETURN_TICKS) return [0, 0];
    const p = sample(
      EASE_RETURN,
      local * (EASE_RETURN.length - 1) / RETURN_TICKS,
    );
    const last = this.seq[moves - 1];
    return [l.px[last] * (1 - p), l.py[last] * (1 - p)];
  }

  private unrest(t: number): number {
    const on = BOND_ON_TICK;

    const offAt = this.seq.length * MOVE_TICKS;
    if (t <= on || t >= offAt) return 0;
    const e = Math.min(t - on, offAt - t) / JITTER_EASE_TICKS;
    const u = Math.min(1, Math.max(0, e));
    return u * u * (3 - 2 * u);
  }

  private jitter(i: number, amount: number): [number, number] {
    if (JITTER_CELLS <= 0 || amount <= 0) return [0, 0];

    if (amount < 0.5) return [0, 0];
    const w = (Math.PI * 2) / JITTER_S;
    const sy = Math.sin(this.clock * w + i * 2.9);
    if (Math.abs(sy) >= JITTER_GATE) {
      return [0, Math.sign(sy) * JITTER_CELLS * this.cell];
    }
    const sx = Math.sin(this.clock * w * 0.73 + i * 1.7);
    if (Math.abs(sx) >= JITTER_GATE) {
      return [Math.sign(sx) * JITTER_CELLS * this.cell, 0];
    }
    return [0, 0];
  }

  private render(t: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const H = this.canvas.height;
    const W = this.canvas.width;

    const palette = canvasPalette();
    ctx.clearRect(0, 0, W, H);
    ctx.font = this.font;
    ctx.fillStyle = palette.foreground;

    const unrest = this.unrest(t);
    const off = this.letters.map((l, i) => {
      const [ox, oy] = this.offsetAt(l, t);
      const [jx, jy] = this.jitter(i, unrest);
      return [ox + jx, oy + jy] as [number, number];
    });
    this.letters.forEach((l, i) => {
      ctx.fillText(l.ch, l.x + off[i][0], l.y + off[i][1]);
    });

    const on = BOND_ON_TICK;
    const offAt =
      this.seq.length * MOVE_TICKS + RETURN_TICKS - BOND_OFF_BEFORE_HOME;
    if (t < on || t > offAt) return;

    const cen: [number, number][] = this.letters.map((l, i) => [
      l.x + (l.left + l.right) / 2 + off[i][0],
      l.y + (l.top + l.bottom) / 2 + off[i][1],
    ]);

    ctx.fillStyle = palette.foreground;
    const cell = this.cell;
    for (const [ia, ib] of this.pairs) {
      const A = this.letters[ia];
      const B = this.letters[ib];
      const dx = cen[ib][0] - cen[ia][0];
      const dy = cen[ib][1] - cen[ia][1];
      const L = Math.hypot(dx, dy);
      if (L < 1) continue;
      const ux = dx / L;
      const uy = dy / L;
      const ea = edgeDist((A.right - A.left) / 2, (A.bottom - A.top) / 2, ux, uy);
      const eb = edgeDist((B.right - B.left) / 2, (B.bottom - B.top) / 2, ux, uy);

      const free = L - ea - eb;
      const air = BOND_AIR_CELLS * cell;
      const usable = free - 2 * air;
      const n = Math.floor(usable / cell);
      if (n < BOND_MIN_CELLS) continue;

      const s0 = ea + air + (usable - n * cell) / 2;

      const bow =
        BOND_BOW_CELLS *
        cell *
        Math.sin(this.clock * ((Math.PI * 2) / BOND_BOW_S) + ia * 1.1);

      const nx = -uy;
      const ny = ux;
      for (let k = 0; k < n; k++) {
        const d = s0 + (k + 0.5) * cell;

        const e = n > 1 ? Math.sin((Math.PI * (k + 0.5)) / n) : 0;
        const px = cen[ia][0] + ux * d + nx * bow * e;
        const py = cen[ia][1] + uy * d + ny * bow * e;

        const w = BOND_WEIGHT_CELLS * cell;
        ctx.fillRect(
          Math.round((px - w / 2) / cell) * cell,
          Math.round((py - w / 2) / cell) * cell,
          w,
          w,
        );
      }
    }
  }

  step(delta: number): boolean {
    const seconds = Math.min(delta / 1000, 0.05);
    this.tick += seconds * FPS;
    this.clock += seconds;
    if (this.tick >= this.cycleTicks) {
      this.still();
      return true;
    }
    this.render(this.tick);
    return false;
  }

  still() {
    this.render(this.cycleTicks - 1);
  }
}
