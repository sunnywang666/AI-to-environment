/* ============================================================
   云的身体 · 第2段「粒子汇聚成 3D 物体」(Three.js + ScrollTrigger)
   滚动驱动：粒子在散点与 3D 物体之间聚散，物体序列走完
   AI(数字) → 现实(物理) → 全球 的弧线：
   微波炉 → 城市楼群 → 电厂冷却塔 → 地球(448TWh ≈ 法国)
   ============================================================ */

const N = 4200;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);
const lerp = (a, b, t) => a + (b - a) * t;
function smooth01(x, a, b) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

/* ---------- 3D 表面采样基元 ---------- */
function boxPoint(cx, cy, cz, w, h, d) {
  const A = [w * h, w * h, h * d, h * d, w * d, w * d];
  const tot = A[0] + A[1] + A[2] + A[3] + A[4] + A[5];
  let r = Math.random() * tot, f = 0;
  while (r > A[f]) { r -= A[f]; f++; }
  const u = Math.random() - 0.5, v = Math.random() - 0.5;
  const hx = w / 2, hy = h / 2, hz = d / 2;
  let x, y, z;
  if (f === 0) { x = u * w; y = v * h; z = hz; }
  else if (f === 1) { x = u * w; y = v * h; z = -hz; }
  else if (f === 2) { x = -hx; y = v * h; z = u * d; }
  else if (f === 3) { x = hx; y = v * h; z = u * d; }
  else if (f === 4) { x = u * w; y = hy; z = v * d; }
  else { x = u * w; y = -hy; z = v * d; }
  return [cx + x, cy + y, cz + z];
}
function cylPoint(cx, baseY, cz, r, h) {
  const ang = Math.random() * Math.PI * 2, t = Math.random();
  return [cx + Math.cos(ang) * r, baseY + t * h, cz + Math.sin(ang) * r];
}
function towerPoint(cx, baseY, cz, h, rBot, rWaist, rTop) {
  const t = Math.random();
  const rr = t < 0.55 ? lerp(rBot, rWaist, t / 0.55) : lerp(rWaist, rTop, (t - 0.55) / 0.45);
  const ang = Math.random() * Math.PI * 2;
  return [cx + Math.cos(ang) * rr, baseY + t * h, cz + Math.sin(ang) * rr];
}
function spherePoint(rad) {
  const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return [Math.cos(a) * s * rad, u * rad, Math.sin(a) * s * rad];
}

function buildObject(parts) {
  const arr = new Float32Array(N * 3);
  let tot = 0; parts.forEach((p) => (tot += p.w));
  for (let i = 0; i < N; i++) {
    let r = Math.random() * tot, k = 0;
    while (r > parts[k].w) { r -= parts[k].w; k++; }
    const pt = parts[k].fn();
    arr[i * 3] = pt[0]; arr[i * 3 + 1] = pt[1]; arr[i * 3 + 2] = pt[2];
  }
  return arr;
}

/* ---------- 四个物体 ---------- */
function makeMicrowave() {
  return buildObject([
    { w: 60, fn: () => boxPoint(0, 0, 0, 10, 6, 7) },          // 机身
    { w: 10, fn: () => boxPoint(-1.4, 0, 3.56, 5.4, 4.4, 0.2) }, // 门面板
    { w: 8,  fn: () => boxPoint(3.4, 0, 3.56, 2.4, 4.6, 0.2) },  // 控制面板
    { w: 3,  fn: () => boxPoint(2.0, 0, 3.75, 0.4, 4.2, 0.4) },  // 把手
    { w: 4,  fn: () => {                                          // 四只脚
        const sx = Math.random() < 0.5 ? -4.3 : 4.3, sz = Math.random() < 0.5 ? -3 : 3;
        return boxPoint(sx, -3.4, sz, 0.6, 0.8, 0.6);
      } },
  ]);
}
function makeCity() {
  const B = [[-4,-1.5,4],[-2,1,7],[0,-1,5],[2,1.5,9],[4,-1,6],[-3,2,8],[1,-2.5,5],[3.5,2,7],[-1,0.2,6.5]];
  const parts = B.map(([x, z, h]) => ({
    w: h, fn: () => boxPoint(x, -3.5 + h / 2, z, 1.5, h, 1.5),
  }));
  return buildObject(parts);
}
function makeTowers() {
  return buildObject([
    { w: 34, fn: () => towerPoint(-2.6, -3.5, 0, 8, 2.2, 1.4, 1.8) }, // 冷却塔1
    { w: 30, fn: () => towerPoint(2.6, -3.5, 0, 7.2, 2.0, 1.3, 1.6) },// 冷却塔2
    { w: 8,  fn: () => cylPoint(0, -3.5, 0, 0.45, 11) },              // 烟囱
    { w: 14, fn: () => boxPoint(0, -3.8, 0, 11, 1, 4) },             // 厂房底座
  ]);
}
function makeGlobe() {
  return buildObject([{ w: 1, fn: () => spherePoint(6) }]);
}

