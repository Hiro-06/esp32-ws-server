// npm i express ws
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

// ===== WebSocket =====
const wss = new WebSocket.Server({ server, path: "/ws" });

function broadcast(data) {
  for (const c of wss.clients) {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    broadcast(msg.toString());
  });
});

/* ===== 表示定義 =====
   type:
   normal = 通常カード
   gauge  = メータ表示
   bar    = バー表示
*/
const FIELDS = [
  // ===== 瞬時データ =====
  { group: "瞬時データ", key: "ntime", label: "現ラップタイム", unit: "", type: "normal" },
  { group: "瞬時データ", key: "kmph", label: "速度", unit: "km/h", type: "gauge", min: 0, max: 150 },
  { group: "瞬時データ", key: "v", label: "主幹電圧", unit: "V", type: "gauge", min: 0, max: 130 },

  { group: "瞬時データ", key: "im", label: "モータ電流", unit: "A", type: "normal" },
  { group: "瞬時データ", key: "ipv", label: "PV電流", unit: "A", type: "normal" },
  { group: "瞬時データ", key: "ib", label: "バッテリ電流", unit: "A", type: "normal" },

  { group: "瞬時データ", key: "pm", label: "モータ電力", unit: "W", type: "bar", min: -5000, max: 5000 },
  { group: "瞬時データ", key: "ppv", label: "PV電力", unit: "W", type: "bar", min: 0, max: 2000 },
  { group: "瞬時データ", key: "pb", label: "バッテリ電力", unit: "W", type: "bar", min: -5000, max: 5000 },

  // ===== GPSデータ =====
  { group: "GPSデータ", key: "lat", label: "緯度", unit: "", type: "normal" },
  { group: "GPSデータ", key: "lng", label: "経度", unit: "", type: "normal" },
  { group: "GPSデータ", key: "course", label: "方位", unit: "deg", type: "normal" },

  // ===== 現ラップデータ =====
  { group: "現ラップデータ", key: "pim", label: "現ラップモータ電力量", unit: "Wh", type: "normal" },
  { group: "現ラップデータ", key: "pipv", label: "現ラップPV電力量", unit: "Wh", type: "normal" },
  { group: "現ラップデータ", key: "pib", label: "現ラップバッテリ電力量", unit: "Wh", type: "normal" },

  // ===== 前ラップデータ =====
  { group: "前ラップデータ", key: "otime", label: "前ラップタイム", unit: "", type: "normal" },
  { group: "前ラップデータ", key: "pimo", label: "前ラップモータ電力量", unit: "Wh", type: "normal" },
  { group: "前ラップデータ", key: "pipvo", label: "前ラップPV電力量", unit: "Wh", type: "normal" },
  { group: "前ラップデータ", key: "pibo", label: "前ラップバッテリ電力量", unit: "Wh", type: "normal" },

  // ===== トータルデータ =====
  { group: "トータルデータ", key: "ttime", label: "トータルタイム", unit: "", type: "normal" },
  { group: "トータルデータ", key: "pimt", label: "トータルモータ電力量", unit: "Wh", type: "normal" },
  { group: "トータルデータ", key: "pipvt", label: "トータルPV電力量", unit: "Wh", type: "normal" },
  { group: "トータルデータ", key: "pibt", label: "トータルバッテリ電力量", unit: "Wh", type: "normal" },
  { group: "トータルデータ", key: "lc", label: "ラップ数", unit: "", type: "normal" },
];

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OIT TEAM REGALIA 宮 ミル子</title>

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

