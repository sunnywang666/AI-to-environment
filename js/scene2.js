/* ============================================================
   云的身体 · 第2段「数字逐级放大」(GSAP ScrollTrigger · pin+scrub)
   每一级配一张可识别的参照插画 + 显性的乘法关系：
   一次查询(微波炉) → ×25亿(城市) → ×365(住宅区) → 全球(国家对比条)
   ============================================================ */

const STAGES = [
  { v: 0.3,  unit: "Wh",  label: "一次查询",            cmp: "≈ 微波炉运行 1 秒",        op: "",                viz: "micro", logWh: Math.log10(0.3),     tick: "一次" },
  { v: 0.75, unit: "GWh", label: "GPT 一天",            cmp: "≈ 一座小城市一天的用电",   op: "× 25 亿次 / 天",  viz: "city",  logWh: Math.log10(0.75e9),  tick: "一天" },
  { v: 274,  unit: "GWh", label: "GPT 一年",            cmp: "≈ 数十万户家庭一年的电",   op: "× 365 天",        viz: "homes", logWh: Math.log10(274e9),   tick: "一年" },
  { v: 448,  unit: "TWh", label: "2025 · 全球所有数据中心", cmp: "≈ 法国全国一年的用电，超过除前 10 名外所有国家", op: "＋ 全世界的数据中心", viz: "bars", logWh: Math.log10(448e12), tick: "全球" },
];

const COUNTRIES = [
  { name: "数据中心", val: 448, dc: true },
  { name: "法国",     val: 445 },
  { name: "英国",     val: 310 },
  { name: "阿根廷",   val: 135 },
];

const LOG_MIN = Math.log10(0.3);
const LOG_MAX = Math.log10(448e12);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const HOME_SVG =
  '<span class="home"><svg viewBox="0 0 18 18"><path d="M9 1.5 L16.5 8 H14 V16.5 H4 V8 H1.5 Z" fill="currentColor"/></svg></span>';

function buildViz(box) {
  // 微波炉
  const micro = `
    <div class="viz viz-micro" data-viz="micro">
      <svg viewBox="0 0 220 140" width="240" height="150">
        <rect x="8" y="14" width="204" height="112" rx="9" fill="none" stroke="#4A4E57" stroke-width="3"/>
        <rect x="22" y="28" width="132" height="84" rx="5" fill="rgba(245,183,49,.10)" stroke="#4A4E57" stroke-width="2"/>
        <circle cx="88" cy="70" r="11" fill="#F5B731"/>
        <rect x="166" y="30" width="36" height="80" rx="4" fill="none" stroke="#4A4E57" stroke-width="2"/>
        <circle cx="184" cy="48" r="3.5" fill="#8A8E96"/>
        <rect x="174" y="62" width="20" height="6" rx="2" fill="#2A2D34"/>
        <rect x="174" y="74" width="20" height="6" rx="2" fill="#2A2D34"/>
      </svg>
    </div>`;

  // 城市天际线
  const heights = [40, 72, 56, 96, 64, 120, 80, 52, 88, 60];
  const city = `<div class="viz viz-city" data-viz="city">${heights
    .map((h) => `<div class="bldg" style="height:${h}px"></div>`)
    .join("")}</div>`;

  // 住宅区（48 户象征“数十万户”）
  const homes = `<div class="viz viz-homes" data-viz="homes">${HOME_SVG.repeat(48)}</div>`;

  // 国家对比条
  const max = Math.max(...COUNTRIES.map((c) => c.val));
  const bars = `<div class="viz viz-bars" data-viz="bars">${COUNTRIES.map(
    (c) => `
      <div class="cbar ${c.dc ? "is-dc" : ""}">
        <span class="cname">${c.name}</span>
        <span class="ctrack"><span class="cfill" data-w="${(c.val / max) * 100}"></span></span>
        <span class="cval">${c.val}<small> TWh</small></span>
      </div>`
  ).join("")}</div>`;

  box.innerHTML = micro + city + homes + bars;
}

export function initScene2() {
  const scene = document.getElementById("escalation");
  if (!scene) return;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  const numEl = document.getElementById("escNum");
  const unitEl = document.getElementById("escUnit");
  const labelEl = document.getElementById("escLabel");
  const cmpEl = document.getElementById("escCmp");
  const opEl = document.getElementById("escOp");
  const fillEl = document.getElementById("escFill");
  const vizBox = document.getElementById("escViz");
  const ticksBox = document.getElementById("escTicks");

  buildViz(vizBox);
  const vizEls = [...vizBox.querySelectorAll(".viz")];
  const vizByKey = Object.fromEntries(vizEls.map((el) => [el.dataset.viz, el]));

  const tickEls = STAGES.map((s) => {
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
  let barsShown = false;

  const fmt = (v) =>
    v < 10 ? v.toFixed(2).replace(/\.?0+$/, "") : Math.round(v).toLocaleString();

  function countTo(target, unit) {
    if (countId) cancelAnimationFrame(countId);
    const t0 = performance.now();
    unitEl.textContent = unit;
    (function step(now) {
      const e = easeOut(Math.min(1, (now - t0) / 500));
      numEl.textContent = fmt(target * e);
      if (e < 1) countId = requestAnimationFrame(step);
      else numEl.textContent = fmt(target);
    })(performance.now());
  }

  function showBars() {
    if (barsShown) return;
    barsShown = true;
    vizBox.querySelectorAll(".cfill").forEach((f, i) => {
      setTimeout(() => (f.style.width = f.dataset.w + "%"), 120 * i);
    });
  }

  function setStage(i) {
    if (i === activeStage) return;
    activeStage = i;
    const s = STAGES[i];

    vizEls.forEach((el) => el.classList.remove("on"));
    vizByKey[s.viz].classList.add("on");

    opEl.textContent = s.op;
    opEl.classList.toggle("show", !!s.op);

    labelEl.textContent = s.label;
    cmpEl.textContent = s.cmp;
    countTo(s.v, s.unit);
    tickEls.forEach((t, k) => t.classList.toggle("on", k <= i));

    if (s.viz === "bars") showBars();
  }

  function render(p) {
    fillEl.style.width = (p * 100).toFixed(1) + "%";
    setStage(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length)));
  }

  if (hasGSAP) {
    ScrollTrigger.create({
      trigger: scene,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => render(self.progress),
    });
    window.addEventListener("load", () => ScrollTrigger.refresh());
  } else {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const r = scene.getBoundingClientRect();
        const denom = r.height - window.innerHeight;
        const p = denom > 0 ? Math.min(1, Math.max(0, -r.top / denom)) : 0;
        render(p);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  render(0);
}
