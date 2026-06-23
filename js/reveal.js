/* ============================================================
   云的身体 · 滚动揭示（渐隐渐现）+ 贯穿小圆点变形
   按【每个内容块自身位置】计算：块接近视口顶部要划走时淡出，
   从底部进入时淡入；处于阅读舒适区（视口中部）时保持全亮。
   右下角 glyph 跟随当前居中段落切换形态。
   ============================================================ */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function initReveal() {
  const sections = [...document.querySelectorAll(".section")];
  const blocks = [];
  const secInfo = [];

  sections.forEach((s) => {
    const bs = [
      ...s.querySelectorAll(":scope > .reading, :scope > .placeholder"),
    ];
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
    const vc = vh / 2;

    // 逐块淡入淡出
    for (const el of blocks) {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const d = Math.abs(center - vc) / vh; // 0=正中, ~0.5=贴近视口上/下缘

      // 中部 0~22% 全亮；越过 22% 开始淡，到 46%（接近边缘）淡尽
      const o = REDUCED ? 1 : 1 - smoothstep(0.22, 0.46, d);
      const dir = center > vc ? 1 : -1; // 在下方=入场上浮，在上方=出场上移
      const ty = REDUCED ? 0 : dir * (1 - o) * 22;

      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${ty.toFixed(1)}px)`;
    }

    // glyph 跟随最居中的段落
    let bestState = "spin";
    let bestD = Infinity;
    for (const g of secInfo) {
      const r = g.s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vc) / vh;
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