<style>
  * { box-sizing: border-box; }

  body {
    font-family: system-ui, sans-serif;
    margin: 20px;
    background: #0b0f19;
    color: #ffffff;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 30px;
    font-weight: 900;
  }

  .status {
    margin-bottom: 18px;
    font-weight: 900;
    font-size: 16px;
  }

  .ok { color: #22c55e; }
  .ng { color: #ef4444; }

  /* ===== 地図表示 ===== */
  #map {
  width: 100%;
  height: 840px;
  border-radius: 16px;
  border: 1px solid #374151;
  margin-bottom: 18px;
  overflow: hidden;
  background: #111827;
}

.position-control {
  background: rgba(17, 24, 39, 0.92);
  color: #ffffff;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.position-title {
  font-size: 13px;
  font-weight: 900;
  margin-bottom: 6px;
  text-align: center;
}

.position-control button {
  display: block;
  width: 80px;
  margin: 4px 0;
  padding: 6px 8px;
  border: 1px solid #475569;
  border-radius: 8px;
  background: #111827;
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
}

.position-control button:hover {
  background: #1f2937;
}

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .group-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 900;
    background: #111827;
    color: #ffffff;
    border: 1px solid #374151;
  }

  .group-title::before {
    content: "";
    width: 12px;
    height: 22px;
    border-radius: 8px;
    display: inline-block;
  }

  .g-now::before { background: #2563eb; }
  .g-gps::before { background: #ef4444; }
  .g-lap::before { background: #f59e0b; }
  .g-prev::before { background: #7c3aed; }
  .g-total::before { background: #16a34a; }

  .group-grid {
    display: grid;
    gap: 14px;
    width: 100%;
  }

  .instant-grid { grid-template-columns: repeat(3, 1fr); }
  .gps-grid { grid-template-columns: repeat(3, 1fr); }
  .lap-grid { grid-template-columns: repeat(3, 1fr); }
  .prev-grid { grid-template-columns: repeat(4, 1fr); }
  .total-grid { grid-template-columns: repeat(5, 1fr); }

  .card {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 16px;
    padding: 14px 16px;
    min-height: 110px;
  }

  .card.now { border-left: 7px solid #2563eb; }
  .card.gps { border-left: 7px solid #ef4444; }
  .card.lap { border-left: 7px solid #f59e0b; }
  .card.prev { border-left: 7px solid #7c3aed; }
  .card.total { border-left: 7px solid #16a34a; }

  .label {
    font-size: 14px;
    font-weight: 700;
    color: #cbd5e1;
  }

  .value-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 8px;
  }

  .value {
    font-size: 38px;
    line-height: 1.1;
    font-weight: 900;
    color: #ffffff;
  }

  .unit {
    font-size: 17px;
    font-weight: 900;
    color: #94a3b8;
  }

  /* ===== メータ表示 ===== */
  .gauge-card {
    min-height: 220px;
  }

  .gauge-wrap {
    position: relative;
    margin-top: 8px;
    height: 145px;
  }

  .gauge-svg {
    width: 100%;
    height: 135px;
  }

  .gauge-bg {
    fill: none;
    stroke: #374151;
    stroke-width: 14;
    stroke-linecap: round;
  }

  .gauge-main {
    fill: none;
    stroke: #38bdf8;
    stroke-width: 14;
    stroke-linecap: round;
  }

  .gauge-needle {
    stroke: #ffffff;
    stroke-width: 5;
    stroke-linecap: round;
    transform-origin: 100px 100px;
    transition: transform 0.2s ease-out;
  }

  .gauge-center {
    fill: #ffffff;
  }

  .gauge-value {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    text-align: center;
  }

  .gauge-value .value {
    font-size: 42px;
  }

  /* ===== バー表示 ===== */
  .bar-card {
    min-height: 130px;
  }

  .bar-track {
    width: 100%;
    height: 18px;
    background: #374151;
    border-radius: 999px;
    margin-top: 16px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    width: 0%;
    background: #38bdf8;
    border-radius: 999px;
    transition: width 0.2s ease-out;
  }
　  @media (max-width: 900px) {
    .instant-grid,
    .gps-grid,
    .lap-grid,
    .prev-grid,
    .total-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    body { margin: 12px; }

    h1 { font-size: 22px; }

    #map {
      height: 320px;
    }

    .instant-grid,
    .gps-grid,
    .lap-grid,
    .prev-grid,
    .total-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .value { font-size: 32px; }

    .gauge-value .value {
      font-size: 36px;
    }
  }
</style>
</head>

<body>
<h1>OIT TEAM REGALIA 宮 ミル子</h1>
<div id="status" class="status ng">WS: connecting…</div>

<div id="map"></div>

<div id="grid" class="grid"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script>
  const FIELDS = ${JSON.stringify(FIELDS)};
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");

  const values = {};
  const gauges = {};
  const bars = {};

  // ===== 地図設定 =====
  // 表示位置と縮尺はここで固定されます。
  // 必要に応じて、FIXED_LAT / FIXED_LNG / FIXED_ZOOM を変更してください。
  //下記は表示条件に合わせて変更
  // 例：大阪付近
  //const FIXED_LAT = 34.6937;
  //const FIXED_LNG = 135.5023;
  //const FIXED_ZOOM = 15;

    // 例：秋田  付近
  //const FIXED_LAT = 39.9852;
  //const FIXED_LNG = 140.0049;
  //const FIXED_ZOOM = 13;

   // 例：八幡  付近
  //const FIXED_LAT = 34.8503;
  //const FIXED_LNG = 135.7103;
  //const FIXED_ZOOM = 20;

   // 例：白浜  付近
  //const FIXED_LAT = 33.6649;
  //const FIXED_LNG = 135.3561;
  //const FIXED_ZOOM = 14;

  let FIXED_LAT = 39.9852;
let FIXED_LNG = 140.0049;
let FIXED_ZOOM = 13;

  const map = L.map("map", {
    zoomControl: true
  }).setView([FIXED_LAT, FIXED_LNG], FIXED_ZOOM);

const normalMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
});

const satelliteMap = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution: "&copy; Esri"
  }
);

// 初期表示は通常地図
normalMap.addTo(map);

// 右上に切り替えボタンを表示
const baseMaps = {
  "通常地図": normalMap,
  "衛星画像": satelliteMap
};

L.control.layers(baseMaps, null, {
  collapsed: false
}).addTo(map);

  // GPS受信前は固定中心位置にピンを置く
  const marker = L.marker([FIXED_LAT, FIXED_LNG]).addTo(map);
  marker.bindPopup("GPS waiting...");

  // 走行軌跡
  const routeLine = L.polyline([], {
    color: "red",
    weight: 4
  }).addTo(map);

// ===== 表示位置・縮尺切り替えボタン =====
const mapPositions = {
  "秋田": { lat: 39.9852, lng: 140.0049, zoom: 13 },
  "八幡": { lat: 34.8503, lng: 135.7103, zoom: 18 },
  "白浜": { lat: 33.6649, lng: 135.3561, zoom: 14 },
  "大阪": { lat: 34.6937, lng: 135.5023, zoom: 15 }
};

const positionControl = L.control({ position: "topright" });

positionControl.onAdd = function () {
  const div = L.DomUtil.create("div", "position-control");

  div.innerHTML = `
    <div class="position-title">表示位置</div>
    <button type="button" data-place="秋田">秋田</button>
    <button type="button" data-place="八幡">八幡</button>
    <button type="button" data-place="白浜">白浜</button>
    <button type="button" data-place="大阪">大阪</button>
  `;

  L.DomEvent.disableClickPropagation(div);
  L.DomEvent.disableScrollPropagation(div);

  div.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const place = btn.dataset.place;
      const p = mapPositions[place];
      if (!p) return;

      FIXED_LAT = p.lat;
      FIXED_LNG = p.lng;
      FIXED_ZOOM = p.zoom;

      map.setView([FIXED_LAT, FIXED_LNG], FIXED_ZOOM);
    });
  });

  return div;
};

