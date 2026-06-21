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

/* ===== 表示定義 ===== */
const FIELDS = [
  // ===== 瞬時データ =====
  { group: "瞬時データ", key: "ntime", label: "現ラップタイム", unit: "" },
  { group: "瞬時データ", key: "kmph", label: "速度", unit: "km/h", important: true },
  { group: "瞬時データ", key: "v", label: "主幹電圧", unit: "V", important: true },

  { group: "瞬時データ", key: "im", label: "モータ電流", unit: "A" },
  { group: "瞬時データ", key: "ipv", label: "PV電流", unit: "A" },
  { group: "瞬時データ", key: "ib", label: "バッテリ電流", unit: "A" },

  { group: "瞬時データ", key: "pm", label: "モータ電力", unit: "W", important: true },
  { group: "瞬時データ", key: "ppv", label: "PV電力", unit: "W" },
  { group: "瞬時データ", key: "pb", label: "バッテリ電力", unit: "W" },

  // ===== 現ラップデータ =====
  { group: "現ラップデータ", key: "ntime", label: "現ラップタイム", unit: "" },
  { group: "現ラップデータ", key: "pim", label: "現ラップモータ電力量", unit: "Wh" },
  { group: "現ラップデータ", key: "pipv", label: "現ラップPV電力量", unit: "Wh" },
  { group: "現ラップデータ", key: "pib", label: "現ラップバッテリ電力量", unit: "Wh" },

  // ===== 前ラップデータ =====
  { group: "前ラップデータ", key: "otime", label: "前ラップタイム", unit: "" },
  { group: "前ラップデータ", key: "pimo", label: "前ラップモータ電力量", unit: "Wh" },
  { group: "前ラップデータ", key: "pipvo", label: "前ラップPV電力量", unit: "Wh" },
  { group: "前ラップデータ", key: "pibo", label: "前ラップバッテリ電力量", unit: "Wh" },

  // ===== トータルデータ =====
  { group: "トータルデータ", key: "ttime", label: "トータルタイム", unit: "" },
  { group: "トータルデータ", key: "pimt", label: "トータルモータ電力量", unit: "Wh" },
  { group: "トータルデータ", key: "pipvt", label: "トータルPV電力量", unit: "Wh" },
  { group: "トータルデータ", key: "pibt", label: "トータルバッテリ電力量", unit: "Wh" },
  { group: "トータルデータ", key: "lc", label: "ラップ数", unit: "" },
];

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OIT TEAM REGALIA 宮 ミル子</title>

<style>
  * {
    box-sizing: border-box;
  }

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

  .ok {
    color: #22c55e;
  }

  .ng {
    color: #ef4444;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }

  .instant-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .group-title {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: .04em;
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

  .g-now::before {
    background: #2563eb;
  }

  .g-lap::before {
    background: #f59e0b;
  }

  .g-prev::before {
    background: #7c3aed;
  }

  .g-total::before {
    background: #16a34a;
  }

  .card {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 16px;
    padding: 14px 16px;
    min-height: 105px;
  }

  .card.now {
    border-left: 7px solid #2563eb;
  }

  .card.lap {
    border-left: 7px solid #f59e0b;
  }

  .card.prev {
    border-left: 7px solid #7c3aed;
  }

  .card.total {
    border-left: 7px solid #16a34a;
  }

  .card.important {
    background: #172554;
    border: 2px solid #3b82f6;
    border-left: 9px solid #60a5fa;
  }

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
    font-size: 34px;
    line-height: 1.1;
    font-weight: 900;
    color: #ffffff;
  }

  .unit {
    font-size: 17px;
    font-weight: 900;
    color: #94a3b8;
  }

  .card.now .value {
    font-size: 42px;
  }

  .card.important .value {
    font-size: 54px;
  }

  .card.important .label {
    font-size: 16px;
  }

  .card.important .unit {
    font-size: 20px;
  }

  @media (max-width: 900px) {
    .instant-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    .card.important .value {
      font-size: 42px;
    }
  }

  @media (max-width: 600px) {
    body {
      margin: 12px;
    }

    h1 {
      font-size: 22px;
    }

    .grid {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }

    .instant-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .value {
      font-size: 28px;
    }

    .card.now .value {
      font-size: 34px;
    }

    .card.important .value {
      font-size: 40px;
    }
  }
</style>
</head>

<body>
<h1>OIT TEAM REGALIA 宮 ミル子</h1>
<div id="status" class="status ng">WS: connecting…</div>

<div id="grid" class="grid"></div>

<script>
  const FIELDS = ${JSON.stringify(FIELDS)};
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");

  const values = {};

  function groupClass(g) {
    if (g === "瞬時データ") {
      return { title: "g-now", card: "now" };
    }

    if (g === "現ラップデータ") {
      return { title: "g-lap", card: "lap" };
    }

    if (g === "前ラップデータ") {
      return { title: "g-prev", card: "prev" };
    }

    if (g === "トータルデータ") {
      return { title: "g-total", card: "total" };
    }

    return { title: "", card: "" };
  }

  let currentGroup = "";
  let currentCardClass = "";
  let instantContainer = null;

  FIELDS.forEach((f) => {
    if (f.group !== currentGroup) {
      currentGroup = f.group;
      const cls = groupClass(currentGroup);

      const title = document.createElement("div");
      title.className = "group-title " + cls.title;
      title.textContent = currentGroup;
      grid.appendChild(title);

      currentCardClass = cls.card;

      if (currentGroup === "瞬時データ") {
        instantContainer = document.createElement("div");
        instantContainer.className = "instant-grid";
        grid.appendChild(instantContainer);
      }
    }

    const card = document.createElement("div");

    if (f.important) {
      card.className = "card " + currentCardClass + " important";
    } else {
      card.className = "card " + currentCardClass;
    }

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

    if (f.unit) {
      row.appendChild(unit);
    }

    card.appendChild(label);
    card.appendChild(row);

    if (f.group === "瞬時データ") {
      instantContainer.appendChild(card);
    } else {
      grid.appendChild(card);
    }

    if (!values[f.key]) {
      values[f.key] = [];
    }

    values[f.key].push(val);
  });

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
        }
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
