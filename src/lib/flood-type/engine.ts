import { canvasPalette } from "@/lib/canvas-palette";
// Adapted from the supplied FloodType reference. One global clock drives every glyph.
export const SCALE = [0, .008, .02, .04, .075, .14, .29, .56, .8, .94, 1.02, 1.058, 1.045, 1.022, 1.006, 1];
const ENTER = [0, .021, .052, .104, .196, .372, .632, .826, .951, 1.021, 1.043, 1.032, 1.013, 1];
const ROTATE = [0, 0, .08, .269, .461, .613, .715, .804, .865, .918, .941, .968, .99, 1];
const FALL = [0, .01, .022, .036, .057, .085, .122, .169, .226, .302, .407, .555, .778, 1];
const ENTER_END = 17, HOLD_TICKS = 90;
const ZOOM_START = ENTER_END + HOLD_TICKS, ZOOM_TICKS = 22;
const EXIT_START = ZOOM_START + 18, EXIT_TICKS = 15, CYCLE = EXIT_START + 20;
export function sample(table: readonly number[], u: number) {
  if (!table.length) return 0;
  if (!(u > 0) || table.length === 1) return table[0];
  if (u >= 1) return table[table.length - 1];
  const x = u * (table.length - 1), i = Math.floor(x);
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}
interface Glyph {
  ch: string; x: number; y: number; px: number; py: number;
  settle: number; spin: number; tumble: number; turn: number; depth: number; delay: number; spread: number;
  lastX: number; lastY: number;
}
interface Draw { g: Glyph; x: number; y: number; sc: number; face: number; angle: number; vx: number; vy: number; }

