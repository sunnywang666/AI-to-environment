/* ============================================================
   云的身体 · 第3段 中美地图 · Pudding 式滚动叙事
   地图钉在视口；向下滚动文字分步出现，同一张地图依次飞向/高亮
   不同区域，聚焦区高亮、其余淡掉，顶部浮现大号标注。
   ============================================================ */

const CN_DRY = ["Xinjiang", "Xizang", "Qinghai", "Gansu", "Ningxia", "Nei Mongol", "Shaanxi"];
const US_DRY = ["Arizona", "Nevada", "Utah", "New Mexico", "California", "Colorado"];

const CN_NODES = [
  { name: "宁夏·中卫", lon: 105.19, lat: 37.5, w: 3, dry: true },
  { name: "内蒙古", lon: 111.7, lat: 40.8, w: 2.6, dry: true },
  { name: "甘肃·庆阳", lon: 107.64, lat: 35.7, w: 2, dry: true },
  { name: "贵州·贵安", lon: 106.6, lat: 26.4, w: 2.6 },
  { name: "京津冀", lon: 114.9, lat: 40.0, w: 2.2 },
  { name: "长三角", lon: 121.0, lat: 31.2, w: 3 },
  { name: "粤港澳", lon: 113.3, lat: 23.5, w: 2.6 },
  { name: "成渝", lon: 104.6, lat: 30.4, w: 2 },
];
const US_NODES = [
  { name: "弗吉尼亚", lon: -77.5, lat: 39.0, w: 3.6 },
  { name: "达拉斯", lon: -96.8, lat: 32.8, w: 2.4 },
  { name: "凤凰城", lon: -112.0, lat: 33.4, w: 2.4, dry: true },
  { name: "硅谷", lon: -121.9, lat: 37.4, w: 2.2, dry: true },
  { name: "芝加哥", lon: -87.6, lat: 41.8, w: 2 },
  { name: "亚特兰大", lon: -84.4, lat: 33.7, w: 2 },
  { name: "路州 Hyperion", lon: -91.2, lat: 30.5, w: 2 },
];

// 叙事步骤
const STEPS = {
  overview: { country: null, big: null, hi: null, zoom: null },
  "us-va":   { country: "us", big: ["≈600 座", "弗吉尼亚 · 占全州 40% 用电"], hi: ["弗吉尼亚"], zoom: "弗吉尼亚" },
  "us-clusters": { country: "us", big: ["45%", "全球用电 · 近半挤在 5 个集群"], hi: "all", zoom: null },
  "cn-ew":   { country: "cn", big: ["8 枢纽 10 集群", "东数西算 · 算力引向西部"], hi: "all", zoom: null },
  "cn-nx":   { country: "cn", big: ["200mm", "宁夏年降水 · 最缺水却扛最多服务器"], hi: ["宁夏·中卫"], zoom: "宁夏·中卫", dry: true },
};

export async function initMaps() {
  const scrolly = document.getElementById("mapScrolly");
  if (!scrolly || !window.d3) return;
  const d3 = window.d3;

  let cn, us;
  try {
    [cn, us] = await Promise.all([
      d3.json("data/china-provinces.json"),
      d3.json("data/us-states.json"),
    ]);
  } catch (e) { return; }

  const maps = {}; // {cn:{proj,inner,W,H}, us:{...}}

  function build(key, host, geo, nodes, drySet, projection) {
    host.querySelectorAll("svg").forEach((s) => s.remove());
    const W = host.clientWidth || 420;
    const H = host.clientHeight || 440;
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%").attr("height", "100%");
    const inner = svg.append("g").attr("class", "mapinner");
    projection.fitSize([W, H * 0.96], geo);
    const path = d3.geoPath(projection);
    inner.append("g").selectAll("path").data(geo.features).join("path")
      .attr("d", path)
      .attr("fill", (d) => drySet.some((k) => (d.properties.name || "").includes(k)) ? "#3d3320" : "#2a313b")
      .attr("stroke", "#5a6472").attr("stroke-width", 0.7);

    const pts = nodes.map((n) => ({ n, xy: projection([n.lon, n.lat]) })).filter((d) => d.xy);
    const ng = inner.append("g").selectAll("g.node").data(pts).join("g")
      .attr("class", "node").attr("data-name", (d) => d.n.name)
      .attr("transform", (d) => `translate(${d.xy[0]},${d.xy[1]})`);
    ng.filter((d) => d.n.dry).append("circle").attr("class", "ring")
      .attr("r", (d) => d.n.w * 2.2 + 5).attr("fill", "none").attr("stroke", "#3FB6C8").attr("stroke-width", 1.3);
    ng.append("circle").attr("class", "dot").attr("r", (d) => d.n.w * 2);
    ng.append("text").attr("x", (d) => d.n.w * 2 + 4).attr("dy", ".35em").text((d) => d.n.name);
    maps[key] = { proj: projection, inner, W, H, host };
  }

  function buildAll() {
    build("cn", document.getElementById("mapCN"), cn, CN_NODES, CN_DRY, d3.geoMercator());
    build("us", document.getElementById("mapUS"), us, US_NODES, US_DRY, d3.geoAlbersUsa());
  }

  const bigEl = document.getElementById("mapBig");

  function focus(step) {
    const s = STEPS[step] || STEPS.overview;
    // 淡掉非聚焦国家
    document.getElementById("mapCN").classList.toggle("dim", s.country === "us");
    document.getElementById("mapUS").classList.toggle("dim", s.country === "cn");
    // 大号标注
    if (s.big) {
      bigEl.querySelector(".n").textContent = s.big[0];
      bigEl.querySelector(".u").textContent = s.big[1];
      bigEl.classList.add("show");
      bigEl.classList.toggle("dry", !!s.dry);
    } else bigEl.classList.remove("show");
    // 高亮节点 + 飞向
    for (const key of ["cn", "us"]) {
      const m = maps[key]; if (!m) continue;
      const isFocus = s.country === key || s.country === null;
      m.inner.selectAll("g.node").each(function (d) {
        const on = isFocus && (s.hi === "all" || (s.hi && s.hi.includes(d.n.name)) || (!s.hi && s.country === null));
        const off = isFocus && s.hi && s.hi !== "all" && !s.hi.includes(d.n.name);
        this.classList.toggle("hi", !!on && s.hi != null);
        this.classList.toggle("off", !!off);
      });
      // 缩放飞向
      let t = "translate(0,0) scale(1)";
      if (s.country === key && s.zoom) {
        const node = (key === "cn" ? CN_NODES : US_NODES).find((n) => n.name === s.zoom);
        const xy = node && m.proj([node.lon, node.lat]);
        if (xy) { const k = 2.2; t = `translate(${m.W / 2 - k * xy[0]},${m.H / 2 - k * xy[1]}) scale(${k})`; }
      }
      m.inner.attr("transform", t);
    }
  }

  buildAll();
  focus("overview");

  // 步进观察
  const steps = [...scrolly.querySelectorAll(".step")];
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) focus(e.target.dataset.step); });
  }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
  steps.forEach((s) => io.observe(s));

  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { buildAll(); focus("overview"); }, 200);
  });
}
