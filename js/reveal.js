/* ============================================================
   云的身体 · 滚动揭示（渐隐渐现）+ 贯穿小圆点变形
   进场/出场双阈值模型：块从视口下方进入时淡入、向上离开时淡出，
   停留在中间时保持全亮。修复"首块/末块到不了视口中心、永远半透明"。
   ============================================================ */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ss = (t) => t * t * (3 - 2 * t); // 0..1 平滑

export function initReveal() {
  const sections = [...document.querySelectorAll(".section")];
  const blocks = [];
  const secInfo = [];

  sections.forEach((s) => {
    const bs = [...s.querySelectorAll(":scope > .reading, :scope > .placeholder")];
    bs.forEach((el) => {
      el.classList.add("fade-block");
      blocks.push(el);
    });
    secInfo.push({ s, glyph: s.dataset.glyph || "spin" });
  });

  const glyphEl = document.getElementById("glyph");
  let ticking = false;

  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    const zone = vh * 0.34; // 进/出淡变区高度

    for (const el of blocks) {
      const r = el.getBoundingClientRect();
      // 进场：块顶从视口底部升上来；出场：块底升过视口顶部
      const enter = ss(clamp((vh - r.top) / zone, 0, 1));
      const leave = ss(clamp(r.bottom / zone, 0, 1));
      const o = REDUCED ? 1 : Math.min(enter, leave);
      let ty = 0;
      if (!REDUCED) ty = enter < leave ? (1 - enter) * 18 : -(1 - leave) * 18;
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${ty.toFixed(1)}px)`;
    }

    // glyph 跟随最居中的段落
    const vc = vh / 2;
    let bestState = "spin", bestD = Infinity;
    for (const g of secInfo) {
      const r = g.s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vc) / vh;
      if (d < bestD) { bestD = d; bestState = g.glyph; }
    }
    if (glyphEl) glyphEl.dataset.state = bestState;
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  frame();
}
