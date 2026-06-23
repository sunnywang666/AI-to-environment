/* ============================================================
   云的身体 · 第2段「粒子聚散成形」(GSAP ScrollTrigger · pin+scrub)
   滚动驱动：粒子聚成画面 → 逸散 → 再聚成下一个，
   画面序列走完 AI(数字) → 现实(物理) 的弧线：
   对话气泡 → 城市天际线 → 冷却塔/电厂 → 数字 448(≈法国)
   ============================================================ */

const N = 1500;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
function smooth01(x, a, b) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/* ---------- 各阶段的剪影绘制（离屏 canvas，CSS px 坐标）---------- */
function drawBubble(c, w, h) {
  const bw = w * 0.34, bh = h * 0.34;
  const x = (w - bw) / 2, y = (h - bh) / 2 - h * 0.03, r = bh * 0.3;
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + bw, y, x + bw, y + bh, r);
  c.arcTo(x + bw, y + bh, x, y + bh, r);
  c.arcTo(x, y + bh, x, y, r);
  c.arcTo(x, y, x + bw, y, r);
  c.closePath();
  c.fill();
  // 小尾巴
  c.beginPath();
  c.moveTo(x + bw * 0.22, y + bh - 2);
  c.lineTo(x + bw * 0.10, y + bh + bh * 0.26);
  c.lineTo(x + bw * 0.40, y + bh - 2);
  c.closePath();
  c.fill();
  // 光标
  c.fillRect(x + bw * 0.62, y + bh * 0.34, Math.max(3, bw * 0.02), bh * 0.34);
}

function drawCity(c, w, h) {
  const base = h * 0.74;
  const cw = w * 0.66, x0 = (w - cw) / 2;
  const hs = [0.30, 0.55, 0.42, 0.72, 0.50, 0.92, 0.62, 0.78, 0.46, 0.66, 0.36];
  const n = hs.length, gap = cw * 0.012;
  const bw = (cw - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const bh = base * 0.62 * hs[i];
    const x = x0 + i * (bw + gap);
    c.fillRect(x, base - bh, bw, bh);
  }
  c.fillRect(x0, base, cw, Math.max(3, h * 0.012)); // 地面线
}

function drawTowers(c, w, h) {
  const base = h * 0.76;
  function tower(cx, hgt, topW, botW) {
    const ty = base - hgt, waistY = base - hgt * 0.62;
    c.beginPath();
    c.moveTo(cx - botW / 2, base);
    c.bezierCurveTo(cx - botW * 0.5, waistY, cx - topW * 0.62, waistY, cx - topW / 2, ty);
    c.lineTo(cx + topW / 2, ty);
    c.bezierCurveTo(cx + topW * 0.62, waistY, cx + botW * 0.5, waistY, cx + botW / 2, base);
    c.closePath();
    c.fill();
    c.fillRect(cx - topW * 0.6, ty - h * 0.012, topW * 1.2, h * 0.022); // 塔沿
  }
  const tw = w * 0.16, bw = w * 0.21, hgt = h * 0.42;
  tower(w * 0.4, hgt, tw, bw);
  tower(w * 0.6, hgt * 0.92, tw * 0.92, bw * 0.92);
  // 烟囱
  c.fillRect(w * 0.5 - w * 0.012, base - hgt * 1.18, w * 0.024, hgt * 1.18);
  // 烟
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.arc(w * 0.5 + i * w * 0.018, base - hgt * 1.18 - i * h * 0.03, h * 0.022 + i * 2, 0, 6.2832);
    c.fill();
  }
}

function drawText(c, w, h, text) {
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `900 ${Math.min(h * 0.6, w * 0.4)}px "Roboto Mono", ui-monospace, monospace`;
  c.fillText(text, w / 2, h * 0.46);
}

