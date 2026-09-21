import { BondType } from "@/lib/bond-type/engine";
import { FloodType } from "@/lib/flood-type/engine";

export type Mode = "flood" | "bond";

const PLAYBACK_RATE = 0.6;

/** Choose one style on entry and keep it for every cycle of this visit. */
export class TitleAnimation {
  private engine: FloodType | BondType;
  private width = 0;
  private height = 0;

  constructor(private canvas: HTMLCanvasElement, private onMode: (mode: Mode) => void,
    private readonly mode: Mode = Math.random() < 0.5 ? "flood" : "bond") {
    this.engine = this.mode === "flood" ? new FloodType(canvas) : new BondType(canvas);
    onMode(this.mode);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.engine.resize(width, height);
  }

  step(delta: number) {
    if (!this.engine.step(delta * PLAYBACK_RATE)) return;
    this.restart();
  }

  restart() {
    this.engine = this.mode === "flood" ? new FloodType(this.canvas) : new BondType(this.canvas);
    this.engine.resize(this.width, this.height);
    this.onMode(this.mode);
  }

  still() { this.engine.still(); }
  setPointer(x: number, y: number) {
    if (this.engine instanceof FloodType) this.engine.setPointer(x, y);
  }
  clearPointer() {
    if (this.engine instanceof FloodType) this.engine.clearPointer();
  }
}
