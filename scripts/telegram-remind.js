#!/usr/bin/env node
/* Daily booking reminders → Telegram.
   Deadlines are IST wall times in deadlines.json (same as index.html BOOKINGS.when).
   Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
   Optional: FORCE=1 to always send a status ping even if nothing is due. */

var fs = require("fs");
var path = require("path");
var https = require("https");

var ROOT = path.join(__dirname, "..");
var FILE = path.join(ROOT, "deadlines.json");
var HOUR = 3600000;
var DAY = 24 * HOUR;

function dueMs(when) {
  return new Date(when + "+05:30").getTime();
}

function fmtWhen(when) {
  var d = new Date(when + "+05:30");
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var pad = function (n) { return String(n).padStart(2, "0"); };
  return d.getDate() + " " + months[d.getMonth()] + " " +
    pad(d.getHours()) + ":" + pad(d.getMinutes()) + " IST";
}

function load() {
  var raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  if (!Array.isArray(raw)) throw new Error("deadlines.json must be an array");
  return raw.filter(function (b) { return b && b.t && b.when; }).map(function (b) {
    return { t: b.t, w: b.w || "", when: b.when, at: dueMs(b.when) };
  }).filter(function (b) { return !isNaN(b.at); });
}

function bucket(items, now) {
  var overdue = [], soon = [], week = [];
  items.forEach(function (b) {
    var ms = b.at - now;
    if (ms < 0 && ms > -3 * DAY) overdue.push(b);
    else if (ms >= 0 && ms <= 2 * DAY) soon.push(b);
    else if (ms > 2 * DAY && ms <= 7 * DAY) week.push(b);
  });
  overdue.sort(function (a, b) { return a.at - b.at; });
  soon.sort(function (a, b) { return a.at - b.at; });
  week.sort(function (a, b) { return a.at - b.at; });
  return { overdue: overdue, soon: soon, week: week };
}

function lines(title, list) {
  if (!list.length) return [];
  var out = [title];
  list.forEach(function (b) {
    out.push("• " + b.t);
    out.push("  " + fmtWhen(b.when) + (b.w ? " — " + b.w : ""));
  });
  out.push("");
  return out;
}

function buildMessage(bags, force) {
  var parts = [];
  parts.push("日本 2026 — booking reminders");
  parts.push("");
  parts = parts.concat(lines("⛔ PASSED (last 3 days)", bags.overdue));
  parts = parts.concat(lines("⏰ WITHIN 48 HOURS", bags.soon));
  parts = parts.concat(lines("📅 THIS WEEK", bags.week));
  if (!bags.overdue.length && !bags.soon.length && !bags.week.length) {
    if (!force) return null;
    parts.push("Nothing due in the next 7 days. You're clear.");
    parts.push("");
  }
  parts.push("Tick it in the app when done. Unticked items keep reminding.");
  return parts.join("\n").trim();
}

function postTelegram(token, chatId, text) {
  return new Promise(function (resolve, reject) {
    var body = JSON.stringify({
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true
    });
    var req = https.request({
      hostname: "api.telegram.org",
      path: "/bot" + token + "/sendMessage",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, function (res) {
      var data = "";
      res.on("data", function (c) { data += c; });
      res.on("end", function () {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error("Telegram HTTP " + res.statusCode + ": " + data));
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;
  var force = process.env.FORCE === "1" || process.env.FORCE === "true";
  if (!token || !chatId) {
    console.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID");
    process.exit(1);
  }
  var bags = bucket(load(), Date.now());
  var msg = buildMessage(bags, force);
  if (!msg) {
    console.log("Nothing to remind. Skipping send.");
    return;
  }
  await postTelegram(token, chatId, msg);
  console.log("Sent:\n" + msg);
}

main().catch(function (e) {
  console.error(e.message || e);
  process.exit(1);
});
