"use client";

import { useEffect, useRef } from "react";
import { layout, prepare } from "@chenglou/pretext";

/** Shared measurement for native input and response text; the browser retains selection and accessibility. */
export function PretextText({ text, input = false }: { text: string; input?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    const element = container?.firstElementChild as HTMLElement | null;
    if (!container || !element) return;
    let active = true;
    let observer: ResizeObserver | undefined;
    void document.fonts.ready.then(() => {
      if (!active) return;
      const style = getComputedStyle(element);
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const prepared = prepare(text, font, { whiteSpace: "pre-wrap" });
      const lineHeight = parseFloat(style.lineHeight);
      const measure = (width: number) => {
        const result = layout(prepared, Math.max(1, width), lineHeight);
        if (input) element.style.height = `${Math.ceil(result.height) + 2}px`;
        else element.style.minHeight = `${Math.ceil(result.height)}px`;
        element.dataset.pretextLines = String(result.lineCount);
      };
      observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
      observer.observe(container);
    });
    return () => { active = false; observer?.disconnect(); };
  }, [text, input]);

  return <div ref={ref} className="pretext-container">
    {input ? <textarea className="pretext-copy" aria-label="Clinical case prompt" value={text} readOnly spellCheck={false} />
      : <p className="pretext-copy response-copy">{text}</p>}
  </div>;
}

export function OutputText({ text }: { text: string }) {
  return <PretextText text={text} />;
}
