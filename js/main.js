/* ============================================================
   云的身体 · 入口
   ============================================================ */
import { initReveal } from "./reveal.js";
import { initSlider } from "./slider.js";

console.log("[云的身体] Scrollama:", typeof scrollama, " D3:", typeof d3);

function boot() {
  initReveal();
  initSlider();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
