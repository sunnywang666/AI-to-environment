/* ============================================================
   云的身体 · 滚动揭示（渐隐渐现）+ 贯穿小圆点变形
   每段内容接近视口中心时淡入上浮，离开时淡出；
   右下角 glyph 跟随当前居中段落切换形态。
   ============================================================ */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function initReveal() {
  const sections = [...document.querySelectorAll(".section")];
  const groups = sections.map((s) => ({
    s,
    glyph: s.dataset.glyph || "spin",
    blocks: [...s.querySelectorAll(":scope > .reading, :scope > .placeholder")],
  }));
  groups.forEach((g) => g.blocks.forEach((b) => b.classList.add("fade-block")));

  const glyphEl = document.getElementById("glyph");
  let ticking = false;

  function frame() {
    ticking = false;
    const vh = window.innerHeight;
    const vc = vh / 2;
    let bestState = "spin";
    let bestD = Infinity;

    for (const g of groups) {
      const r = g.s.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const d = Math.abs(center - vc) / vh; // 0 = 正居中

      const o = REDUCED ? 1 : 1 - smoothstep(0.32, 0.82, d);
      const dir = center > vc ? 1 : -1; // 在下方=入场上浮，在上方=出场上移
      const ty = REDUCED ? 0 : dir * (1 - o) * 30;

      for (const b of g.blocks) {
        b.style.opacity = o.toFixed(3);
        b.style.transform = `translateY(${ty.toFixed(1)}px)`;
      }

      if (d < bestD) {
        bestD = d;
        bestState = g.glyph;
      }
    }

    if (glyphEl) glyphEl.dataset.state = bestState;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  frame();
}
