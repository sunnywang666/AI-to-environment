/* ============================================================
   云的身体 · 第2段「粒子聚集成形」(GSAP ScrollTrigger · pin+scrub)
   滚动驱动状态变化：
   一个光点(一次查询) → 爆增成 25 亿次的粒子海(一天)
   → 压缩成方阵(一年) → 飞成数字「448」(全球 ≈ 法国)
   ============================================================ */

const N = 1400;
const easeIn = (t) => t * t;
const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initScene2() {
  const scene = document.getElementById("escalation");
  if (!scene) return;
  const canvas = document.getElementById("escCanvas");
  const ctx = canvas.getContext("2d");
  const opEl = document.getElementById("escOp");
  const bigEl = document.getElementById("escBig");
  const labelEl = document.getElementById("escLabel");
  const cueEl = document.getElementById("escCue");

  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let swarm = [], grid = [], textT = [];
  let p = 0;
  let cueHidden = false;
  let lastPhase = -1;

  function sampleText(text, n, w, h) {
    w = Math.max(2, Math.floor(w));
    h = Math.max(2, Math.floor(h));
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const c = off.getContext("2d");
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const fs = Math.min(h * 0.62, w * 0.42);
    c.font = `900 ${fs}px "Roboto Mono", ui-monospace, monospace`;
    c.fillText(text, w / 2, h * 0.46);
    const data = c.getImageData(0, 0, w, h).data;
    const pts = [];
    const step = 4;
    for (let y = 0; y < h; y += step)
      for (let x = 0; x < w; x += step)
        if (data[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
    const res = [];
    if (!pts.length) {
      for (let i = 0; i < n; i++) res.push({ x: w / 2, y: h / 2 });
      return res;
    }
    for (let i = 0; i < n; i++) {
      const q = pts[(Math.random() * pts.length) | 0];
      res.push({ x: q[0] + (Math.random() - 0.5) * step, y: q[1] + (Math.random() - 0.5) * step });
    }
    return res;
  }

  function buildTargets() {
    // 粒子海：中心向外的圆形分布
    swarm = [];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = Math.pow(Math.random(), 0.7);
      swarm.push({
        x: W / 2 + Math.cos(a) * rad * W * 0.46,
        y: H / 2 + Math.sin(a) * rad * H * 0.42,
      });
    }
    // 方阵
    const aspect = W / H || 1.6;
    let cols = Math.max(1, Math.round(Math.sqrt(N * aspect)));
    const gw = Math.min(W * 0.62, cols * 16);
    const cell = gw / cols;
    const rows = Math.ceil(N / cols);
    const gh = rows * cell;
    const sx = (W - gw) / 2 + cell / 2;
    const sy = (H - gh) / 2 + cell / 2;
    grid = [];
    for (let i = 0; i < N; i++) {
      const r = Math.floor(i / cols);
      const col = i % cols;
      grid.push({ x: sx + col * cell, y: sy + r * cell });
    }
    // 数字「448」
    textT = sampleText("448", N, W, H);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!particles.length)
      for (let i = 0; i < N; i++) particles.push({ x: W / 2, y: H / 2 });
    buildTargets();
  }

  function phaseOf(pp) {
    return pp < 0.2 ? 0 : pp < 0.5 ? 1 : pp < 0.78 ? 2 : 3;
  }

  function updateCaption() {
    const ph = phaseOf(p);
    if (ph === 1) {
      // 实时计数到 25 亿
      const c = clamp(map(p, 0.2, 0.5, 0, 2.5e9), 0, 2.5e9);
      bigEl.textContent = (c / 1e8).toFixed(1) + " 亿次";
    } else if (ph !== lastPhase) {
      if (ph === 0) bigEl.textContent = "0.3 Wh";
      else if (ph === 2) bigEl.textContent = "274 GWh";
      else bigEl.textContent = "448 TWh";
    }
    if (ph !== lastPhase) {
      const OPS = ["", "× 25 亿次 / 天", "× 365 天", "＋ 全世界的数据中心"];
      const LBL = [
        "一次查询 · 约等于微波炉运行 1 秒",
        "GPT 一天 · 每一个光点，都是一次提问",
        "GPT 一年 · 约等于数十万户家庭的用电",
        "2025 全球数据中心 · ≈ 法国全国，超过除前 10 名外所有国家",
      ];
      opEl.textContent = OPS[ph];
      opEl.classList.toggle("show", ph > 0);
      labelEl.textContent = LBL[ph];
      lastPhase = ph;
    }
    if (p > 0.04 && !cueHidden) {
      cueHidden = true;
      cueEl.classList.add("hide");
    }
  }

  function setP(np) {
    p = np;
    updateCaption();
  }

  function frame(t) {
    requestAnimationFrame(frame);
    const rect = scene.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || W === 0) return;

    ctx.clearRect(0, 0, W, H);
    const ph = phaseOf(p);

    let active = N;
    if (ph === 0) active = 1;
    else if (ph === 1) active = Math.max(1, Math.round(easeIn(clamp((p - 0.2) / 0.3, 0, 1)) * N));

    const targets = ph === 1 ? swarm : ph === 2 ? grid : ph === 3 ? textT : null;
    const lf = ph === 3 ? 0.18 : 0.1;

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(245,183,49,0.85)";

    for (let i = 0; i < active; i++) {
      const pt = particles[i];
      let tx, ty, r;
      if (ph === 0) {
        tx = W / 2; ty = H / 2;
        r = 9 + Math.sin(t / 300) * 2.2;
      } else {
        const tg = targets[i];
        tx = tg.x; ty = tg.y;
        if (ph === 1) {
          tx += Math.sin(t / 900 + i) * 7;
          ty += Math.cos(t / 1100 + i * 1.3) * 7;
        }
        r = 1.7;
      }
      pt.x += (tx - pt.x) * lf;
      pt.y += (ty - pt.y) * lf;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  resize();
  requestAnimationFrame(frame);
  window.addEventListener("resize", resize);
  window.addEventListener("load", () => {
    resize();
    if (hasGSAP) ScrollTrigger.refresh();
  });

  if (hasGSAP) {
    ScrollTrigger.create({
      trigger: scene,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => setP(self.progress),
    });
  } else {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const r = scene.getBoundingClientRect();
        const denom = r.height - window.innerHeight;
        setP(denom > 0 ? clamp(-r.top / denom, 0, 1) : 0);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  setP(0);
}
