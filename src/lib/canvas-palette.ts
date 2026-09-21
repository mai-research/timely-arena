// Canvas needs resolved color values rather than CSS var() expressions.
// Cache by root class so animations don't request computed styles every frame.
let cachedClass: string | undefined;
let cached: Record<string, string> = {};
export function canvasPalette() {
  const root = document.documentElement;
  if (cachedClass !== root.className) {
    const css = getComputedStyle(root);
    cached = Object.fromEntries([
      "background", "foreground", "text-secondary", "graph-background",
      "graph-previous", "graph-new", "graph-repeat", "graph-returned",
      "graph-edge", "graph-traversed",
    ].map(name => [name, css.getPropertyValue(`--${name}`).trim()]));
    cachedClass = root.className;
  }
  return cached;
}
