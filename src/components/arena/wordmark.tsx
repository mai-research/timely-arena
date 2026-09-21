"use client";

import { useEffect, useRef, useState } from "react";
import { useDarkMode } from "./theme-toggle";
import { Pause, Play } from "lucide-react";
import { useAnimationFrame, useReducedMotion } from "motion/react";
import { TitleAnimation, type Mode } from "@/lib/title-animation/controller";

export function TitleWordmark() {
  const dark = useDarkMode();
  useEffect(() => { engine.current?.step(0); }, [dark]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<TitleAnimation | null>(null);
  const selectedMode = useRef<Mode | undefined>(undefined);
  const visible = useRef(false);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useAnimationFrame((_, delta) => {
    if (!paused && !reduced && visible.current && !document.hidden) engine.current?.step(delta);
  });

  useEffect(() => {
    const el = canvas.current, wrapper = host.current;
    if (!el || !wrapper) return;
    let active = true;
    const showFallback = () => {
      if (!active) return;
      engine.current = null;
      delete wrapper.dataset.ready;
      wrapper.dataset.fallback = "true";
    };
    const observer = new ResizeObserver(([entry]) => {
      engine.current?.resize(entry.contentRect.width, entry.contentRect.height);
      if (reduced || pausedRef.current) engine.current?.still();
    });
    const intersection = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; }, { threshold: .1 });
    intersection.observe(wrapper);
    void Promise.all([
      document.fonts.load('800 100px "Inter Variable"'),
      document.fonts.load('400 100px "Silkscreen"'),
    ]).then(() => {
      if (!active) return;
      try {
        if (!el.getContext("2d")) throw new Error("Canvas unavailable");
        engine.current = new TitleAnimation(el, mode => {
          selectedMode.current = mode;
          wrapper.dataset.animation = mode;
        }, selectedMode.current);
        const rect = wrapper.getBoundingClientRect();
        engine.current.resize(rect.width, rect.height);
        if (reduced || pausedRef.current) engine.current.still();
        wrapper.dataset.ready = "true";
        observer.observe(wrapper);
      } catch { showFallback(); }
    }).catch(showFallback);
    return () => { active = false; observer.disconnect(); intersection.disconnect(); engine.current = null; delete wrapper.dataset.ready; delete wrapper.dataset.fallback; delete wrapper.dataset.animation; };
  }, [reduced]);

  return <div ref={host} className="wordmark" onPointerMove={e => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    engine.current?.setPointer((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1);
  }} onPointerLeave={() => engine.current?.clearPointer()} onPointerCancel={() => engine.current?.clearPointer()}>
    <h1 className="wordmark-fallback"><span>TIMELY</span><span>ARENA</span></h1>
    <canvas ref={canvas} aria-hidden="true" />
    {<button className="motion-toggle" aria-label={paused ? "Play title animation" : "Pause title animation"} onClick={() => {
      const next = !paused;
      pausedRef.current = next;
      setPaused(next);
      if (next) engine.current?.still();
      else engine.current?.restart();
    }}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}
  </div>;
}
