#!/usr/bin/env node
/* Evening wrap-up → Telegram, during the trip only (dates in Japan time; run
   it with TZ=Asia/Tokyo so expense dates match).
   Reads the shared cloud record (the same JSONBin the app syncs to) and posts
   today's spending, the trip so far, everyone's cash wallet, who owes whom and
   tomorrow's plan. The maths is money.js, the same as the app.
   Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
   Optional: JSONBIN_BIN / JSONBIN_KEY (otherwise read from index.html, where the
   app keeps them), FORCE=1 to send outside the trip dates, DRY_RUN=1 to print
   instead of sending. */

var fs = require("fs");
var path = require("path");
var https = require("https");
var M = require("../money.js");

var ROOT = path.join(__dirname, "..");
var PEOPLE = ["Arnav", "Ayush", "Manan"];

/* the itinerary and the cloud details live in index.html; read just what's needed */
function fromIndex() {
  var html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  var days = [], re = /\{d:"(\d{4}-\d\d-\d\d)",dow:"(\w+)",city:"([^"]*)",t:"([^"]*)"/g, m;
  while ((m = re.exec(html))) days.push({ d: m[1], dow: m[2], city: m[3], t: m[4] });
  var bin = (html.match(/CLOUD_BIN="([^"]+)"/) || [])[1];
  var key = (html.match(/CLOUD_KEY="([^"]+)"/) || [])[1];
  return { days: days, bin: bin, key: key };
}

function yen(n) { return "¥" + Math.round(n).toLocaleString("en-US"); }
function rupees(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }
function fmtDate(iso) {
  var d = new Date(iso + "T12:00:00");
  return d.getDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
}
/* the date in Japan, where you'll be */
function jstToday(now) {
  var d = new Date(now + 9 * 3600000);
  return d.toISOString().slice(0, 10);
}

/* The message. rec is the cloud record, today an ISO date, rate ₹ per ¥. */
function buildWrap(rec, days, today, rate) {
  var exps = Array.isArray(rec.exps) ? rec.exps : [];
  var cash = Array.isArray(rec.cash) ? rec.cash : [];
  var i = days.map(function (d) { return d.d; }).indexOf(today);
  var day = i >= 0 ? days[i] : null, next = i >= 0 ? days[i + 1] : null;
  var first = days[0].d, last = days[days.length - 1].d;
  var onDay = function (x, d) { return M.isoDay(x.ts) === d; };

  var todays = exps.filter(function (x) { return onDay(x, today) && !M.isPayment(x); });
  var trip = exps.filter(function (x) { var d = M.isoDay(x.ts); return d && d >= first && d <= today && !M.isPayment(x); });
  var spentY = M.totalSpend(todays, "JPY", rate), spentR = M.totalSpend(todays, "INR", rate);
  var tripY = M.totalSpend(trip, "JPY", rate);
  var elapsed = i >= 0 ? i + 1 : 0;

  var L = [];
  L.push("🌙 Japan 2026" + (day ? " — Day " + (i + 1) + " wrap · " + fmtDate(today) + " · " + day.city : " — " + fmtDate(today)));
  L.push("");
  if (todays.length) {
    L.push("Spent today: " + yen(spentY) + " (≈ " + rupees(spentR) + ") · " + todays.length + " expense" + (todays.length === 1 ? "" : "s"));
    var paid = {};
    todays.forEach(function (x) { paid[x.p] = (paid[x.p] || 0) + M.convert(x.a, x.cur || "JPY", "JPY", x.fx > 0 ? x.fx : rate); });
    L.push(PEOPLE.filter(function (p) { return paid[p]; }).map(function (p) { return p + " paid " + yen(paid[p]); }).join(" · "));
  } else {
    L.push("Nothing logged today. Anything to add to the app?");
  }
  if (elapsed) L.push("On the trip so far: " + yen(tripY) + " · about " + yen(tripY / elapsed) + " a day between you");
  L.push("");
  L.push("Cash wallets: " + PEOPLE.map(function (p) {
    var b = M.walletOf(p, cash, exps).balance;
    return p + " " + yen(b) + (b < 5000 ? " (low)" : "");
  }).join(" · "));
  var moves = M.settleUp(M.balances(exps, PEOPLE, "INR", rate), 1);
  L.push(moves.length ? "To settle: " + moves.map(function (m) { return m.from + " → " + m.to + " " + rupees(m.amount); }).join(" · ")
                      : "Everyone's square.");
  if (next) { L.push(""); L.push("Tomorrow, Day " + (i + 2) + " · " + next.city + ": " + next.t); }
  return L.join("\n");
}

function getJSON(url, headers) {
  return new Promise(function (resolve, reject) {
    https.get(url, { headers: headers || {} }, function (res) {
      var data = "";
      res.on("data", function (c) { data += c; });
      res.on("end", function () {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error("HTTP " + res.statusCode + " from " + url.split("?")[0]));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

function postTelegram(token, chatId, text) {
  return new Promise(function (resolve, reject) {
    var body = JSON.stringify({ chat_id: chatId, text: text, disable_web_page_preview: true });
    var req = https.request({
      hostname: "api.telegram.org", path: "/bot" + token + "/sendMessage", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
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
  var force = process.env.FORCE === "1" || process.env.FORCE === "true";
  var dry = process.env.DRY_RUN === "1";
  var token = process.env.TELEGRAM_BOT_TOKEN, chatId = process.env.TELEGRAM_CHAT_ID;
  if (!dry && (!token || !chatId)) { console.error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID"); process.exit(1); }
  var idx = fromIndex(), today = jstToday(Date.now());
  var inTrip = idx.days.length && today >= idx.days[0].d && today <= idx.days[idx.days.length - 1].d;
  if (!inTrip && !force) { console.log("Not a trip day (" + today + "). Skipping."); return; }
  var bin = process.env.JSONBIN_BIN || idx.bin, key = process.env.JSONBIN_KEY || idx.key;
  var d = await getJSON("https://api.jsonbin.io/v3/b/" + bin + "/latest", { "X-Access-Key": key });
  var rate = 0.6;
  try { var fx = await getJSON("https://api.frankfurter.dev/v2/rate/JPY/INR"); if (fx && fx.rate > 0) rate = fx.rate; } catch (e) {}
  var msg = buildWrap(d.record || d, idx.days, today, rate);
  if (dry) { console.log(msg); return; }
  await postTelegram(token, chatId, msg);
  console.log("Sent:\n" + msg);
}

if (require.main === module) {
  main().catch(function (e) { console.error(e.message || e); process.exit(1); });
}
module.exports = { buildWrap: buildWrap, fromIndex: fromIndex, jstToday: jstToday };
