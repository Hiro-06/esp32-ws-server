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
   group: グループ名（見出し）
   key  : ESP32から来るJSONキー
   label: 表示名
   unit : 単位（空文字可）
*/
const FIELDS = [

  // ===== 瞬時データ =====
  { group: "瞬時データ", key: "ntime", label: "現ラップタイム", unit: "" },
  { group: "瞬時データ", key: "kmph",  label: "速度", unit: "km/h" },
  { group: "瞬時データ", key: "v",     label: "主幹電圧", unit: "V" },
  { group: "瞬時データ", key: "im",    label: "モータ電流", unit: "A" },
  { group: "瞬時データ", key: "ipv",   label: "PV電流", unit: "A" },
  { group: "瞬時データ", key: "ib",    label: "バッテリ電流", unit: "A" },
  { group: "瞬時データ", key: "pm",    label: "モータ電力", unit: "W" },
  { group: "瞬時データ", key: "ppv",   label: "PV電力", unit: "W" },
  { group: "瞬時データ", key: "pb",    label: "バッテリ電力", unit: "W" },

  // ===== 現ラップデータ =====
  { group: "現ラップデータ", key: "ntime", label: "現ラップタイム", unit: "" },
  { group: "現ラップデータ", key: "pim",   label: "現ラップモータ電力量", unit: "Wh" },
  { group: "現ラップデータ", key: "pipv",  label: "現ラップPV電力量", unit: "Wh" },
  { group: "現ラップデータ", key: "pib",   label: "現ラップバッテリ電力量", unit: "Wh" },

  // ===== 前ラップデータ =====
  { group: "前ラップデータ", key: "otime", label: "前ラップタイム", unit: "" },
  { group: "前ラップデータ", key: "pimo",  label: "前ラップモータ電力量", unit: "Wh" },
  { group: "前ラップデータ", key: "pipvo", label: "前ラップPV電力量", unit: "Wh" },
  { group: "前ラップデータ", key: "pibo",  label: "前ラップバッテリ電力量", unit: "Wh" },

  // ===== トータルデータ =====
  { group: "トータルデータ", key: "ttime", label: "トータルタイム", unit: "" },
  { group: "トータルデータ", key: "pimt",  label: "トータルモータ電力量", unit: "Wh" },
  { group: "トータルデータ", key: "pipvt", label: "トータルPV電力量", unit: "Wh" },
  { group: "トータルデータ", key: "pibt",  label: "トータルバッテリ電力量", unit: "Wh" },
  { group: "トータルデータ", key: "lc",    label: "ラップ数", unit: "" },

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
    background: #111;
    color: #fff;
  }
  .card {
  background: #1e1e1e;
  border-color: #444;
}
.value {
  color: #fff;
}
  h1 { margin-bottom: 6px; }

  .status {
    margin-bottom: 16px;
    font-weight: 800;
  }
  .ok { color: #0a7a32; }
  .ng { color: #b00020; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }

  /* ===== セクション見出し（グループ名） ===== */
  .group-title {
    grid-column: 1 / -1;      /* 横いっぱい */
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    padding: 8px 10px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: .02em;
    border: 1px solid #ddd;
    background: #fff;
  }
  .group-title::before {
    content: "";
    width: 10px;
    height: 18px;
    border-radius: 6px;
    display: inline-block;
  }

  /* グループ別カラー */
  .g-now::before   { background: #2563eb; }  /* 青 */
  .g-prev::before  { background: #f59e0b; }  /* オレンジ */
  .g-total::before { background: #7c3aed; }  /* 紫 */
  .g-grand::before { background: #16a34a; }  /* 緑 */

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
    font-weight: 900;
    color: #111;
  }

  .unit {
    font-size: 16px;
    font-weight: 800;
    color: #555;
  }

  /* グループごとにカード枠も少し色を付ける（薄いアクセント） */
  .card.now   { border-left: 6px solid #2563eb; }
  .card.prev  { border-left: 6px solid #f59e0b; }
  .card.total { border-left: 6px solid #7c3aed; }
  .card.grand { border-left: 6px solid #16a34a; }
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

  // group名 → CSSクラス
function groupClass(g) {
  if (g === "瞬時データ")
    return { title: "g-now", card: "now" };

  if (g === "現ラップデータ")
    return { title: "g-prev", card: "prev" };

  if (g === "前ラップデータ")
    return { title: "g-total", card: "total" };

  if (g === "トータルデータ")
    return { title: "g-grand", card: "grand" };

  return { title: "", card: "" };
}

  // ===== 固定カード生成（グループ見出し付き） =====
  let currentGroup = "";
  let currentCardClass = "";

  FIELDS.forEach(f => {
    // グループが変わったら見出しを追加
    if (f.group !== currentGroup) {
      currentGroup = f.group;
      const cls = groupClass(currentGroup);

      const title = document.createElement("div");
      title.className = "group-title " + cls.title;
      title.textContent = currentGroup;
      grid.appendChild(title);

      currentCardClass = cls.card;
    }

    const card = document.createElement("div");
    card.className = "card " + currentCardClass;

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
