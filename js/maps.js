/* ============================================================
   云的身体 · 第3段 中美双联地图
   省/州暗色底；数据中心集群=琥珀点；缺水地区染暖色、缺水节点加青环。
   ============================================================ */

// Natural Earth 用英文省名；用包含匹配更稳
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

export async function initMaps() {
  const mount = document.getElementById("maps-mount");
  if (!mount || !window.d3) return;
  const d3 = window.d3;
  mount.classList.remove("placeholder");
  mount.innerHTML = `
    <div class="maps">
      <div class="map" id="mapCN"><h4>中国 · 东数西算</h4></div>
      <div class="map" id="mapUS"><h4>美国 · 五大集群</h4></div>
    </div>
    <div class="maps__legend">
      <span><i class="dot"></i> 数据中心集群</span>
      <span><i class="ring"></i> 建在缺水地区</span>
      <span><i class="dry"></i> 缺水 / 干旱区</span>
    </div>
    <p class="chart__cap">把"云"钉到经纬度上——中美的大集群，<strong>很多正建在已经缺水的地方</strong>：
    美国近一半容量挤在 5 个集群，中国"东数西算"把算力引向西部，可西部恰恰最缺水。
    <span class="source">集群位置为示意；缺水区参考 WRI Aqueduct 干旱分布</span></p>`;

  let cn, us;
  try {
    [cn, us] = await Promise.all([
      d3.json("data/china-provinces.json"),
      d3.json("data/us-states.json"),
    ]);
  } catch (e) { return; }

  cn.features = cn.features.filter((f) => (f.properties.name || "") !== "南海诸岛");

  function render() {
    drawMap("#mapCN", cn, CN_NODES, CN_DRY, "name", d3.geoMercator(), true);
    drawMap("#mapUS", us, US_NODES, US_DRY, "name", d3.geoAlbersUsa(), false);
  }

  function drawMap(sel, geo, nodes, drySet, nameKey, projection, isCN) {
    const host = mount.querySelector(sel);
    host.querySelectorAll("svg").forEach((s) => s.remove());
    const W = host.clientWidth || 420;
    const H = Math.max(260, W * 0.72);
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%").attr("height", H);

    if (isCN) projection.fitSize([W, H * 0.98], geo);
    else projection.fitSize([W, H], geo);
    const path = d3.geoPath(projection);

    svg.append("g").selectAll("path").data(geo.features).join("path")
      .attr("d", path)
      .attr("fill", (d) => drySet.some((k) => (d.properties[nameKey] || "").includes(k)) ? "#2c2519" : "#1b1f25")
      .attr("stroke", "#3a3f48").attr("stroke-width", 0.5);

    const g = svg.append("g");
    const pts = nodes.map((n) => ({ n, xy: projection([n.lon, n.lat]) })).filter((d) => d.xy);
    const node = g.selectAll("g.node").data(pts).join("g")
      .attr("transform", (d) => `translate(${d.xy[0]},${d.xy[1]})`);
    // 缺水环
    node.filter((d) => d.n.dry).append("circle").attr("r", (d) => d.n.w * 2.4 + 5)
      .attr("fill", "none").attr("stroke", "#3FB6C8").attr("stroke-width", 1.4).attr("opacity", 0)
      .transition().delay((d, i) => 600 + i * 80).duration(500).attr("opacity", .8);
    // 主点
    node.append("circle").attr("r", 0)
      .attr("fill", "#F5B731").style("filter", "drop-shadow(0 0 5px rgba(245,183,49,.7))")
      .transition().delay((d, i) => i * 80).duration(500).attr("r", (d) => d.n.w * 2.2);
    // 标签
    node.append("text").attr("x", (d) => d.n.w * 2.2 + 4).attr("dy", ".35em")
      .attr("font-family", "Noto Sans SC").attr("font-size", 10.5)
      .attr("fill", "#ECEAE3").attr("opacity", 0).text((d) => d.n.name)
      .transition().delay((d, i) => 300 + i * 80).duration(400).attr("opacity", .85);
  }

  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { render(); io.disconnect(); } });
  }, { threshold: 0.2 });
  io.observe(mount.querySelector(".maps"));
  window.addEventListener("resize", () => { if (mount.querySelector("svg")) render(); });
}
