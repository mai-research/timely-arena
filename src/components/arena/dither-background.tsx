"use client";

import { useEffect, useRef } from "react";
import { useAnimationFrame, useReducedMotion } from "motion/react";
import { canvasPalette } from "@/lib/canvas-palette";
import { useDarkMode } from "./theme-toggle";

// Keep the threshold grid stationary while the underlying field slowly flows.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const FRAME_INTERVAL = 1000 / 24;

export function DitherBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paint = useRef<((time: number) => void) | null>(null);
  const visible = useRef(false);
  const elapsed = useRef(0);
  const time = useRef(0);
  const dark = useDarkMode();
  const reduced = useReducedMotion();

  useAnimationFrame((_, delta) => {
    if (reduced || !visible.current || document.hidden) return;
    // A backgrounded page resumes at its saved phase, without a sudden jump.
    const dt = Math.min(delta, 100);
    time.current += dt / 1000;
    elapsed.current += dt;
    if (elapsed.current < FRAME_INTERVAL) return;
    elapsed.current %= FRAME_INTERVAL;
    paint.current?.(time.current);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let width = 0, height = 0, columns = 0, rows = 0;
    let weights = new Float32Array(0);
    const spacing = 3;
    const draw = (phase: number) => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = canvasPalette().foreground;
      for (let row = 0; row < rows; row++) {
        const y = row * spacing, ny = y / height;
        const bend = Math.sin(ny * 5 + phase * 0.12) * 1.6;
        for (let col = 0; col < columns; col++) {
          const x = col * spacing, nx = x / width;
          const wave = Math.sin(nx * 7 + ny * 5 + bend - phase * 0.3);
          const fold = Math.cos(nx * 4 - ny * 7 + phase * 0.18);
          const density = Math.max(0, (0.32 + wave * 0.2 + fold * 0.12) * weights[row * columns + col]);
          if (density > (BAYER[(row % 4) * 4 + col % 4] + 0.5) / 16) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    };
    paint.current = draw;
    const resize = () => {
      ({ width, height } = canvas.getBoundingClientRect());
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(width / spacing);
      rows = Math.ceil(height / spacing);
      weights = new Float32Array(columns * rows);
      // Cache the quiet area around the prompt instead of recalculating every frame.
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const nx = col * spacing / width, ny = row * spacing / height;
          const center = Math.exp(-((nx - 0.5) ** 2 / 0.11 + (ny - 0.48) ** 2 / 0.1));
          weights[row * columns + col] = 1 - center * 0.88;
        }
      }
      draw(time.current);
    };
    const observer = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; });
    observer.observe(canvas);
    intersection.observe(canvas);
    resize();
    return () => { observer.disconnect(); intersection.disconnect(); paint.current = null; };
  }, [dark, reduced]);

  return <canvas ref={canvasRef} className="landing-dither" aria-hidden="true" />;
}
