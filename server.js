// npm i express ws
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

// WebSocket endpoint
const wss = new WebSocket.Server({ server, path: "/ws" });

let lastJson = null; // 最新データ（ブラウザ初期表示に使う）

function broadcast(data) {
  for (const c of wss.clients) {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const s = msg.toString();
    // JSONなら保存（初期表示用）
    try { lastJson = JSON.parse(s); } catch {}
    broadcast(s);
  });
});

app.get("/latest", (_req, res) => {
  res.json(lastJson || {});
});

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ESP32 Telemetry</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    .top { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    .pill { padding:6px 10px; border:1px solid #ddd; border-radius:999px; font-size:14px; color:#555; }
    #status { font-weight:800; }
    #status.ok { color: #138a36; }
    #status.ng { color: #b00020; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 14px; }
    .card { padding: 12px 14px; border: 1px solid #ddd; border-radius: 14px; background:#fff; }
    .key { color:#666; font-size: 13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .val { font-size: 28px; font-weight: 800; margin-top: 6px; word-break: break-word; }
    .row { display:flex; gap:10px; align-items:center; }
    button { padding:8px 12px; border:1px solid #ddd; border-radius:10px; background:#fff; cursor:pointer; }
    button:hover { background:#f7f7f7; }
    #raw { white-space: pre; background:#f7f7f7; padding: 12px; border-radius: 12px; overflow:auto; max-height: 40vh; margin-top: 14px; }
    .muted { color:#666; font-size: 13px; }
  </style>
</head>
<body>
  <h1>ESP32 Telemetry</h1>

  <div class="top">
    <span class="pill">WS: <span id="status" class="ng">connecting…</span></span>
    <span class="pill" id="wsurl"></span>
    <span class="pill">Last update: <span id="age">—</span></span>
    <div class="row">
      <button id="toggleRaw">Raw: ON</button>
      <button id="clearRaw">Clear Raw</button>
      <button id="sortKey">Sort: Key</button>
      <button id="sortTime">Sort: Recent</button>
    </div>
  </div>

  <div class="muted" style="margin-top:10px;">
    受信したJSONのキーを自動でカード表示します（増えた項目も自動追加）。
  </div>

  <div id="grid" class="grid"></div>

  <div id="raw"></div>

<script>
  const grid = document.getElementById("grid");
  const rawEl = document.getElementById("raw");
  const statusEl = document.getElementById("status");
  const wsUrlEl = document.getElementById("wsurl");
  const ageEl = document.getElementById("age");

  const wsProto = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = wsProto + "://" + location.host + "/ws";
  wsUrlEl.textContent = wsUrl;

  let showRaw = true;
  let lastRx = 0;
  let sortMode = "recent"; // "recent" or "key"
  const cards = new Map(); // key -> {el, lastTouched}

  function fmt(v) {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number") return Number.isFinite(v) ? v : String(v);
    return String(v);
  }

  function touchCard(k, v) {
    let item = cards.get(k);
    if (!item) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = '<div class="key"></div><div class="val"></div>';
      card.querySelector(".key").textContent = k;
      grid.appendChild(card);
      item = { el: card, lastTouched: 0 };
      cards.set(k, item);
    }
    item.el.querySelector(".val").textContent = fmt(v);
    item.lastTouched = Date.now();
  }

  function resort() {
    const arr = Array.from(cards.values());
    if (sortMode === "key") {
      arr.sort((a,b) => a.el.querySelector(".key").textContent.localeCompare(b.el.querySelector(".key").textContent));
    } else {
      arr.sort((a,b) => b.lastTouched - a.lastTouched);
    }
    for (const it of arr) grid.appendChild(it.el);
  }

  function addRaw(line) {
    if (!showRaw) return;
    rawEl.textContent = line + "\\n" + rawEl.textContent;
  }

  document.getElementById("toggleRaw").onclick = () => {
    showRaw = !showRaw;
    rawEl.style.display = showRaw ? "block" : "none";
    document.getElementById("toggleRaw").textContent = "Raw: " + (showRaw ? "ON" : "OFF");
  };
  document.getElementById("clearRaw").onclick = () => { rawEl.textContent = ""; };
  document.getElementById("sortKey").onclick = () => { sortMode = "key"; resort(); };
  document.getElementById("sortTime").onclick = () => { sortMode = "recent"; resort(); };

  setInterval(() => {
    if (!lastRx) { ageEl.textContent = "—"; return; }
    const sec = Math.floor((Date.now() - lastRx)/1000);
    ageEl.textContent = sec + " s ago";
  }, 500);

  async function loadLatest() {
    try {
      const r = await fetch("/latest");
      const obj = await r.json();
      for (const [k,v] of Object.entries(obj)) touchCard(k, v);
      resort();
    } catch {}
  }

  function connect() {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      statusEl.textContent = "connected";
      statusEl.className = "ok";
    };
    ws.onclose = () => {
      statusEl.textContent = "disconnected (retrying)";
      statusEl.className = "ng";
      setTimeout(connect, 1000);
    };
    ws.onmessage = (ev) => {
      lastRx = Date.now();
      addRaw(ev.data);

      try {
        const obj = JSON.parse(ev.data);
        for (const [k,v] of Object.entries(obj)) touchCard(k, v);
        resort();
      } catch {
        // JSONじゃない場合はRawだけ
      }
    };
  }

  rawEl.style.display = "block";
  loadLatest();
  connect();
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, "0.0.0.0", () => console.log("listening on", PORT));
