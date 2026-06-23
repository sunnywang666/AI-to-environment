/* ============================================================
   云的身体 · 图表
   第6段：杰文斯悖论双轴折线（单次能耗↓ vs 全球总用电↑）
   ============================================================ */

// 全球数据中心总用电（TWh）：2024=415、2025=448 为实测锚点，2026+ 为预测
const TOTAL = [
  { y: 2018, v: 200 }, { y: 2019, v: 225 }, { y: 2020, v: 255 },
  { y: 2021, v: 290 }, { y: 2022, v: 330 }, { y: 2023, v: 370 },
  { y: 2024, v: 415 }, { y: 2025, v: 448 },
  { y: 2026, v: 525, proj: true }, { y: 2027, v: 615, proj: true },
  { y: 2028, v: 720, proj: true }, { y: 2029, v: 825, proj: true },
  { y: 2030, v: 935, proj: true },
];
// 单次查询相对能耗指数（效率提升 → 下降）；示意趋势
const PERQ = [
  { y: 2018, v: 100 }, { y: 2019, v: 82 }, { y: 2020, v: 66 },
  { y: 2021, v: 52 }, { y: 2022, v: 41 }, { y: 2023, v: 33 },
  { y: 2024, v: 27 }, { y: 2025, v: 22 }, { y: 2026, v: 19, proj: true },
  { y: 2027, v: 16, proj: true }, { y: 2028, v: 14, proj: true },
  { y: 2029, v: 12, proj: true }, { y: 2030, v: 11, proj: true },
];

// 各国一年用电（TWh，约值）+ 数据中心插入
const RANK = [
  { n: "加拿大", v: 580 },
  { n: "巴西", v: 540 },
  { n: "德国", v: 510 },
  { n: "法国", v: 450 },
  { n: "数据中心", v: 448, dc: true },
  { n: "英国", v: 310 },
  { n: "意大利", v: 300 },
  { n: "西班牙", v: 250 },
  { n: "阿根廷", v: 135 },
];

export function initRanking() {
  const mount = document.getElementById("ranking-mount");
  if (!mount || !window.d3) return;
  mount.classList.remove("placeholder");
  mount.innerHTML = `<div class="chart" id="rankChart"></div>
    <p class="chart__cap">把"数据中心"当成一个国家，插进全球用电排行——一年 <span class="e-text">448 TWh</span>，
    紧挨着法国，超过英国、意大利……以及全球除前十名外的所有国家。
    <span class="source">数据中心：UNU-INWEH 2025；各国用电为近年约值</span></p>`;

  const host = mount.querySelector("#rankChart");
  const d3 = window.d3;

  function draw() {
    host.innerHTML = "";
    const W = host.clientWidth || 680;
    const rowH = 34, m = { t: 8, r: 64, b: 8, l: 86 };
    const H = RANK.length * rowH + m.t + m.b;
    const iw = W - m.l - m.r;
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);
    const x = d3.scaleLinear().domain([0, 600]).range([0, iw]);
    const y = d3.scaleBand().domain(RANK.map(d => d.n)).range([0, RANK.length * rowH]).padding(0.28);

    const rows = g.selectAll("g.row").data(RANK).join("g")
      .attr("class", "row").attr("transform", d => `translate(0,${y(d.n)})`);
    rows.append("text").attr("x", -10).attr("y", y.bandwidth() / 2).attr("dy", ".35em")
      .attr("text-anchor", "end").attr("font-family", "Noto Sans SC")
      .attr("font-weight", d => d.dc ? 700 : 400).attr("font-size", 13)
      .attr("fill", d => d.dc ? "#F5B731" : "#ECEAE3").text(d => d.n);
    const bars = rows.append("rect").attr("x", 0).attr("y", 0).attr("height", y.bandwidth())
      .attr("rx", 3).attr("fill", d => d.dc ? "#F5B731" : "#2A2D34")
      .attr("stroke", d => d.dc ? "none" : "#4A4E57").attr("stroke-width", 1)
      .attr("width", 0);
    rows.append("text").attr("class", "val").attr("x", 4).attr("y", y.bandwidth() / 2).attr("dy", ".35em")
      .attr("font-family", "Roboto Mono").attr("font-size", 12)
      .attr("fill", d => d.dc ? "#F5B731" : "#8A8E96").attr("opacity", 0).text(d => d.v + " TWh");
    bars.transition().duration(1100).ease(d3.easeCubicOut).attr("width", d => x(d.v))
      .style("filter", d => d.dc ? "drop-shadow(0 0 8px rgba(245,183,49,.6))" : "none");
    rows.selectAll("text.val").transition().delay(900).duration(400)
      .attr("x", d => x(d.v) + 6).attr("opacity", 1);
  }

  const io = new IntersectionObserver((es) => {
    es.forEach(e => { if (e.isIntersecting) { draw(); io.disconnect(); } });
  }, { threshold: 0.3 });
  io.observe(host);
  window.addEventListener("resize", () => { if (host.querySelector("svg")) draw(); });
}

