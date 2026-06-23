/* ============================================================
   云的身体 · 第2段「数字逐级放大」(GSAP ScrollTrigger · pin+scrub)
   一次查询 → GPT一天 → GPT一年 → 2025全球数据中心(448TWh ≈ 阿根廷)
   ============================================================ */

const STAGES = [
  { v: 0.3,  unit: "Wh",  label: "一次查询",            cmp: "≈ 微波炉运行 1 秒",            tick: "一次", logWh: Math.log10(0.3) },
  { v: 0.75, unit: "GWh", label: "GPT 一天 · 约 25 亿次提问", cmp: "≈ 一座小城市一天的用电",   tick: "一天", logWh: Math.log10(0.75e9) },
  { v: 274,  unit: "GWh", label: "GPT 一年",            cmp: "≈ 数十万户家庭一年的电",      tick: "一年", logWh: Math.log10(274e9) },
  { v: 448,  unit: "TWh", label: "2025 · 全球所有数据中心", cmp: "≈ 阿根廷全国，超过除前 10 名外所有国家", tick: "全球", logWh: Math.log10(448e12) },
];

const LOG_MIN = Math.log10(0.3);
const LOG_MAX = Math.log10(448e12);

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function initScene2() {
  const scene = document.getElementById("escalation");
  if (!scene || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const numEl = document.getElementById("escNum");
  const unitEl = document.getElementById("escUnit");
  const labelEl = document.getElementById("escLabel");
  const cmpEl = document.getElementById("escCmp");
  const fillEl = document.getElementById("escFill");
  const blobEl = document.getElementById("escBlob");
  const ticksBox = document.getElementById("escTicks");

  // 进度条上的 4 个刻度（按 log 量级定位）
  const tickEls = STAGES.map((s, i) => {
    const pos = (s.logWh - LOG_MIN) / (LOG_MAX - LOG_MIN);
    const t = document.createElement("div");
    t.className = "escal__tick";
    t.style.left = pos * 100 + "%";
    t.innerHTML = `<i></i><span>${s.tick}</span>`;
    ticksBox.appendChild(t);
    return t;
  });

  let activeStage = -1;
  let countId = null;

  function fmt(v) {
    if (v < 10) return v.toFixed(2).replace(/\.?0+$/, "");
    return Math.round(v).toLocaleString();
  }

  function countTo(target, unit) {
    if (countId) cancelAnimationFrame(countId);
    const t0 = performance.now();
    const DUR = 500;
    unitEl.textContent = unit;
    function step(now) {
      const e = easeOut(Math.min(1, (now - t0) / DUR));
      numEl.textContent = fmt(target * e);
      if (e < 1) countId = requestAnimationFrame(step);
      else numEl.textContent = fmt(target);
    }
    countId = requestAnimationFrame(step);
  }

  function setStage(i) {
    if (i === activeStage) return;
    activeStage = i;
    const s = STAGES[i];
    labelEl.textContent = s.label;
    cmpEl.textContent = s.cmp;
    countTo(s.v, s.unit);
    tickEls.forEach((t, k) => t.classList.toggle("on", k <= i));
  }

  function render(p) {
    // 进度条 + 光球随整体进度连续变化
    fillEl.style.width = (p * 100).toFixed(1) + "%";
    const scale = 0.3 + p * 1.7;
    blobEl.style.transform = `scale(${scale.toFixed(3)})`;
    blobEl.style.opacity = (0.5 + p * 0.5).toFixed(2);
    // 离散切换当前量级
    setStage(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length)));
  }

  ScrollTrigger.create({
    trigger: scene,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => render(self.progress),
    onRefreshInit: () => render(0),
  });

  render(0);
}