export function initScene2() {
  const scene = document.getElementById("escalation");
  if (!scene) return;
  const canvas = document.getElementById("escCanvas");
  const opEl = document.getElementById("escOp");
  const bigEl = document.getElementById("escBig");
  const labelEl = document.getElementById("escLabel");
  const cueEl = document.getElementById("escCue");
  const THREE = window.THREE;

  let p = 0, capBand = -1, cueHidden = false;

  const CAPS = [
    { op: "", big: "0.3 Wh", label: "一次查询 · 一台微波炉转 1 秒的电" },
    { op: "× 25 亿次 / 天", big: null, label: "GPT 一天 · 加起来是一座城市的胃口" },
    { op: "× 365 天", big: "274 GWh", label: "GPT 一年 · 要靠一座真实的电厂来喂" },
    { op: "＋ 全世界的数据中心", big: "448 TWh", label: "2025 全球数据中心 · ≈ 法国全国用电" },
  ];

  function updateCaption() {
    const band = Math.min(3, Math.floor(p * 4));
    if (band === 1) {
      const c = clamp(map(p, 0.25, 0.5, 0, 2.5e9), 0, 2.5e9);
      bigEl.textContent = (c / 1e8).toFixed(1) + " 亿次";
    }
    if (band !== capBand) {
      const cap = CAPS[band];
      if (cap.big) bigEl.textContent = cap.big;
      opEl.textContent = cap.op;
      opEl.classList.toggle("show", !!cap.op);
      labelEl.textContent = cap.label;
      capBand = band;
    }
    if (p > 0.03 && !cueHidden) { cueHidden = true; cueEl.classList.add("hide"); }
  }
  function setP(np) { p = np; updateCaption(); }

  if (!THREE) { fallback2D(); wireScroll(); setP(0); return; }

  const forms = [makeMicrowave(), makeCity(), makeTowers(), makeGlobe()];
  const scatter = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const pt = spherePoint(9 * Math.cbrt(Math.random()));
    scatter[i * 3] = pt[0]; scatter[i * 3 + 1] = pt[1]; scatter[i * 3 + 2] = pt[2];
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const cam = new THREE.PerspectiveCamera(52, 1, 0.1, 1000);
  cam.position.set(0, 0, 23);
  const sceneT = new THREE.Scene();
  const group = new THREE.Group();
  group.position.y = 2.4;       // 上移，给底部字幕让位
  sceneT.add(group);

  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = scatter[i * 3]; pos[i * 3 + 1] = scatter[i * 3 + 1]; pos[i * 3 + 2] = scatter[i * 3 + 2]; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  // 精致软光点
  const tc = document.createElement("canvas"); tc.width = tc.height = 48;
  const g = tc.getContext("2d");
  const rg = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  rg.addColorStop(0, "rgba(255,244,214,1)");
  rg.addColorStop(0.35, "rgba(245,183,49,0.7)");
  rg.addColorStop(1, "rgba(245,183,49,0)");
  g.fillStyle = rg; g.beginPath(); g.arc(24, 24, 24, 0, 6.2832); g.fill();
  const sprite = new THREE.CanvasTexture(tc);
  const mat = new THREE.PointsMaterial({
    size: 0.3, map: sprite, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  group.add(new THREE.Points(geo, mat));

  let W = 0, H = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    cam.aspect = W / H || 1.6; cam.updateProjectionMatrix();
  }

  function tick() {
    requestAnimationFrame(tick);
    const rect = scene.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || W === 0) return;

    const band = Math.min(3, Math.floor(p * 4));
    const lt = clamp(p * 4 - band, 0, 1);
    let f = smooth01(lt, 0, 0.32);
    if (band < 3) f = Math.min(f, 1 - smooth01(lt, 0.72, 1.0));
    const form = forms[band];

    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const tx = scatter[j] * (1 - f) + form[j] * f;
      const ty = scatter[j + 1] * (1 - f) + form[j + 1] * f;
      const tz = scatter[j + 2] * (1 - f) + form[j + 2] * f;
      pos[j] += (tx - pos[j]) * 0.1;
      pos[j + 1] += (ty - pos[j + 1]) * 0.1;
      pos[j + 2] += (tz - pos[j + 2]) * 0.1;
    }
    geo.attributes.position.needsUpdate = true;
    group.rotation.y += 0.0016;
    group.rotation.x = Math.sin(performance.now() / 6000) * 0.16;
    renderer.render(sceneT, cam);
  }

  resize();
  requestAnimationFrame(tick);
  window.addEventListener("resize", resize);
  window.addEventListener("load", () => { resize(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  wireScroll();
  setP(0);

  function wireScroll() {
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
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
  }

  function fallback2D() {
    const ctx = canvas.getContext("2d");
    let cw = 0, ch = 0;
    function rs() {
      const r = canvas.getBoundingClientRect(); cw = r.width; ch = r.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = cw * dpr; canvas.height = ch * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    rs(); window.addEventListener("resize", rs);
    (function loop() {
      requestAnimationFrame(loop);
      const rect = scene.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "rgba(245,183,49,.85)";
      ctx.font = '600 16px monospace'; ctx.textAlign = 'center';
      ctx.fillText('（当前浏览器不支持 WebGL，3D 粒子无法显示）', cw / 2, ch / 2);
    })();
  }
}
