// npm i express ws
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });

// 接続中クライアントへブロードキャスト
function broadcast(data) {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

// WebSocket
wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    // ESP32から来たデータをそのままブラウザへ配信（ログ保存しない）
    broadcast(msg.toString());
  });
});

// 表示ページ
app.get("/", (_req, res) => {
  res.type("html").send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ESP32 Live</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    .row { display: flex; gap: 16px; flex-wrap: wrap; }
    .card { padding: 14px 16px; border: 1px solid #ddd; border-radius: 12px; min-width: 240px; }
    #log { white-space: pre; background: #f7f7f7; padding: 12px; border-radius: 12px; overflow:auto; max-height: 45vh; }
    .big { font-size: 28px; font-weight: 700; }
    .muted { color: #666; }
  </style>
</head>
<body>
  <h1>OIT TEAM REGALIA ミル子</h1>
  <div class="row">
    <div class="card">
      <div class="muted">Status</div>
      <div id="status" class="big">connecting…</div>
      <div class="muted" id="wsurl"></div>
    </div>
    <div class="card">
      <div class="muted">Last timestamp</div>
      <div id="ts" class="big">—</div>
    </div>
    <div class="card">
      <div class="muted">Value</div>
      <div id="val" class="big">—</div>
    </div>
  </div>

  <h2>Raw</h2>
  <div id="log"></div>

<script>
  const statusEl = document.getElementById("status");
  const tsEl = document.getElementById("ts");
  const valEl = document.getElementById("val");
  const logEl = document.getElementById("log");

  const wsProto = location.protocol === "https:" ? "wss" : "ws";
  const wsUrl = wsProto + "://" + location.host + "/ws";
  document.getElementById("wsurl").textContent = wsUrl;

  function addLog(line) {
    logEl.textContent = line + "\\n" + logEl.textContent;
  }

  let ws;
  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      statusEl.textContent = "connected";
      statusEl.style.color = "green";
    };

    ws.onclose = () => {
      statusEl.textContent = "disconnected (retrying)";
      statusEl.style.color = "crimson";
      setTimeout(connect, 1000);
    };

    ws.onerror = () => {
      // oncloseでリトライ
    };

    ws.onmessage = (ev) => {
      addLog(ev.data);

      // ESP32がJSONで {"ts": 123456, "value": 12.34} を送る想定
      try {
        const obj = JSON.parse(ev.data);
        if (obj.ts != null) tsEl.textContent = obj.ts;
        if (obj.value != null) valEl.textContent = obj.value;
      } catch (e) {
        // JSONじゃない場合はRawにだけ出す
      }
    };
  }

  connect();
</script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log("listening on", PORT));
