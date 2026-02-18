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

/* ===== 表示定義（ここを編集するだけ）=====
   key : ESP32から来るJSONキー
   label : 表示名
   unit : 単位（空文字可）
*/
const FIELDS = [
  // 現ラップ
  { key: "ntime",  label: "現ラップタイム",        unit: "" },
  { key: "kmph",   label: "速度",           unit: "km/h" },
  { key: "v",      label: "主幹電圧",     unit: "V" },
  { key: "im",     label: "モータ電流",   unit: "A" },
  { key: "ipv",    label: "PV電流",      unit: "A" },
  { key: "ib",     label: "バッテリ電流", unit: "A" },
  { key: "pm",     label: "モータ電力",     unit: "W" },
  { key: "ppv",    label: "PV電力",        unit: "W" },
  { key: "pb",     label: "バッテリ電力",   unit: "W" },
  { key: "pim",    label: "現ラップモータ電力量",   unit: "Wh" },
  { key: "pipv",   label: "現ラップPV電力量",      unit: "Wh" },
  { key: "pib",    label: "現ラップバッテリ電力量", unit: "Wh" },

  // 前ラップ
  
  { key: "otime",  label: "前ラップタイム",        unit: "" },
  { key: "pimo",   label: "前ラップモータ電力量",  unit: "Wh" },
  { key: "pipvo",  label: "前ラップPV電力量",     unit: "Wh" },
  { key: "pibo",   label: "前ラップバッテリ電力量",unit: "Wh" },
  
  // トータル
  
  { key: "ttime",  label: "トータルタイム",      unit: "" },
  { key: "pimt",   label: "トータルモータ電力量", unit: "Wh" },
  { key: "pipvt",  label: "トータルPV電力量",    unit: "Wh" },
  { key: "pibt",   label: "トータルバッテリ電力量",unit: "Wh" },
  
];

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OIT TEAM REGALIA　宮　ミル子</title>

<style>
  body {
    font-family: system-ui, sans-serif;
    margin: 24px;
    background: #fafafa;
  }
  h1 { margin-bottom: 6px; }

  .status {
    margin-bottom: 16px;
    font-weight: 700;
  }
  .ok { color: #0a7a32; }
  .ng { color: #b00020; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }

  .card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 14px;
    padding: 14px 16px;
  }

  .label {
    font-size: 13px;
    color: #666;
  }

  .value-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 6px;
  }

  .value {
    font-size: 30px;
    font-weight: 800;
  }

  .unit {
    font-size: 16px;
    font-weight: 700;
    color: #555;
  }
</style>
</head>

<body>
<h1>OIT TEAM REGALIA　宮　ミル子</h1>
<div id="status" class="status ng">WS: connecting…</div>

<div id="grid" class="grid"></div>

<script>
  const FIELDS = ${JSON.stringify(FIELDS)};
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");

  const values = {}; // key -> span

  // ===== 固定カード生成 =====
  FIELDS.forEach(f => {
    const card = document.createElement("div");
    card.className = "card";

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
    grid.appendChild(card);

    values[f.key] = val;
  });

  // ===== WebSocket =====
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

    ws.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data);
        for (const f of FIELDS) {
          if (obj[f.key] !== undefined) {
            values[f.key].textContent = obj[f.key];
          }
        }
      } catch {}
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
