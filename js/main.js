/* ============================================================
   云的身体 · 入口
   ============================================================ */
import { initReveal } from "./reveal.js";
import { initSlider } from "./slider.js";
import { initScene2 } from "./scene2.js";

function boot() {
  initReveal();
  initScene2();
  initSlider();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