positionControl.addTo(map);

  let lastLat = null;
  let lastLng = null;

  function groupClass(g) {
    if (g === "瞬時データ") return { title: "g-now", card: "now", grid: "instant-grid" };
    if (g === "GPSデータ") return { title: "g-gps", card: "gps", grid: "gps-grid" };
    if (g === "現ラップデータ") return { title: "g-lap", card: "lap", grid: "lap-grid" };
    if (g === "前ラップデータ") return { title: "g-prev", card: "prev", grid: "prev-grid" };
    if (g === "トータルデータ") return { title: "g-total", card: "total", grid: "total-grid" };
    return { title: "", card: "", grid: "" };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createNormalCard(f, cardClass) {
    const card = document.createElement("div");
    card.className = "card " + cardClass;

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = f.label;

    const row = document.createElement("div");
    row.className = "value-row";

    const val = document.createElement("span");
    val.className = "value";
    val.textContent = "—";

    const unit = document.createElement("span");
    unit.className = "unit";
    unit.textContent = f.unit;

    row.appendChild(val);
    if (f.unit) row.appendChild(unit);

    card.appendChild(label);
    card.appendChild(row);

    return { card, val };
  }
　　  function createGaugeCard(f, cardClass) {
    const card = document.createElement("div");
    card.className = "card " + cardClass + " gauge-card";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = f.label;

    const wrap = document.createElement("div");
    wrap.className = "gauge-wrap";

    wrap.innerHTML = \`
      <svg class="gauge-svg" viewBox="0 0 200 125">
        <path class="gauge-bg" d="M 30 100 A 70 70 0 0 1 170 100"></path>
        <path class="gauge-main" d="M 30 100 A 70 70 0 0 1 170 100"></path>
        <line class="gauge-needle" x1="100" y1="100" x2="100" y2="42"></line>
        <circle class="gauge-center" cx="100" cy="100" r="6"></circle>
      </svg>
      <div class="gauge-value">
        <span class="value">—</span>
        <span class="unit">\${f.unit}</span>
      </div>
    \`;

    card.appendChild(label);
    card.appendChild(wrap);

    const val = wrap.querySelector(".value");
    const needle = wrap.querySelector(".gauge-needle");
    const arc = wrap.querySelector(".gauge-main");

    return { card, val, needle, arc, min: f.min, max: f.max };
  }

  function createBarCard(f, cardClass) {
    const normal = createNormalCard(f, cardClass);
    normal.card.classList.add("bar-card");

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";

    track.appendChild(fill);
    normal.card.appendChild(track);

    return { card: normal.card, val: normal.val, fill, min: f.min, max: f.max };
  }

  let currentGroup = "";
  let currentCardClass = "";
  let currentGroupContainer = null;

  FIELDS.forEach((f) => {
    if (f.group !== currentGroup) {
      currentGroup = f.group;
      const cls = groupClass(currentGroup);

      const title = document.createElement("div");
      title.className = "group-title " + cls.title;
      title.textContent = currentGroup;
      grid.appendChild(title);

      currentCardClass = cls.card;

      currentGroupContainer = document.createElement("div");
      currentGroupContainer.className = "group-grid " + cls.grid;
      grid.appendChild(currentGroupContainer);
    }

    let created;

    if (f.type === "gauge") {
      created = createGaugeCard(f, currentCardClass);
      gauges[f.key] = created;
    } else if (f.type === "bar") {
      created = createBarCard(f, currentCardClass);
      bars[f.key] = created;
    } else {
      created = createNormalCard(f, currentCardClass);
    }

    currentGroupContainer.appendChild(created.card);

    if (!values[f.key]) values[f.key] = [];
    values[f.key].push(created.val);
  });

  function updateGauge(key, rawValue) {
    const g = gauges[key];
    if (!g) return;

    const value = Number(rawValue);
    if (Number.isNaN(value)) return;

    const min = g.min;
    const max = g.max;
    const ratio = (clamp(value, min, max) - min) / (max - min);

    const angle = -90 + ratio * 180;
    g.needle.style.transform = \`rotate(\${angle}deg)\`;

    const dash = ratio * 220;
    g.arc.style.strokeDasharray = \`\${dash} 220\`;
  }

  function updateBar(key, rawValue) {
    const b = bars[key];
    if (!b) return;

    const value = Number(rawValue);
    if (Number.isNaN(value)) return;

    const min = b.min;
    const max = b.max;
    const ratio = (clamp(value, min, max) - min) / (max - min);

    b.fill.style.width = (ratio * 100) + "%";
  }
    function updateMap(obj) {
    if (obj.lat === undefined || obj.lng === undefined) return;

    const lat = Number(obj.lat);
    const lng = Number(obj.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    if (lat === 0 && lng === 0) return;

    // ピンのみ移動
    marker.setLatLng([lat, lng]);

    const speed = obj.kmph !== undefined ? obj.kmph : "—";
    const voltage = obj.v !== undefined ? obj.v : "—";
    const course = obj.course !== undefined ? obj.course : "—";

    marker.bindPopup(
      "現在位置<br>" +
      "緯度: " + lat.toFixed(6) + "<br>" +
      "経度: " + lng.toFixed(6) + "<br>" +
      "速度: " + speed + " km/h<br>" +
      "主幹電圧: " + voltage + " V<br>" +
      "方位: " + course + " deg"
    );

    // 走行軌跡を追加
    if (lastLat !== lat || lastLng !== lng) {
      routeLine.addLatLng([lat, lng]);
      lastLat = lat;
      lastLng = lng;
    }

    // 地図の表示位置と縮尺は固定するため、
    // map.setView() や map.panTo() は使用しません。
  }

  const wsProto = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = wsProto + "://" + location.host + "/ws";

  function connect() {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      statusEl.textContent = "WS: connected";
      statusEl.className = "status ok";
    };

    ws.onclose = () => {
      statusEl.textContent = "WS: disconnected (retrying)";
      statusEl.className = "status ng";
      setTimeout(connect, 1000);
    };

    ws.onerror = () => {
      statusEl.textContent = "WS: error";
      statusEl.className = "status ng";
    };

    ws.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data);

        for (const key in obj) {
          if (values[key]) {
            values[key].forEach((span) => {
              span.textContent = obj[key];
            });
          }

          updateGauge(key, obj[key]);
          updateBar(key, obj[key]);
        }

        updateMap(obj);

      } catch (e) {
        console.log("JSON parse error:", ev.data);
      }
    };
  }

  connect();
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, "0.0.0.0", () => {
  console.log("listening on", PORT);
});
