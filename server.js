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
  // 時間
  { key: "ntime",  label: "Lap Time",        unit: "" },
  { key: "otime",  label: "Prev Lap",        unit: "" },
  { key: "ttime",  label: "Total Time",      unit: "" },

  // 走行
  { key: "kmph",   label: "Speed",           unit: "km/h" },

  // 電圧・電流
  { key: "v",      label: "Bus Voltage",     unit: "V" },
  { key: "im",     label: "Motor Current",   unit: "A" },
  { key: "ipv",    label: "PV Current",      unit: "A" },
  { key: "ib",     label: "Battery Current", unit: "A" },

  // 瞬時電力
  { key: "pm",     label: "Motor Power",     unit: "W" },
  { key: "ppv",    label: "PV Power",        unit: "W" },
  { key: "pb",     label: "Battery Power",   unit: "W" },

  // ラップ積算
  { key: "pim",    label: "Motor Energy (Lap)",   unit: "Wh" },
  { key: "pipv",   label: "PV Energy (Lap)",      unit: "Wh" },
  { key: "pib",    label: "Battery Energy (Lap)", unit: "Wh" },

  // 前ラップ
  { key: "pimo",   label: "Motor Energy (Prev)",  unit: "Wh" },
  { key: "pipvo",  label: "PV Energy (Prev)",     unit: "Wh" },
  { key: "pibo",   label: "Battery Energy (Prev)",unit: "Wh" },

  // 総積算
  { key: "pimt",   label: "Motor Energy (Total)", unit: "Wh" },
  { key: "pipvt",  label: "PV Energy (Total)",    unit: "Wh" },
  { key: "pibt",   label: "Battery Energy (Total)",unit: "Wh" },
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
