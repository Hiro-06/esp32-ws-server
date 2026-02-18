// npm i express ws
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

// ===== WebSocket =====
const wss = new WebSocket.Server({ server, path: "/ws" });

let lastJson = {}; // 最新データ（初期表示用）

function broadcast(data) {
  for (const c of wss.clients) {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const s = msg.toString();
    try { lastJson = JSON.parse(s); } catch {}
    broadcast(s);
  });
});

// ===== 固定表示したいキー順 =====
const FIXED_KEYS = [
  // 時間系
  "ntime", "otime", "ttime",

  // 速度・電圧・電流
  "kmph", "v", "im", "ipv", "ib",

  // 瞬時電力
  "pm", "ppv", "pb",

  // ラップ積算
  "pim", "pipv", "pib",

  // 前ラップ
  "pimo", "pipvo", "pibo",

  // 総積算
  "pimt", "pipvt", "pibt"
];

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OIT TEAM REGALIA 宮　ミル子</title>

<style>
  body {
    font-family: system-ui, sans-serif;
    margin: 24px;
    background: #fafafa;
  }
  h1 { margin-bottom: 8px; }
  .status {
    margin-bottom: 16px;
    font-weight: 700;
  }
  .ok { color: #0a7a32; }
  .ng { color: #b00020; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }
  .card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 14px;
    padding: 14px 16px;
  }
  .key {
    font-size: 13px;
    color: #666;
  }
  .val {
    font-size: 30px;
    font-weight: 800;
    margin-top: 6px;
  }
</style>
</head>

<body>
<h1>OIT TEAM REGALIA 宮　ミル子</h1>
<div id="status" class="status ng">WS: connecting…</div>

<div id="grid" class="grid"></div>

<script>
  const FIXED_KEYS = ${JSON.stringify(FIXED_KEYS)};
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");

  const cards = {}; // key -> value element

  // ===== 固定カード生成 =====
  FIXED_KEYS.forEach(k => {
    const card = document.createElement("div");
    card.className = "card";

    const keyEl = document.createElement("div");
    keyEl.className = "key";
    keyEl.textContent = k;

    const valEl = document.createElement("div");
    valEl.className = "val";
    valEl.textContent = "—";

    card.appendChild(keyEl);
    card.appendChild(valEl);
    grid.appendChild(card);

    cards[k] = valEl;
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
        for (const k of FIXED_KEYS) {
          if (obj[k] !== undefined) {
            cards[k].textContent = obj[k];
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
