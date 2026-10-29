export const THEME_STORAGE_KEY = "lydev-theme";

export type Theme = "light" | "dark";

/**
 * Runs before first paint so the correct theme is applied without a flash.
 * Falls back to the OS preference when the visitor has not chosen one yet.
 */
export const themeInitScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
