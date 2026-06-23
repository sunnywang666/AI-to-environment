/* ============================================================
   云的身体 · 第5段「口径滑块」
   同一次查询的用水，随系统边界从 0.32ml 跳到 519ml，
   第三档（芯片全生命周期）无公认数据 —— 展示"数字是被口径制造的"。
   ============================================================ */

const STOPS = [
  {
    label: "只算现场冷却",
    ml: 0.32,
    text: "0.32",
    ratio: "基准 ×1",
    desc: "厂商口径：只统计数据中心机房里、为给服务器降温而直接蒸发的水。OpenAI 的 Sam Altman 给出 0.32ml，Google 给出 0.26ml——都画在这条边界上。",
    src: "来源：Sam Altman 博客 (2025) · Google 环境报告（仅现场冷却）",
  },
  {
    label: "＋ 发电的间接用水",
    ml: 519,
    text: "519",
    ratio: "× 约 1600",
    desc: "再加上为这台服务器发电时、发电厂冷却所消耗的水。学术口径（UC Riverside）测算一次约 100 词的生成综合耗水约 519ml——一整瓶矿泉水。",
    src: "来源：UC Riverside / CACM 2025（含发电间接用水）",
  },
  {
    label: "＋ 芯片制造全生命周期",
    ml: null, // 无公认数据
    text: "?",
    ratio: "无人统计",
    desc: "再加上制造这块 GPU 芯片、建厂、冷却系统在整个生命周期里的水——目前没有任何公认数据。冰山最大的那部分，根本没被算进账。",
    src: "来源：无统一公开口径（MIT Technology Review 指出尚无公认测量方法）",
  },
];

const BOTTLE_MAX = 519; // 满瓶参考值(ml)
const FILL_TOP = 70;    // 水面最高 y
const FILL_BOTTOM = 250;// 瓶底 y

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

export function initSlider() {
  const mount = document.getElementById("slider-mount");
  if (!mount) return;

  mount.classList.remove("placeholder");
  mount.innerHTML = `
    <div class="slider-widget">
      <div class="slider-viz">
        <svg viewBox="0 0 150 300" aria-hidden="true">
          <defs>
            <clipPath id="bottleClip">
              <path d="M55 40 h40 v18 q22 8 22 40 v140 q0 22 -22 22 h-40 q-22 0 -22 -22 v-140 q0 -32 22 -40 z"/>
            </clipPath>
          </defs>
          <rect class="bottle-cap" x="62" y="22" width="26" height="20" rx="4"/>
          <g clip-path="url(#bottleClip)">
            <rect class="bottle-water" id="bottleWater" x="30" y="250" width="90" height="0"/>
          </g>
          <path class="bottle-outline" d="M55 40 h40 v18 q22 8 22 40 v140 q0 22 -22 22 h-40 q-22 0 -22 -22 v-140 q0 -32 22 -40 z"/>
          <text class="bottle-q" id="bottleQ" x="75" y="180" text-anchor="middle">?</text>
        </svg>
        <div class="slider-readout">
          <div class="monument"><span id="mlNum">0.32</span><span class="unit">ml</span></div>
          <div class="ratio" id="mlRatio">基准 ×1</div>
        </div>
      </div>

      <div class="slider-explain">
        <div class="slider-control">
          <input type="range" class="caliber" id="caliber" min="0" max="2" step="1" value="0"
                 aria-label="用水统计口径" />
          <div class="slider-stops" id="stops"></div>
        </div>
        <p class="boundary-label" id="bLabel"></p>
        <p class="boundary-desc" id="bDesc"></p>
        <p class="source" id="bSrc"></p>
        <aside class="slider-note">
          <strong>为什么各家的总量永远对不上？</strong>
          因为没有人被要求把边界画在同一个地方。厂商只报机房里看得见的那点水，
          学术界把发电、制造一路算进去——同一件事，于是有了相差上千倍的两个"真相"。
        </aside>
      </div>
    </div>`;

  const water = mount.querySelector("#bottleWater");
  const qMark = mount.querySelector("#bottleQ");
  const mlNum = mount.querySelector("#mlNum");
  const mlRatio = mount.querySelector("#mlRatio");
  const bLabel = mount.querySelector("#bLabel");
  const bDesc = mount.querySelector("#bDesc");
  const bSrc = mount.querySelector("#bSrc");
  const range = mount.querySelector("#caliber");
  const stopsBox = mount.querySelector("#stops");

  // 顶部三个可点标签
  STOPS.forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = s.label;
    b.addEventListener("click", () => setStop(i));
    stopsBox.appendChild(b);
  });
  const stopBtns = [...stopsBox.children];

  let current = 0;
  let animId = null;

  function fillHeightFor(ml) {
    if (ml == null) return FILL_BOTTOM - FILL_TOP; // 满（溢出感由 ? 表达）
    const frac = Math.min(1, ml / BOTTLE_MAX);
    // 0.32ml 极小，给一个可见下限
    const h = (FILL_BOTTOM - FILL_TOP) * frac;
    return Math.max(ml > 0 ? 2 : 0, h);
  }

  function renderWater(h) {
    water.setAttribute("y", FILL_BOTTOM - h);
    water.setAttribute("height", h);
  }

  function setStop(i) {
    const from = STOPS[current];
    const to = STOPS[i];
    current = i;
    range.value = i;

    stopBtns.forEach((b, k) => b.classList.toggle("is-active", k === i));
    bLabel.textContent = to.label;
    bDesc.textContent = to.desc;
    bSrc.textContent = to.src;
    mlRatio.textContent = to.ratio;
    qMark.style.opacity = to.ml == null ? "1" : "0";

    // 数字 + 水位动画
    const fromH = fillHeightFor(from.ml);
    const toH = fillHeightFor(to.ml);
    const fromMl = from.ml == null ? BOTTLE_MAX : from.ml;
    const toMl = to.ml == null ? BOTTLE_MAX : to.ml;
    const t0 = performance.now();
    const DUR = 650;

    if (animId) cancelAnimationFrame(animId);
    function step(now) {
      const t = Math.min(1, (now - t0) / DUR);
      const e = easeOut(t);
      renderWater(lerp(fromH, toH, e));
      if (to.ml == null) {
        mlNum.textContent = "?";
      } else {
        const v = lerp(fromMl, toMl, e);
        mlNum.textContent = v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString();
      }
      if (t < 1) animId = requestAnimationFrame(step);
    }
    animId = requestAnimationFrame(step);
  }

  range.addEventListener("input", () => setStop(+range.value));

  // 初始化
  renderWater(fillHeightFor(STOPS[0].ml));
  setStop(0);
}
