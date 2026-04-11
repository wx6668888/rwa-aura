/**
 * 一次性维护：从快照与 chat_messages 中移除
 * - 非 DM 房间里的图片消息
 * - 群/频道里机器人「一眼假」文本（按摩梗、按钮腔、天热+带伞无因果等）
 *
 * 用法：cd chat-server && node scripts/purge-images-and-fake.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
process.chdir(root);

const require = createRequire(import.meta.url);
const dotenv = require("dotenv");
dotenv.config({ path: path.join(root, ".env") });
if (!String(process.env.DB_PASSWORD || process.env.CHAT_DB_PASSWORD || "").trim()) {
  dotenv.config({ path: path.join(root, "..", "backend", ".env") });
}

const { ChatStateStore } = require(path.join(root, "dist/services/chat-state-store.js"));

function buildRoomMap(rooms) {
  const map = new Map();
  for (const r of Array.isArray(rooms) ? rooms : []) {
    if (r && r.id) map.set(String(r.id), r);
  }
  return map;
}

function isNonDmRoom(roomId, roomById) {
  const r = roomById.get(String(roomId));
  if (!r) return true;
  return String(r.type || "") !== "dm";
}

function shouldRemoveMessage(m, roomId, botIds, roomById) {
  const t = String(m?.type || "");
  if (!isNonDmRoom(roomId, roomById)) return { remove: false, reason: "" };

  if (t === "image") {
    return { remove: true, reason: "image" };
  }

  if (t !== "text") return { remove: false, reason: "" };
  if (!botIds.has(String(m.userId))) return { remove: false, reason: "" };

  const c = String(m.content || "");

  if (/颈部按摩|按摩的绿|绿色.{0,8}颈|绿.{0,8}按摩|做按摩的绿/.test(c)) {
    return { remove: true, reason: "meme" };
  }
  if (/查看详情|点击查看|点我查看/.test(c)) {
    return { remove: true, reason: "cta" };
  }
  if (/口头不算数/.test(c)) {
    return { remove: true, reason: "low" };
  }

  const hot = /(有点热|挺热|天热|高温|闷热|好热|气温.{0,4}高|周末.{0,6}热)/.test(c);
  const umbrella = /带伞|拿(?:个)?伞|记得.*伞|出门.*伞/.test(c);
  const rainOrSun = /(下雨|降雨|阵雨|雷雨|台风|转雨|有雨|小到中雨|暴雨|遮阳|防晒|挡太阳|太阳毒|暴晒|紫外线|大太阳|晒)/.test(
    c
  );
  if (hot && umbrella && !rainOrSun) {
    return { remove: true, reason: "weather" };
  }

  return { remove: false, reason: "" };
}

async function main() {
  const store = new ChatStateStore();
  await store.ensureSchema();
  const snap = await store.loadSnapshot();
  if (!snap || typeof snap !== "object") {
    console.error("[purge] No snapshot in chat_state_snapshots; abort.");
    process.exit(1);
  }

  const users = Array.isArray(snap.users) ? snap.users : [];
  const botIds = new Set(users.filter((u) => u && u.isBot).map((u) => String(u.id)));
  const roomById = buildRoomMap(snap.rooms);
  const messages = snap.messages && typeof snap.messages === "object" ? snap.messages : {};

  const counts = { image: 0, meme: 0, cta: 0, weather: 0, low: 0, total: 0 };

  for (const [roomId, list] of Object.entries(messages)) {
    if (!Array.isArray(list)) continue;
    const kept = [];
    for (const m of list) {
      const { remove, reason } = shouldRemoveMessage(m, roomId, botIds, roomById);
      if (remove) {
        counts[reason] = (counts[reason] || 0) + 1;
        counts.total += 1;
        continue;
      }
      kept.push(m);
    }
    messages[roomId] = kept;
  }

  snap.messages = messages;

  await store.saveSnapshot(snap);
  await store.syncNormalizedFromSnapshot(snap);

  console.log(
    "[purge] done:",
    JSON.stringify({ removedByReason: counts, rooms: Object.keys(messages).length })
  );
}

main().catch((e) => {
  console.error("[purge] failed:", e);
  process.exit(1);
});
