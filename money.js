/* Japan 2026 — splitting the bill in yen and rupees, and importing Splitwise.

   An expense is {id, d (what), a (amount), cur ("JPY"|"INR"), p (who paid),
   split (who shares it; missing = everyone), fx (₹ per ¥ when it was added),
   ts, src, cat, net}. net, when present, is each person's paid-minus-owed in
   the expense's own currency — that's what a Splitwise export gives, and it
   copes with any split and any number of payers. Everything else is worked out
   from p and split. Converting always uses the expense's own fx, so a balance
   doesn't move when the rate does; only expenses without one use today's rate.

   Pure functions, no DOM. index.html loads it with a <script> tag;
   tests/money.test.js loads it with require(). */
(function (root) {

var CURS = ["JPY", "INR"];

function round2(n) { return Math.round(n * 100) / 100; }

/* the expense's amount in cur */
function convert(amount, from, to, fx) {
  if (from === to) return amount;
  if (!(fx > 0)) return NaN;
  return from === "JPY" ? amount * fx : amount / fx;
}

function rateOf(x, liveRate) { return x.fx > 0 ? x.fx : liveRate; }

/* each person's paid-minus-owed for one expense, in the expense's currency */
function netOf(x, people) {
  var out = {};
  people.forEach(function (p) { out[p] = 0; });
  if (x.net) {
    Object.keys(x.net).forEach(function (p) { if (p in out) out[p] += x.net[p]; });
    return out;
  }
  var who = (x.split && x.split.length ? x.split : people).filter(function (p) { return p in out; });
  if (!who.length) who = people;
  var each = x.a / who.length;
  if (x.p in out) out[x.p] += x.a;
  who.forEach(function (p) { out[p] -= each; });
  return out;
}

/* money moving between you, not spending. Splitwise files "Settle all
   balances" as General, so it's caught by name too. */
function isPayment(x) { return x.cat === "Payment" || /^settle all balances$/i.test(String(x.d || "").trim()); }

/* Our categories. Splitwise's own names map onto them; anything else is Other. */
var CATS = ["Food", "Transport", "Stay", "Activities", "Shopping", "Other"];
function bucketOf(x) {
  if (isPayment(x)) return "Payment";
  var c = String(x.cat || "").toLowerCase();
  if (CATS.map(function (k) { return k.toLowerCase(); }).indexOf(c) > -1) return c.charAt(0).toUpperCase() + c.slice(1);
  if (/plane|bus|train|taxi|car|transport|parking|fuel|gas|bicycle|bike/.test(c)) return "Transport";
  if (/hotel|rent|stay/.test(c)) return "Stay";
  if (/dining|food|groceries|liquor|coffee|restaurant/.test(c)) return "Food";
  if (/entertainment|games|movies|music|sports|ticket/.test(c)) return "Activities";
  if (/clothing|electronics|gifts|household|furniture|shopping/.test(c)) return "Shopping";
  /* Splitwise's default is "General" — guess from the description instead */
  var d = String(x.d || "").toLowerCase();
  if (/shinkansen|train|rail|bus\b|metro|subway|taxi|\bcab\b|flight|suica|pasmo|icoca|ferry|airport/.test(d)) return "Transport";
  if (/hotel|airbnb|ryokan|hostel/.test(d)) return "Stay";
  if (/usj|universal|teamlab|tour|museum|ticket|pass\b|sagano|ropeway|observatory|temple|shrine|admission|entry/.test(d)) return "Activities";
  if (/ramen|sushi|dinner|lunch|breakfast|cafe|coffee|food|restaurant|konbini|drinks|bar\b/.test(d)) return "Food";
  if (/uniqlo|donki|don quijote|shopping|bags?\b|adaptor|adapter|souvenir|gift/.test(d)) return "Shopping";
  return "Other";
}

/* What each person's own share of the spending was, in cur (payments left out).
   For a Splitwise row the biggest positive net is taken as the one who paid it. */
function shares(exps, people, cur, liveRate) {
  var out = {}, paid = {};
  people.forEach(function (p) { out[p] = 0; paid[p] = 0; });
  exps.forEach(function (x) {
    if (isPayment(x)) return;
    var r = rateOf(x, liveRate), c = x.cur || "JPY", n = netOf(x, people), payer = x.p;
    if (x.net) { var top = -Infinity; people.forEach(function (p) { if (n[p] > top) { top = n[p]; payer = p; } }); }
    if (payer in paid) paid[payer] += convert(x.a, c, cur, r);
    people.forEach(function (p) {
      var owed = p === payer ? x.a - n[p] : -n[p];
      out[p] += convert(owed, c, cur, r);
    });
  });
  people.forEach(function (p) { out[p] = round2(out[p]); paid[p] = round2(paid[p]); });
  return { share: out, paid: paid };
}

function isoDay(ts) {
  if (ts == null) return null;
  var d = new Date(ts);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* The trip report. days is the itinerary [{d:"2026-11-25", city:"Tokyo"}, …]. */
function report(exps, people, cur, liveRate, days) {
  var first = days[0].d, last = days[days.length - 1].d, cityOf = {};
  days.forEach(function (d) { cityOf[d.d] = d.city; });
  var byCat = {}, phase = { before: 0, during: 0, after: 0 }, byDay = {}, byCity = {}, total = 0, count = 0;
  exps.forEach(function (x) {
    if (isPayment(x)) return;
    var v = convert(x.a, x.cur || "JPY", cur, rateOf(x, liveRate)), day = isoDay(x.ts), b = bucketOf(x);
    total += v; count++;
    byCat[b] = (byCat[b] || 0) + v;
    var ph = !day || day < first ? "before" : day > last ? "after" : "during";
    phase[ph] += v;
    if (ph === "during") {
      byDay[day] = (byDay[day] || 0) + v;
      var city = cityOf[day] || "Other";
      byCity[city] = (byCity[city] || 0) + v;
    }
  });
  var sh = shares(exps, people, cur, liveRate);
  return { cur: cur, total: round2(total), count: count, byCat: byCat, phase: phase, byDay: byDay, byCity: byCity,
           share: sh.share, paid: sh.paid };
}

/* who is owed what, in cur. Positive = owed money back. */
function balances(exps, people, cur, liveRate) {
  var bal = {};
  people.forEach(function (p) { bal[p] = 0; });
  exps.forEach(function (x) {
    var n = netOf(x, people), r = rateOf(x, liveRate);
    people.forEach(function (p) { bal[p] += convert(n[p], x.cur || "JPY", cur, r); });
  });
  people.forEach(function (p) { bal[p] = round2(bal[p]); });
  return bal;
}

/* total spend in cur, payments between you left out */
function totalSpend(exps, cur, liveRate) {
  return exps.reduce(function (t, x) {
    return isPayment(x) ? t : t + convert(x.a, x.cur || "JPY", cur, rateOf(x, liveRate));
  }, 0);
}

/* The fewest payments that settle everyone: biggest debtor pays biggest creditor.
   Amounts under `tiny` (in the balance's currency) count as square. */
function settleUp(bal, tiny) {
  tiny = tiny == null ? 1 : tiny;
  var cr = [], db = [], out = [];
  Object.keys(bal).forEach(function (p) {
    if (bal[p] > tiny) cr.push({ p: p, v: bal[p] });
    else if (bal[p] < -tiny) db.push({ p: p, v: -bal[p] });
  });
  cr.sort(function (a, b) { return b.v - a.v; });
  db.sort(function (a, b) { return b.v - a.v; });
  while (cr.length && db.length) {
    var c = cr[0], d = db[0], v = Math.min(c.v, d.v);
    out.push({ from: d.p, to: c.p, amount: round2(v) });
    c.v -= v; d.v -= v;
    if (c.v <= tiny) cr.shift();
    if (d.v <= tiny) db.shift();
  }
  return out;
}

/* ---------- Splitwise ---------- */

/* RFC 4180-ish CSV: quotes, doubled quotes, commas and newlines inside quotes */
function parseCSV(text) {
  var rows = [], row = [], f = "", q = false, i = 0, c;
  text = String(text).replace(/^﻿/, "");
  for (; i < text.length; i++) {
    c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function hash(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* Match a Splitwise name ("Arnav S") to one of ours by first name */
function matchPerson(name, people) {
  var first = String(name).trim().split(/\s+/)[0].toLowerCase();
  for (var i = 0; i < people.length; i++) if (people[i].toLowerCase() === first) return people[i];
  return null;
}

/* Splitwise group export: Date, Description, Category, Cost, Currency, then one
   column per member holding their paid-minus-owed. A blank line and "Total
   balance" rows close it. map overrides name matching: {csvName: ourName|""}. */
function parseSplitwise(text, people, map) {
  map = map || {};
  var rows = parseCSV(text).filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
  if (!rows.length) return { error: "The file is empty." };
  var head = rows[0].map(function (h) { return String(h).trim(); });
  var col = function (n) { return head.map(function (h) { return h.toLowerCase(); }).indexOf(n); };
  var iDate = col("date"), iDesc = col("description"), iCat = col("category"), iCost = col("cost"), iCur = col("currency");
  if (iDate < 0 || iDesc < 0 || iCost < 0 || iCur < 0)
    return { error: "This doesn't look like a Splitwise export — it needs Date, Description, Cost and Currency columns." };
  var first = Math.max(iDate, iDesc, iCat, iCost, iCur) + 1;
  var members = head.slice(first).filter(function (h) { return h; });
  var mapping = {};
  members.forEach(function (m) { mapping[m] = (m in map) ? map[m] : matchPerson(m, people); });
  var out = [], skipped = 0, bad = 0, currencies = {};
  rows.slice(1).forEach(function (r) {
    var desc = String(r[iDesc] || "").trim();
    if (/^total balance$/i.test(desc)) { skipped++; return; }
    var cost = parseFloat(String(r[iCost]).replace(/,/g, ""));
    var cur = String(r[iCur] || "").trim().toUpperCase();
    if (!(cost > 0) || CURS.indexOf(cur) < 0) { bad++; return; }
    currencies[cur] = (currencies[cur] || 0) + 1;
    var net = {}, raw = [];
    members.forEach(function (m, k) {
      var v = parseFloat(String(r[first + k] || "0").replace(/,/g, "")) || 0;
      raw.push(v);
      var who = mapping[m];
      if (who) net[who] = round2((net[who] || 0) + v);
    });
    var payer = people[0], top = -Infinity;
    Object.keys(net).forEach(function (p) { if (net[p] > top) { top = net[p]; payer = p; } });
    var date = String(r[iDate] || "").trim();
    var ts = Date.parse(date.length === 10 ? date + "T12:00:00" : date);
    out.push({
      id: "sw:" + hash([date, desc, cost, cur, raw.join(";")].join("|")),
      d: desc.slice(0, 80), a: round2(cost), cur: cur, p: payer, net: net,
      ts: isNaN(ts) ? undefined : ts,
      cat: /^settle all balances$/i.test(desc) ? "Payment" : (String(r[iCat] || "").trim() || undefined), src: "splitwise"
    });
  });
  var unmatched = members.filter(function (m) { return !mapping[m]; });
  return { expenses: out, members: members, mapping: mapping, unmatched: unmatched, skipped: skipped, bad: bad, currencies: currencies };
}

/* Bring an import in. Splitwise's export has no ids, so a row is known by its
   content; if it's not here but an earlier import has the same day and
   description, it was edited in Splitwise and replaces that one. Rows from
   earlier imports that aren't in this file are kept — that's the history.
   Returns {list, added, changed, already, missing}. */
function mergeImport(exps, imported) {
  var have = {}, list = exps.slice(), added = 0, changed = 0, already = 0, seen = {}, inFile = {};
  list.forEach(function (x, i) { if (x.id) have[x.id] = i; });
  imported.forEach(function (x) { inFile[x.id] = 1; });
  var key = function (x) { return isoDay(x.ts) + "|" + String(x.d || "").trim().toLowerCase(); };
  imported.forEach(function (x) {
    if (x.id in have) { already++; seen[x.id] = 1; return; }
    var j = -1;
    for (var i = 0; i < list.length; i++) {
      var y = list[i];
      if (y.src === "splitwise" && !seen[y.id] && !inFile[y.id] && key(y) === key(x)) { j = i; break; }
    }
    if (j > -1) { list[j] = x; changed++; }
    else { list.push(x); added++; }
    seen[x.id] = 1;
  });
  var missing = list.filter(function (y) { return y.src === "splitwise" && !seen[y.id]; }).length;
  return { list: list, added: added, changed: changed, already: already, missing: missing };
}

var api = {
  CURS: CURS, convert: convert, netOf: netOf, balances: balances, totalSpend: totalSpend,
  settleUp: settleUp, parseCSV: parseCSV, matchPerson: matchPerson,
  parseSplitwise: parseSplitwise, mergeImport: mergeImport, isPayment: isPayment,
  CATS: CATS, bucketOf: bucketOf, shares: shares, report: report, isoDay: isoDay
};
if (typeof module === "object" && module.exports) module.exports = api;
else root.TripMoney = api;

})(this);
