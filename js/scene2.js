/* ============================================================
   云的身体 · 第2段「忠实数据粒子 · 3D 汇聚」(Three.js + ScrollTrigger)
   粒子数量从 1 随真实数值爆增到海量（忠实从少到多），
   各阶段汇聚成 3D 模型：
   种子点(一次查询) → 粒子云(25亿次/一天)
   → 3D 服务器阵列(一年) → 3D 地球(全球 448TWh ≈ 法国)
   ============================================================ */

const SIDE = 16;
const N = SIDE * SIDE * SIDE; // 4096
const R = 8;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const map = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);

export function initScene2() {
  const scene = document.getElementById("escalation");
  if (!scene) return;
  const canvas = document.getElementById("escCanvas");
  const opEl = document.getElementById("escOp");
  const bigEl = document.getElementById("escBig");
  const labelEl = document.getElementById("escLabel");
  const cueEl = document.getElementById("escCue");

  const THREE = window.THREE;
  let p = 0, capPhase = -1, cueHidden = false;

  // ---- 阶段文案（与 3D 形态对应）----
  const CAPS = [
    { op: "", big: "0.3 Wh", label: "一次查询 · 约等于微波炉运行 1 秒" },
    { op: "× 25 亿次 / 天", big: null, label: "GPT 一天 · 每一个光点，都是一次提问" },
    { op: "× 365 天", big: "274 GWh", label: "GPT 一年 · 喂饱它的，是一排排服务器" },
    { op: "＋ 全世界的数据中心", big: "448 TWh", label: "2025 全球数据中心 · ≈ 法国全国用电" },
  ];
  const TH = [0.2, 0.46, 0.72]; // 阶段边界

  function phaseOf(pp) {
    return pp < TH[0] ? 0 : pp < TH[1] ? 1 : pp < TH[2] ? 2 : 3;
  }

  function updateCaption() {
    const ph = phaseOf(p);
    if (ph === 1) {
      const c = clamp(map(p, TH[0], TH[1], 0, 2.5e9), 0, 2.5e9);
      bigEl.textContent = (c / 1e8).toFixed(1) + " 亿次";
    }
    if (ph !== capPhase) {
      const cap = CAPS[ph];
      if (cap.big) bigEl.textContent = cap.big;
      opEl.textContent = cap.op;
      opEl.classList.toggle("show", !!cap.op);
      labelEl.textContent = cap.label;
      capPhase = ph;
    }
    if (p > 0.03 && !cueHidden) { cueHidden = true; cueEl.classList.add("hide"); }
  }
  function setP(np) { p = np; updateCaption(); }

  /* ===== 没有 WebGL/Three 时的 2D 兜底 ===== */
  if (!THREE) { fallback2D(); wireScroll(); setP(0); return; }

  // ---- 目标点集 ----
  const seed = new Float32Array(N * 3);   // 中心
  const cloud = new Float32Array(N * 3);  // 球体粒子云
  const lattice = new Float32Array(N * 3);// 3D 阵列
  const globe = new Float32Array(N * 3);  // 球面（地球）
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    const rr = R * Math.cbrt(Math.random());
    cloud[i * 3] = Math.cos(a) * s * rr;
    cloud[i * 3 + 1] = u * rr;
    cloud[i * 3 + 2] = Math.sin(a) * s * rr;

    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * GOLDEN;
    globe[i * 3] = Math.cos(th) * rad * R;
    globe[i * 3 + 1] = y * R;
    globe[i * 3 + 2] = Math.sin(th) * rad * R;

    const ix = i % SIDE, iy = Math.floor(i / SIDE) % SIDE, iz = Math.floor(i / (SIDE * SIDE));
    lattice[i * 3] = (ix - (SIDE - 1) / 2) * 1.0;
    lattice[i * 3 + 1] = (iy - (SIDE - 1) / 2) * 1.0;
    lattice[i * 3 + 2] = (iz - (SIDE - 1) / 2) * 1.0;
  }

  // ---- Three 场景 ----
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
  cam.position.set(0, 0, 23);
  const sceneT = new THREE.Scene();
  const group = new THREE.Group();
  sceneT.add(group);

  const pos = new Float32Array(N * 3); // 全部从中心出发
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  // 软光点贴图
  const tcanvas = document.createElement("canvas");
  tcanvas.width = tcanvas.height = 64;
  const tg = tcanvas.getContext("2d");
  const grad = tg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,235,180,1)");
  grad.addColorStop(0.4, "rgba(245,183,49,0.85)");
  grad.addColorStop(1, "rgba(245,183,49,0)");
  tg.fillStyle = grad;
  tg.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(tcanvas);

  const mat = new THREE.PointsMaterial({
    size: 0.55, map: sprite, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  group.add(points);

  let W = 0, H = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    cam.aspect = W / H || 1.6;
    cam.updateProjectionMatrix();
  }

  function activeCount() {
    if (p < 0.16) return 1;
    if (p >= 0.48) return N;
    const f = (p - 0.16) / 0.32;
    return Math.max(1, Math.min(N, Math.round(Math.pow(N, f)))); // 指数爆增
  }
  function formTargets() {
    const ph = phaseOf(p);
    return ph === 0 ? seed : ph === 1 ? cloud : ph === 2 ? lattice : globe;
  }

  function tick() {
    requestAnimationFrame(tick);
    const rect = scene.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || W === 0) return;

    const active = activeCount();
    const form = formTargets();
    const lf = 0.09;
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      let tx = 0, ty = 0, tz = 0;
      if (i < active) { tx = form[j]; ty = form[j + 1]; tz = form[j + 2]; }
      pos[j] += (tx - pos[j]) * lf;
      pos[j + 1] += (ty - pos[j + 1]) * lf;
      pos[j + 2] += (tz - pos[j + 2]) * lf;
    }
    geo.attributes.position.needsUpdate = true;
    group.rotation.y += 0.0016;
    group.rotation.x = Math.sin(performance.now() / 6000) * 0.18;
    renderer.render(sceneT, cam);
  }

  resize();
  requestAnimationFrame(tick);
  window.addEventListener("resize", resize);
  window.addEventListener("load", () => { resize(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  wireScroll();
  setP(0);

  /* ---------- 滚动绑定 ---------- */
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

  /* ---------- 2D 兜底（无 WebGL）---------- */
  function fallback2D() {
    const ctx = canvas.getContext("2d");
    const M = 1200;
    const pts = [];
    let cw = 0, ch = 0, dpr = 1;
    function rs() {
      const r = canvas.getBoundingClientRect();
      cw = r.width; ch = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts.length = 0;
      for (let i = 0; i < M; i++) {
        const a = Math.random() * Math.PI * 2, rad = Math.pow(Math.random(), 0.7);
        pts.push({ x: cw / 2 + Math.cos(a) * rad * cw * 0.42, y: ch / 2 + Math.sin(a) * rad * ch * 0.4 });
      }
    }
    rs();
    window.addEventListener("resize", rs);
    (function loop() {
      requestAnimationFrame(loop);
      const rect = scene.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const act = p < 0.16 ? 1 : p >= 0.48 ? M : Math.round(Math.pow(M, (p - 0.16) / 0.32));
      ctx.clearRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(245,183,49,.8)";
      for (let i = 0; i < act; i++) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.8, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    })();
  }
}
