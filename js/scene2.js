/* ============================================================
   云的身体 · 第2段「真实 3D 模型」(Three.js mesh + 灯光)
   用代码建真实 3D 模型（实体网格，非粒子拼形）：
   微波炉 → 服务器机柜 → 电厂冷却塔 → 地球
   数据用准确数字呈现（不拿粒子数量冒充"忠实"）。
   滚动切换模型 + 模型自转。
   ============================================================ */

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

  let p = 0, capStage = -1, cueHidden = false;

  // 4 个关键节点：数字目标 + 可见粒子目标 + 文案
  const STAGES = [
    { op: "",                  target: 0.3,   pt: 90,   label: "一次查询 · 一台微波炉转 1 秒的电",   fmt: (v) => v.toFixed(2) + " Wh" },
    { op: "× 25 亿次 / 天",     target: 2.5e9, pt: 700,  label: "GPT 一天 · 喂饱它的是一排排服务器",   fmt: (v) => (v / 1e8).toFixed(1) + " 亿次" },
    { op: "× 365 天",          target: 274,   pt: 2000, label: "GPT 一年 · 要靠一座真实的电厂",       fmt: (v) => Math.round(v) + " GWh" },
    { op: "＋ 全世界的数据中心",  target: 448,   pt: 4200, label: "2025 全球数据中心 · ≈ 法国全国用电",  fmt: (v) => Math.round(v) + " TWh" },
  ];
  const SEG = 1 / STAGES.length;
  const CLIMB = 0.55; // 前 55% 爬升、后 45% 停顿（数字冻结+模型定格）

  let st = { stage: 0, local: 0, climbT: 0, num: 0, particles: 0 };

  function computeState() {
    const stage = clamp(Math.floor(p / SEG), 0, STAGES.length - 1);
    const local = clamp((p - stage * SEG) / SEG, 0, 1);
    const climbT = local < CLIMB ? local / CLIMB : 1; // 爬升到 1 后冻结
    const cur = STAGES[stage];
    const prevPt = stage > 0 ? STAGES[stage - 1].pt : 0;
    // 节点可见度：只在停顿区出现（节点处淡入、离开节点淡出）；爬升段为 0
    const fadeIn = clamp((local - CLIMB) / 0.12, 0, 1);
    const fadeOut = stage < STAGES.length - 1 ? 1 - clamp((local - 0.9) / 0.1, 0, 1) : 1;
    return {
      stage, local, climbT,
      num: cur.target * climbT,
      particles: Math.round(prevPt + (cur.pt - prevPt) * climbT),
      nodeVis: fadeIn * fadeOut,
    };
  }

  function updateCaption() {
    st = computeState();
    const cur = STAGES[st.stage];
    bigEl.textContent = cur.fmt(st.num); // 数字始终在（爬升跳动 / 节点冻结）
    if (st.stage !== capStage) {
      opEl.textContent = cur.op;
      labelEl.textContent = cur.label;
      capStage = st.stage;
    }
    // 算符 + 标签只在节点附近出现；爬升时清空，只剩粒子 + 数字
    opEl.classList.toggle("show", st.nodeVis > 0.3 && !!cur.op);
    opEl.style.opacity = (cur.op ? st.nodeVis : 0).toFixed(2);
    labelEl.style.opacity = st.nodeVis.toFixed(2);
    if (p > 0.02 && !cueHidden) { cueHidden = true; cueEl.classList.add("hide"); }
  }
  function setP(np) { p = np; updateCaption(); }

  let renderer;
  try {
    if (!THREE) throw new Error("no THREE");
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    fallbackMsg();
    wireScroll();
    setP(0);
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const sceneT = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  cam.position.set(0, 1.5, 27);
  cam.lookAt(0, 0, 0);

  // 灯光
  sceneT.add(new THREE.AmbientLight(0x4a4e57, 0.8));
  const key = new THREE.DirectionalLight(0xfff1d4, 1.25);
  key.position.set(8, 12, 10);
  sceneT.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8c8, 0.5);
  rim.position.set(-10, 4, -8);
  sceneT.add(rim);

  // ---------- 材质 ----------
  const M = (opt) => new THREE.MeshStandardMaterial(Object.assign({ transparent: true }, opt));

  function addBox(group, w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat.clone());
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }

  // ---------- 微波炉 ----------
  function buildMicrowave() {
    const g = new THREE.Group();
    const bodyMat = M({ color: 0x262a31, metalness: 0.55, roughness: 0.45 });
    const panelMat = M({ color: 0x33373f, metalness: 0.4, roughness: 0.6 });
    const glassMat = M({ color: 0x0a0d11, metalness: 0.3, roughness: 0.15, emissive: 0x3a2606, emissiveIntensity: 0.9 });
    const metalMat = M({ color: 0x596069, metalness: 0.85, roughness: 0.3 });
    const dispMat = M({ color: 0x101316, emissive: 0xf5b731, emissiveIntensity: 0.7 });

    addBox(g, 11, 6.4, 7, 0, 0, 0, bodyMat);              // 机身
    addBox(g, 5.6, 4.4, 0.4, -1.6, 0, 3.55, glassMat);    // 门玻璃窗
    addBox(g, 6.0, 4.8, 0.25, -1.6, 0, 3.35, panelMat);   // 门框
    addBox(g, 2.6, 5.0, 0.4, 3.4, 0, 3.5, panelMat);      // 控制面板
    addBox(g, 2.0, 0.7, 0.25, 3.4, 1.6, 3.72, dispMat);   // 显示屏
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++)
      addBox(g, 0.55, 0.55, 0.2, 3.0 + c * 0.85, -0.4 - r * 0.85, 3.72, metalMat); // 按钮
    addBox(g, 0.45, 4.2, 0.55, 1.0, 0, 3.7, metalMat);    // 把手
    for (const sx of [-5, 5]) for (const sz of [-3, 3])
      addBox(g, 0.7, 0.8, 0.7, sx, -3.6, sz, bodyMat);    // 脚
    // 微波炉内灯
    const lamp = new THREE.PointLight(0xf5b731, 0.6, 18);
    lamp.position.set(-1.6, 0, 2);
    g.add(lamp);
    return g;
  }

  // ---------- 服务器机柜 ----------
  function buildServers() {
    const g = new THREE.Group();
    const cab = M({ color: 0x1b1e23, metalness: 0.6, roughness: 0.5 });
    const unit = M({ color: 0x2b3038, metalness: 0.5, roughness: 0.55 });
    const led = M({ color: 0x101316, emissive: 0xf5b731, emissiveIntensity: 0.95 });
    const led2 = M({ color: 0x101316, emissive: 0xf5b731, emissiveIntensity: 0.4 });
    addBox(g, 6, 11, 5.5, 0, 0, 0, cab);                  // 柜体
    for (let i = 0; i < 16; i++) {
      const y = 4.6 - i * 0.62;
      addBox(g, 5.4, 0.46, 0.3, 0, y, 2.75, unit);        // 服务器抽屉
      addBox(g, 0.18, 0.18, 0.12, -2.1, y, 2.95, i % 3 ? led : led2); // LED
      addBox(g, 0.18, 0.18, 0.12, -1.7, y, 2.95, i % 2 ? led2 : led);
    }
    return g;
  }

  // ---------- 电厂冷却塔 ----------
  function latheTower(profile, mat) {
    const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat.clone());
    m.material.side = THREE.DoubleSide;
    return m;
  }
  function buildPlant() {
    const g = new THREE.Group();
    const concrete = M({ color: 0x2e333b, metalness: 0.62, roughness: 0.45, emissive: 0xf5b731, emissiveIntensity: 0.05 });
    const dark = M({ color: 0x3a3f48, metalness: 0.55, roughness: 0.5 });
    const steamMat = M({ color: 0xf5d79a, metalness: 0, roughness: 1, opacity: 0.45, emissive: 0xf5b731, emissiveIntensity: 0.12 });
    const profile = [[2.4, 0], [2.0, 1.6], [1.5, 3.6], [1.35, 4.6], [1.55, 6.4], [1.9, 8.2]];
    for (const [cx, h, s] of [[-2.8, 1, 1], [2.8, 0.92, 0.92]]) {
      const t = latheTower(profile.map(([x, y]) => [x * s, y * s]), concrete);
      t.position.set(cx, -3.5, 0);
      g.add(t);
      // 蒸汽
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9 + i * 0.3, 12, 12), steamMat.clone());
        puff.material.userData.base = 0.5;
        puff.position.set(cx + (i - 1) * 0.6, -3.5 + 8.2 * s + 0.5 + i * 0.8, 0);
        g.add(puff);
      }
    }
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 12, 24), dark.clone());
    ch.position.set(0, 1.5, -0.5); g.add(ch);             // 烟囱
    addBox(g, 11, 1.4, 4.5, 0, -4, 0, dark);              // 厂房底座
    return g;
  }

  // ---------- 埃菲尔铁塔（≈法国全国用电）----------
  function buildEiffel() {
    const g = new THREE.Group();
    const metal = M({ color: 0x2b2f37, metalness: 0.72, roughness: 0.4 });
    const lit = M({ color: 0x141414, emissive: 0xf5b731, emissiveIntensity: 0.75 });
    const V = THREE.Vector3;
    function strut(p1, p2, thick, mat) {
      const dir = new V().subVectors(p2, p1);
      const len = dir.length();
      const m = new THREE.Mesh(new THREE.BoxGeometry(thick, len, thick), mat.clone());
      m.position.copy(p1).add(p2).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new V(0, 1, 0), dir.clone().normalize());
      g.add(m);
    }
    const L = [{ y: -6.5, w: 3.2 }, { y: -2.0, w: 1.7 }, { y: 2.4, w: 0.85 }, { y: 6.2, w: 0.4 }];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const ring = (w, y) => [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]
      .map(([x1, z1, x2, z2]) => [new V(x1 * w, y, z1 * w), new V(x2 * w, y, z2 * w)]);
    // 四条收窄的棱
    for (const [cx, cz] of corners)
      for (let i = 0; i < L.length - 1; i++)
        strut(new V(cx * L[i].w, L[i].y, cz * L[i].w), new V(cx * L[i + 1].w, L[i + 1].y, cz * L[i + 1].w), 0.26, metal);
    // 两层观景台（发光）
    for (const li of [1, 2]) for (const [a, b] of ring(L[li].w * 1.18, L[li].y)) strut(a, b, 0.3, lit);
    // 底部横梁（拱的暗示）
    for (const [a, b] of ring(L[0].w, L[0].y + 1.3)) strut(a, b, 0.22, metal);
    // 塔尖 + 顶灯
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.26, 2.2, 12), metal.clone());
    spire.position.set(0, 7.3, 0); g.add(spire);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), lit.clone());
    beacon.position.set(0, 8.5, 0); g.add(beacon);
    return g;
  }

  const models = [buildMicrowave(), buildServers(), buildPlant(), buildEiffel()];
  models.forEach((m, i) => { m.userData.op = i === 0 ? 1 : 0; sceneT.add(m); });

  // ---------- 粒子层：数量随滚动从小到大（setDrawRange 控制可见数）----------
  const DUST = 4200;
  const dPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    const r = 3 + Math.random() * 15;
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u);
    dPos[i * 3] = Math.cos(a) * s * r;
    dPos[i * 3 + 1] = u * r * 0.8;
    dPos[i * 3 + 2] = Math.sin(a) * s * r;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  dGeo.setDrawRange(0, 0);
  const dCanvas = document.createElement("canvas"); dCanvas.width = dCanvas.height = 32;
  const dx = dCanvas.getContext("2d");
  const drg = dx.createRadialGradient(16, 16, 0, 16, 16, 16);
  drg.addColorStop(0, "rgba(255,228,170,1)"); drg.addColorStop(1, "rgba(245,183,49,0)");
  dx.fillStyle = drg; dx.beginPath(); dx.arc(16, 16, 16, 0, 6.2832); dx.fill();
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({
    size: 0.22, map: new THREE.CanvasTexture(dCanvas), transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  sceneT.add(dust);

  function setOpacity(group, v) {
    group.userData.op = v;
    group.visible = v > 0.02;
    group.traverse((o) => { if (o.material) o.material.opacity = o.material.userData?.base != null ? o.material.userData.base * v : v; });
  }

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
    models.forEach((m, i) => {
      // 模型只在节点附近出现（爬升时为 0，只剩粒子）
      const target = i === st.stage ? st.nodeVis : 0;
      const op = m.userData.op + (target - m.userData.op) * 0.12;
      setOpacity(m, op);
      m.scale.setScalar((0.86 + 0.14 * op) * 0.82);
      if (op > 0.02) m.rotation.y += 0.005;
    });
    dGeo.setDrawRange(0, st.particles);
    dust.rotation.y -= 0.0005;
    dust.rotation.x = Math.sin(performance.now() / 9000) * 0.1;
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

  function fallbackMsg() {
    const ctx = canvas.getContext("2d");
    function rs() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = r.width * dpr; canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.fillStyle = "rgba(245,183,49,.85)"; ctx.font = "600 15px monospace"; ctx.textAlign = "center";
      ctx.fillText("（当前浏览器未启用 WebGL，3D 模型无法显示）", r.width / 2, r.height / 2);
    }
    rs(); window.addEventListener("resize", rs);
  }
}