export function initJevons() {
  const mount = document.getElementById("ending-mount");
  if (!mount || !window.d3) return;
  mount.classList.remove("placeholder");
  mount.innerHTML = `<div class="chart" id="jevonsChart"></div>
    <p class="chart__cap">单次查询的能耗在<span class="w-text">下降</span>，可总用电却在<span class="e-text">飙升</span>——
    一年里用户翻 3 倍、营收翻约 5 倍，省下的效率被使用量轻松吞没。这就是<strong>杰文斯悖论</strong>。
    <span class="source">实线＝实测，虚线＝预测（IEA / UNU-INWEH）</span></p>`;

  const host = mount.querySelector("#jevonsChart");
  const d3 = window.d3;

  function draw() {
    host.innerHTML = "";
    const W = host.clientWidth || 680;
    const H = Math.min(420, Math.max(300, W * 0.56));
    const m = { t: 24, r: 54, b: 34, l: 52 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const svg = d3.select(host).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%").attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);

    const x = d3.scaleLinear().domain([2018, 2030]).range([0, iw]);
    const yL = d3.scaleLinear().domain([0, 1000]).range([ih, 0]);
    const yR = d3.scaleLinear().domain([0, 105]).range([ih, 0]);

    // 轴
    g.append("g").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(7))
      .attr("color", "#8A8E96").attr("font-family", "Roboto Mono").attr("font-size", 11);
    g.append("g").call(d3.axisLeft(yL).ticks(5))
      .attr("color", "#8A8E96").attr("font-family", "Roboto Mono").attr("font-size", 11);
    g.append("g").attr("transform", `translate(${iw},0)`).call(d3.axisRight(yR).ticks(5))
      .attr("color", "#8A8E96").attr("font-family", "Roboto Mono").attr("font-size", 11);
    g.append("text").attr("x", 0).attr("y", -8).attr("fill", "#F5B731")
      .attr("font-family", "Roboto Mono").attr("font-size", 11).text("总用电 TWh");
    g.append("text").attr("x", iw).attr("y", -8).attr("text-anchor", "end").attr("fill", "#3FB6C8")
      .attr("font-family", "Roboto Mono").attr("font-size", 11).text("单次能耗指数");

    const split = 2025; // 实测/预测分界
    function series(data, scale, color) {
      const line = d3.line().x(d => x(d.y)).y(d => scale(d.v)).curve(d3.curveMonotoneX);
      const solid = data.filter(d => d.y <= split);
      const dash = data.filter(d => d.y >= split);
      const p1 = g.append("path").datum(solid).attr("fill", "none").attr("stroke", color)
        .attr("stroke-width", 2.5).attr("d", line);
      const p2 = g.append("path").datum(dash).attr("fill", "none").attr("stroke", color)
        .attr("stroke-width", 2.5).attr("stroke-dasharray", "5 5").attr("opacity", .7).attr("d", line);
      [p1, p2].forEach(p => {
        const L = p.node().getTotalLength();
        p.attr("stroke-dasharray", p === p2 ? "5 5" : L)
          .attr("stroke-dashoffset", p === p2 ? 0 : L);
        if (p === p1) p.transition().duration(1400).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
        else p.attr("opacity", 0).transition().delay(1200).duration(600).attr("opacity", .7);
      });
    }
    series(TOTAL, yL, "#F5B731");
    series(PERQ, yR, "#3FB6C8");

    // 448 锚点标注
    const a = TOTAL.find(d => d.y === 2025);
    g.append("circle").attr("cx", x(2025)).attr("cy", yL(448)).attr("r", 4).attr("fill", "#F5B731");
    g.append("text").attr("x", x(2025) - 6).attr("y", yL(448) - 10).attr("text-anchor", "end")
      .attr("fill", "#ECEAE3").attr("font-family", "Roboto Mono").attr("font-size", 12).text("448");
  }

  const io = new IntersectionObserver((es) => {
    es.forEach(e => { if (e.isIntersecting) { draw(); io.disconnect(); } });
  }, { threshold: 0.3 });
  io.observe(host);
  window.addEventListener("resize", () => { if (host.querySelector("svg")) draw(); });
}
