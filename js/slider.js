/* ============================================================
   云的身体 · 第5段「口径」(GSAP ScrollTrigger · pin+scrub)
   滚动驱动状态变化（非拖动控件）：
   只算冷却 0.32ml → +发电 519ml → +芯片全生命周期(无公认数据)
   水瓶水位/数字随滚动跳变，揭示"数字是被口径制造的"。
   ============================================================ */

const STOPS = [
  { step: "只算现场冷却", label: "只算现场冷却", ml: 0.32, ratio: "基准 ×1",
    desc: "厂商口径：只统计数据中心机房里、为给服务器降温而直接蒸发的水。OpenAI 的 Sam Altman 给出 0.32ml，Google 给出 0.26ml——都画在这条边界上。",
    src: "来源：Sam Altman 博客 (2025) · Google 环境报告（仅现场冷却）" },
  { step: "＋发电的间接用水", label: "＋ 发电的间接用水", ml: 519, ratio: "× 约 1600",
    desc: "再加上为这台服务器发电时、发电厂冷却所消耗的水。学术口径（UC Riverside）测算一次约 100 词的生成综合耗水约 519ml——一整瓶矿泉水。",
    src: "来源：UC Riverside / CACM 2025（含发电间接用水）" },
  { step: "＋芯片制造全生命周期", label: "＋ 芯片制造全生命周期", ml: null, ratio: "无人统计",
    desc: "再加上制造这块 GPU 芯片、建厂、冷却系统在整个生命周期里的水——目前没有任何公认数据。冰山最大的那部分，根本没被算进账。",
    src: "来源：无统一公开口径（MIT Technology Review 指出尚无公认测量方法）" },
];

const WATER_BOTTOM = 405, WATER_TOP_FULL = 90;
const WATER_RANGE = WATER_BOTTOM - WATER_TOP_FULL;
const MIN_FRAC = 0.012;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const fracFor = (ml) => (ml == null ? 1 : Math.max(MIN_FRAC, Math.min(1, ml / 519)));
const levelY = (f) => WATER_BOTTOM - f * WATER_RANGE;

export function initSlider() {
  const stage = document.getElementById("caliberStage");
  if (!stage) return;

  const wavePath = "M-160 0 q 35 -8 70 0 t 70 0 t 70 0 t 70 0 t 70 0 t 70 0 t 70 0 t 70 0 V 380 H -160 Z";
  const bottlePath = "M85 50 L135 50 L135 78 Q165 86 165 120 L165 392 Q165 410 147 410 L73 410 Q55 410 55 392 L55 120 Q55 86 85 78 Z";

  stage.innerHTML = `
    <div class="slider-widget">
      <div class="slider-viz">
        <div class="bottle-stage">
          <svg viewBox="0 0 220 440" aria-hidden="true">
            <defs><clipPath id="bottleClip"><path d="${bottlePath}"/></clipPath></defs>
            <rect class="bottle-cap-ring" x="83" y="44" width="54" height="10" rx="3"/>
            <rect class="bottle-cap" x="88" y="20" width="44" height="26" rx="5"/>
            <g clip-path="url(#bottleClip)">
              <g id="waterGroup">
                <rect class="water-body" x="40" y="0" width="140" height="380"/>
                <path class="wave wave--back" d="${wavePath}"/>
                <path class="wave wave--front" d="${wavePath}"/>
                <circle class="bubble" cx="92" cy="120" r="3"/>
                <circle class="bubble" cx="120" cy="180" r="2.4"/>
                <circle class="bubble" cx="135" cy="90" r="2"/>
              </g>
            </g>
            <path class="bottle-gloss" d="M70 120 q-8 100 0 270 h10 q-8 -170 0 -270 z"/>
            <path class="bottle-outline" d="${bottlePath}"/>
            <text class="bottle-q" id="bottleQ" x="110" y="230" text-anchor="middle">?</text>
          </svg>
        </div>
        <div class="slider-readout">
          <div class="monument"><span id="mlNum">0.32</span><span class="unit">ml</span></div>
          <div class="ratio" id="mlRatio">基准 ×1</div>
        </div>
      </div>

      <div class="slider-explain">
        <div class="cs-steps" id="csSteps"></div>
        <p class="boundary-label" id="bLabel"></p>
        <p class="boundary-desc" id="bDesc"></p>
        <p class="source" id="bSrc"></p>
        <aside class="slider-note">
          <strong>为什么各家的总量永远对不上？</strong>
          因为没有人被要求把边界画在同一个地方。厂商只报机房里看得见的那点水，
          学术界把发电、制造一路算进去——同一件事，于是有了相差上千倍的两个"真相"。
        </aside>
        <div class="cs-cue" id="csCue">向下滚动，逐层加上被忽略的水 ↓</div>
      </div>
    </div>`;

  const $ = (id) => stage.querySelector(id);
  const waterGroup = $("#waterGroup");
  const qMark = $("#bottleQ");
  const mlNum = $("#mlNum");
  const mlRatio = $("#mlRatio");
  const bLabel = $("#bLabel");
  const bDesc = $("#bDesc");
  const bSrc = $("#bSrc");
  const stepsBox = $("#csSteps");
  const cue = $("#csCue");

  STOPS.forEach((s) => {
    const d = document.createElement("div");
    d.className = "cs-step";
    d.textContent = s.step;
    stepsBox.appendChild(d);
  });
  const stepEls = [...stepsBox.children];

  let current = -1, animId = null, cueHidden = false;

  function setStop(i) {
    if (i === current) return;
    const from = STOPS[current] || STOPS[0];
    const to = STOPS[i];
    current = i;

    stepEls.forEach((el, k) => {
      el.classList.toggle("passed", k <= i);
      el.classList.toggle("is-active", k === i);
    });
    bLabel.textContent = to.label;
    bDesc.textContent = to.desc;
    bSrc.textContent = to.src;
    mlRatio.textContent = to.ratio;
    qMark.style.opacity = to.ml == null ? "1" : "0";

    const fromY = levelY(fracFor(from.ml));
    const toY = levelY(fracFor(to.ml));
    const fromMl = from.ml == null ? 519 : from.ml;
    const toMl = to.ml == null ? 519 : to.ml;
    const t0 = performance.now();

    if (animId) cancelAnimationFrame(animId);
    (function step(now) {
      const e = easeOut(Math.min(1, (now - t0) / 700));
      waterGroup.setAttribute("transform", `translate(0,${lerp(fromY, toY, e)})`);
      if (to.ml == null) mlNum.textContent = "?";
      else {
        const v = lerp(fromMl, toMl, e);
        mlNum.textContent = v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString();
      }
      if (e < 1) animId = requestAnimationFrame(step);
    })(performance.now());
  }

  function setP(p) {
    if (p > 0.02 && !cueHidden) { cueHidden = true; cue.classList.add("hide"); }
    setStop(clamp(Math.floor(p * STOPS.length), 0, STOPS.length - 1));
  }

  const scene = document.getElementById("caliberScene");
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP && scene) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: scene, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => setP(self.progress),
    });
    window.addEventListener("load", () => ScrollTrigger.refresh());
  } else if (scene) {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const r = scene.getBoundingClientRect();
        const denom = r.height - window.innerHeight;
        setP(denom > 0 ? clamp(-r.top / denom, 0, 1) : 0);
      });
    }, { passive: true });
  }

  // 初始
  waterGroup.setAttribute("transform", `translate(0,${levelY(fracFor(STOPS[0].ml))})`);
  setStop(0);
}