const SHAPES = [
  { draw: (c, w, h) => drawBubble(c, w, h), op: "", big: "0.3 Wh",
    label: "一次查询 · 一个干净的对话框，约等于微波炉运行 1 秒", counter: false },
  { draw: (c, w, h) => drawCity(c, w, h), op: "× 25 亿次 / 天", big: null,
    label: "GPT 一天 · 加起来是一座城市的胃口", counter: true },
  { draw: (c, w, h) => drawTowers(c, w, h), op: "× 365 天", big: "274 GWh",
    label: "GPT 一年 · 这胃口要靠实实在在的电厂来喂", counter: false },
  { draw: (c, w, h) => drawText(c, w, h, "448"), op: "＋ 全世界的数据中心", big: "448 TWh",
    label: "2025 全球数据中心 · ≈ 法国全国，超过除前 10 名外所有国家", counter: false },
];

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
  let swarm = [];
  let shapeTargets = [];
  let p = 0, capBand = -1, cueHidden = false;

  function sampleShape(drawFn) {
    const w = Math.max(2, Math.floor(W));
    const h = Math.max(2, Math.floor(H));
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const c = off.getContext("2d");
    c.fillStyle = "#fff";
    drawFn(c, w, h);
    const data = c.getImageData(0, 0, w, h).data;
    const pts = [];
    for (let y = 0; y < h; y += 4)
      for (let x = 0; x < w; x += 4)
        if (data[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
    const res = [];
    if (!pts.length) { for (let i = 0; i < N; i++) res.push({ x: W / 2, y: H / 2 }); return res; }
    for (let i = 0; i < N; i++) {
      const q = pts[(Math.random() * pts.length) | 0];
      res.push({ x: q[0] + (Math.random() - 0.5) * 4, y: q[1] + (Math.random() - 0.5) * 4 });
    }
    return res;
  }

  function build() {
    swarm = [];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = Math.pow(Math.random(), 0.7);
      swarm.push({ x: W / 2 + Math.cos(a) * rad * W * 0.46, y: H / 2 + Math.sin(a) * rad * H * 0.42 });
    }
    shapeTargets = SHAPES.map((s) => sampleShape(s.draw));
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
    build();
  }

  function updateCaption() {
    const band = Math.min(3, Math.floor(p * 4));
    const lt = clamp(p * 4 - band, 0, 1);
    const s = SHAPES[band];
    if (s.counter) {
      const c = clamp(map(lt, 0, 0.8, 0, 2.5e9), 0, 2.5e9);
      bigEl.textContent = (c / 1e8).toFixed(1) + " 亿次";
    }
    if (band !== capBand) {
      if (!s.counter) bigEl.textContent = s.big;
      opEl.textContent = s.op;
      opEl.classList.toggle("show", !!s.op);
      labelEl.textContent = s.label;
      capBand = band;
    }
    if (p > 0.03 && !cueHidden) { cueHidden = true; cueEl.classList.add("hide"); }
  }

  function setP(np) { p = np; updateCaption(); }

  function frame(t) {
    requestAnimationFrame(frame);
    const rect = scene.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || W === 0) return;

    const band = Math.min(3, Math.floor(p * 4));
    const lt = clamp(p * 4 - band, 0, 1);
    let f = smooth01(lt, 0, 0.3);
    if (band < 3) f = Math.min(f, 1 - smooth01(lt, 0.72, 1.0)); // 末段保持成形
    const shape = shapeTargets[band];
    const jit = (1 - f) * 9;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(245,183,49,0.82)";

    for (let i = 0; i < N; i++) {
      const pt = particles[i], sw = swarm[i], sh = shape[i];
      let tx = sw.x + (sh.x - sw.x) * f;
      let ty = sw.y + (sh.y - sw.y) * f;
      if (jit > 0.5) {
        tx += Math.sin(t / 700 + i) * jit;
        ty += Math.cos(t / 800 + i * 1.3) * jit;
      }
      pt.x += (tx - pt.x) * 0.16;
      pt.y += (ty - pt.y) * 0.16;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, f > 0.6 ? 1.7 : 2.0, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  resize();
  requestAnimationFrame(frame);
  window.addEventListener("resize", resize);
  window.addEventListener("load", () => { resize(); if (hasGSAP) ScrollTrigger.refresh(); });

  if (hasGSAP) {
    ScrollTrigger.create({
      trigger: scene, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: (self) => setP(self.progress),
    });
  } else {
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

  setP(0);
}
