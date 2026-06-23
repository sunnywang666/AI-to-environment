/* ============================================================
   云的身体 · 入口
   ============================================================ */
import { initReveal } from "./reveal.js";

console.log("[云的身体] Scrollama:", typeof scrollama, " D3:", typeof d3);

document.addEventListener("DOMContentLoaded", initReveal);
// DOMContentLoaded 可能已过（module defer），兜底立即执行一次
if (document.readyState !== "loading") initReveal();