export class FloodType {
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private px = 0; private half = 0;
  private glyphs: Glyph[] = []; private slots: Draw[] = [];
  private tick = 0; private waited = 0;
  private pointer = false; private targetX = 0; private targetY = 0; private leanX = 0; private leanY = 0;
  private family = '"Inter Variable", sans-serif';
  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    this.ctx = ctx;
  }
  setPointer(x: number, y: number) { this.pointer = true; this.targetX = Math.max(-1, Math.min(1, x)); this.targetY = Math.max(-1, Math.min(1, y)); }
  clearPointer() { this.pointer = false; this.targetX = this.targetY = 0; }
  resize(width: number, height: number) {
    if (!width || !height) return;
    this.w = width; this.h = height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * ratio); this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.layout(); this.draw(1);
  }
  private layout() {
    const ctx = this.ctx, lines = ["TIMELY", "ARENA"];
    const tracked = (text: string, px: number) => [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) - .055 * px * (text.length - 1);
    ctx.font = `800 100px ${this.family}`;
    const cap = ctx.measureText("H").actualBoundingBoxAscent || 72;
    this.px = Math.min(this.w * .56 * 100 / Math.max(...lines.map(l => tracked(l, 100))), this.h * .24 * 100 / cap);
    ctx.font = `800 ${this.px}px ${this.family}`;
    const pitch = cap * this.px / 100 * 1.2;
    const metrics = lines.map(l => ctx.measureText(l));
    const top = -pitch / 2 - metrics[0].actualBoundingBoxAscent;
    const bottom = pitch / 2 + metrics[1].actualBoundingBoxDescent;
    const mid = (top + bottom) / 2;
    this.half = (bottom - top) / 2;
    let seed = 42;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const spin = (max: number) => (random() > .5 ? 1 : -1) * max * random() ** 2.6;
    this.glyphs = [];
    lines.forEach((line, index) => {
      let pen = -tracked(line, this.px) / 2;
      for (const ch of line) {
        const m = ctx.measureText(ch);
        this.glyphs.push({ ch, x: pen, y: (index ? pitch / 2 : -pitch / 2) - mid,
          px: (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2,
          py: (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2,
          settle: spin(95), spin: spin(130), tumble: spin(200), turn: random() > .5 ? 95 : -95,
          depth: random() * 2 - 1, delay: 0, spread: 0, lastX: NaN, lastY: NaN });
        pen += m.width - .055 * this.px;
      }
    });
    const max = Math.max(...this.glyphs.map(g => Math.abs(g.x + g.px)));
    this.glyphs.forEach(g => { g.spread = (g.x + g.px) / max; g.delay = (1 - Math.abs(g.spread)) * 3; });
    this.slots = this.glyphs.map(g => ({ g, x: 0, y: 0, sc: 1, face: 1, angle: 0, vx: 0, vy: 0 }));
  }
  still() {
    this.tick = ENTER_END + 12; this.leanX = this.leanY = 0;
    this.glyphs.forEach(g => { g.lastX = g.lastY = NaN; }); this.draw(1);
  }
  step(delta: number): boolean {
    const dt = Math.min(delta / 1000, .05), ticks = dt * 30;
    const k = 1 - Math.exp(-dt / .13);
    this.leanX += (this.targetX - this.leanX) * k; this.leanY += (this.targetY - this.leanY) * k;
    if (this.pointer && this.tick >= ZOOM_START - 2 && this.tick < ZOOM_START && this.waited < 34) this.waited += ticks;
    else this.tick += ticks;
    const complete = this.tick >= CYCLE;
    if (complete) { this.tick %= CYCLE; this.waited = 0; this.glyphs.forEach(g => { g.lastX = g.lastY = NaN; }); }
    this.draw(ticks);
    return complete;
  }
  private draw(dt: number) {
    const ctx = this.ctx;
    if (!this.w) return;
    const palette = canvasPalette();
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = palette.foreground; ctx.font = `800 ${this.px}px ${this.family}`;
    const zoomU = (this.tick - ZOOM_START) / ZOOM_TICKS;
    const zoom = sample(SCALE, zoomU), rot = sample(ROTATE, zoomU), scale = 1 + 1.2 * zoom;
    const drop = sample(FALL, (this.tick - EXIT_START) / EXIT_TICKS);
    const fall = drop * (this.h / 2 + this.half * scale * 1.1 + this.px * scale);
    let count = 0;
    for (const g of this.glyphs) {
      const arrival = sample(ENTER, (this.tick - g.delay) / 14);
      const face = Math.cos((g.turn * (1 - Math.max(0, arrival) ** 2.5) + g.tumble * drop) * Math.PI / 180);
      if (Math.abs(face) < .02) { g.lastX = g.lastY = NaN; continue; }
      const sc = scale * (1 + g.depth * .08 * (.35 + .65 * zoom));
      const lean = this.tick >= ENTER_END ? Math.max(0, 1 - zoom) * .035 * (1 + g.depth * .6) : 0;
      const x = this.w / 2 + (g.x + g.px) * scale * (1 - .1 * zoom) + g.spread * drop * this.w * .16 + this.leanX * lean * this.w;
      const y = this.h / 2 + (g.y + g.py) * scale + fall - (1 - arrival) * (this.h / 2 + this.half) + this.leanY * lean * this.h;
      const slot = this.slots[count++];
      slot.g = g; slot.x = x; slot.y = y; slot.sc = sc; slot.face = face; slot.angle = (g.settle * rot + g.spin * drop) * Math.PI / 180;
      slot.vx = Number.isNaN(g.lastX) ? 0 : x - g.lastX; slot.vy = Number.isNaN(g.lastY) ? 0 : y - g.lastY;
      g.lastX = x; g.lastY = y;
    }
    for (let i = 1; i < count; i++) {
      const slot = this.slots[i]; let j = i - 1;
      while (j >= 0 && this.slots[j].sc > slot.sc) { this.slots[j + 1] = this.slots[j]; j--; }
      this.slots[j + 1] = slot;
    }
    const stamp = (d: Draw, back: number) => {
      ctx.save(); ctx.translate(d.x - d.vx * back, d.y - d.vy * back); ctx.rotate(d.angle); ctx.scale(d.sc * d.face, d.sc);
      ctx.fillText(d.g.ch, -d.g.px, -d.g.py); ctx.restore();
    };
    for (let i = 0; i < count; i++) {
      const d = this.slots[i];
      if (Math.hypot(d.vx, d.vy) > this.w * .038 * Math.max(dt, .001)) for (let k = 3; k > 0; k--) stamp(d, k / 3 * .85);
      stamp(d, 0);
    }
  }
}
