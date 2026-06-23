/* ============================================================
   云的身体 · 入口
   ============================================================ */
import { initReveal } from "./reveal.js";
import { initSlider } from "./slider.js";
import { initScene2 } from "./scene2.js";
import { initChat } from "./chat.js";
import { initJevons, initRanking } from "./charts.js";

function boot() {
  initChat();
  initReveal();
  initScene2();
  initSlider();
  initRanking();
  initJevons();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
