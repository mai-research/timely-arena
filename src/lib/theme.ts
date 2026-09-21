export const THEME_KEY = "timely-arena-theme";
export type Theme = "light" | "dark";

// Runs before first paint. Never interpolate user-controlled values into this script.
export const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)})()`;
