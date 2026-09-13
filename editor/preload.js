// preload.js — runs before the editor module to avoid a flash of the wrong
// theme/language. Kept as a classic (non-module) script so it executes
// synchronously in <head>, and external to comply with MV3 CSP (no inline).
(function () {
  try {
    var t = localStorage.getItem("gmh-theme");
    if (t !== "light" && t !== "dark") {
      t =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    }
    document.documentElement.setAttribute("data-theme", t);

    var lang = localStorage.getItem("gmh-lang");
    if (lang !== "zh" && lang !== "en") lang = "en";
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "zh-CN");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.setAttribute("lang", "en");
  }
})();
