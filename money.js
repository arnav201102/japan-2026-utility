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
    var r = rateOf(x, liveRate), c = x.cur || "JPY", share = {}, pay = {};
    if (!x.net) {
      var who = (x.split && x.split.length ? x.split : people).filter(function (p) { return people.indexOf(p) > -1; });
      if (!who.length) who = people;
      people.forEach(function (p) { share[p] = who.indexOf(p) > -1 ? x.a / who.length : 0; pay[p] = p === x.p ? x.a : 0; });
    } else {
      /* Splitwise gives only paid-minus-owed. People below zero owe exactly that;
         whatever's left of the cost is shared by those above zero (the payers),
         and paid = share + net. A refund (negative cost) is the same, mirrored. */
      var sign = x.a < 0 ? -1 : 1, A = x.a * sign, N = {}, debt = 0, up = [];
      people.forEach(function (p) {
        N[p] = (x.net[p] || 0) * sign;
        if (N[p] < 0) { share[p] = -N[p]; debt += -N[p]; } else { share[p] = 0; if (N[p] > 0) up.push(p); }
      });
      up.forEach(function (p) { share[p] = (A - debt) / up.length; });
      people.forEach(function (p) { pay[p] = (share[p] + N[p]) * sign; share[p] *= sign; });
    }
    people.forEach(function (p) {
      out[p] += convert(share[p], c, cur, r);
      paid[p] += convert(pay[p], c, cur, r);
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
  /* keep each member's own column, even if a blank header sits between them */
  var cols = [];
  head.slice(first).forEach(function (h, k) { if (h) cols.push({ name: h, col: first + k }); });
  var members = cols.map(function (m) { return m.name; });
  var mapping = {};
  members.forEach(function (m) { mapping[m] = (m in map) ? map[m] : matchPerson(m, people); });
  /* two Splitwise members landing on the same one of you would be added together */
  var byPerson = {};
  members.forEach(function (m) { var w = mapping[m]; if (w) (byPerson[w] = byPerson[w] || []).push(m); });
  var clashes = Object.keys(byPerson).filter(function (p) { return byPerson[p].length > 1; })
    .map(function (p) { return { person: p, members: byPerson[p] }; });
  var out = [], skipped = 0, zero = 0, otherCur = 0, outside = 0, refunds = 0, currencies = {}, seenIds = {};
  rows.slice(1).forEach(function (r) {
    var desc = String(r[iDesc] || "").trim();
    if (/^total balance/i.test(desc)) { skipped++; return; }
    var cost = parseFloat(String(r[iCost]).replace(/,/g, ""));
    var cur = String(r[iCur] || "").trim().toUpperCase();
    if (CURS.indexOf(cur) < 0) { otherCur++; return; }
    if (!cost || isNaN(cost)) { zero++; return; }
    var net = {}, raw = [], unmappedMoves = false;
    cols.forEach(function (m) {
      var v = parseFloat(String(r[m.col] || "0").replace(/,/g, "")) || 0;
      raw.push(v);
      var who = mapping[m.name];
      if (who) net[who] = round2((net[who] || 0) + v);
      else if (v) unmappedMoves = true;
    });
    var involved = Object.keys(net).some(function (p) { return Math.abs(net[p]) >= 0.005; });
    /* money that only moved between people who aren't any of you */
    if (!involved && unmappedMoves) { outside++; return; }
    if (cost < 0) refunds++;
    currencies[cur] = (currencies[cur] || 0) + 1;
    var payer = people[0], top = -Infinity;
    Object.keys(net).forEach(function (p) { if (net[p] > top) { top = net[p]; payer = p; } });
    var date = String(r[iDate] || "").trim();
    var ts = Date.parse(date.length === 10 ? date + "T12:00:00" : date);
    /* identical rows (two ¥600 drinks the same day) must stay two expenses */
    var base = "sw:" + hash([date, desc, cost, cur, raw.join(";")].join("|"));
    var n = seenIds[base] = (seenIds[base] || 0) + 1;
    out.push({
      id: n > 1 ? base + "#" + n : base,
      d: desc.slice(0, 80), a: round2(cost), cur: cur, p: payer, net: net,
      ts: isNaN(ts) ? undefined : ts,
      cat: /^settle all balances$/i.test(desc) ? "Payment" : (String(r[iCat] || "").trim() || undefined), src: "splitwise",
      /* how this row is known in Splitwise, kept even if it's renamed or re-dated here */
      swk: (isNaN(ts) ? "" : isoDay(ts)) + "|" + desc.toLowerCase() + (n > 1 ? "#" + n : "")
    });
  });
  var unmatched = members.filter(function (m) { return !mapping[m]; });
  return { expenses: out, members: members, mapping: mapping, unmatched: unmatched, clashes: clashes,
           skipped: skipped, bad: zero + otherCur, zero: zero, otherCur: otherCur, outside: outside,
           refunds: refunds, currencies: currencies };
}

/* Bring an import in. Splitwise's export has no ids, so a row is known by its
   content; if it's not here but an earlier import has the same day and
   description, it was edited in Splitwise and replaces that one. Rows from
   earlier imports that aren't in this file are kept — that's the history.
   Returns {list, added, changed, already, missing}. */
function mergeImport(exps, imported, opts) {
  opts = opts || {};
  var deleted = opts.deleted || {};
  var have = {}, list = exps.slice(), added = 0, changed = 0, already = 0, skippedDeleted = 0;
  var seen = {}, inFile = {}, dupes = [];
  list.forEach(function (x, i) { if (x.id) have[x.id] = i; });
  imported.forEach(function (x) { inFile[x.id] = 1; });
  var key = function (x) { return x.swk || (isoDay(x.ts) + "|" + String(x.d || "").trim().toLowerCase()); };
  imported.forEach(function (x) {
    if (x.id in have) { already++; seen[x.id] = 1; return; }
    /* deleted here on purpose — don't bring it back */
    if (deleted[x.id] != null) { skippedDeleted++; seen[x.id] = 1; return; }
    var j = -1;
    for (var i = 0; i < list.length; i++) {
      var y = list[i];
      if (y.src === "splitwise" && !seen[y.id] && !inFile[y.id] && key(y) === key(x)) { j = i; break; }
    }
    if (j > -1) {
      /* edited in Splitwise: take the new numbers, keep what was set here */
      var old = list[j], nx = {};
      for (var k in x) nx[k] = x[k];
      if (old.fx > 0) nx.fx = old.fx;
      if (old.cash) nx.cash = true;
      if (old.catLocal) { nx.cat = old.cat; nx.catLocal = true; }
      delete have[old.id];
      list[j] = nx; have[nx.id] = j; changed++;
    } else {
      /* something logged here by hand on the same day for the same amount is probably the same thing */
      var twin = list.filter(function (y) {
        return y.src !== "splitwise" && !isPayment(y) && isoDay(y.ts) === isoDay(x.ts) &&
          (y.cur || "JPY") === x.cur && Math.abs(y.a - x.a) < 0.01;
      })[0];
      if (twin) dupes.push({ imported: x.d, existing: twin.d, day: isoDay(x.ts) });
      list.push(x); have[x.id] = list.length - 1; added++;
    }
    seen[x.id] = 1;
  });
  var kept = list.filter(function (y) { return y.src === "splitwise" && !seen[y.id]; });
  return { list: list, added: added, changed: changed, already: already, skippedDeleted: skippedDeleted,
           missing: kept.length, kept: kept.map(function (y) { return { d: y.d, day: isoDay(y.ts), a: y.a, cur: y.cur || "JPY" }; }),
           dupes: dupes };
}

/* ---------- cash wallet ----------
   Everyone starts with CASH_START_JPY. cashLog holds {id, who, kind: "withdraw"|"count", jpy, note, ts}. Expenses
   marked cash:true (in yen) come out of the payer's wallet. A "count" is what
   they actually found in their wallet: the balance resets to it, and the gap
   is what went on things nobody logged. */
var CASH_START_JPY = 15000;   /* everyone lands with ¥15,000 */

function walletOf(who, cashLog, exps, start) {
  start = start == null ? CASH_START_JPY : start;
  var ev = [];
  (cashLog || []).forEach(function (c) { if (c.who === who) ev.push({ ts: c.ts || 0, k: c.kind, v: c.jpy }); });
  (exps || []).forEach(function (x) {
    if (x.cash && x.p === who && (x.cur || "JPY") === "JPY") ev.push({ ts: x.ts || 0, k: "spend", v: x.a });
  });
  ev.sort(function (a, b) { return a.ts - b.ts; });
  var bal = start, withdrawn = 0, spent = 0, unlogged = 0, lastCount = null;
  ev.forEach(function (e) {
    if (e.k === "withdraw") { bal += e.v; withdrawn += e.v; }
    else if (e.k === "spend") { bal -= e.v; spent += e.v; }
    else if (e.k === "count") { unlogged += bal - e.v; lastCount = { ts: e.ts, jpy: e.v, gap: bal - e.v }; bal = e.v; }
  });
  return { start: start, balance: Math.round(bal), withdrawn: withdrawn, spent: spent, unlogged: Math.round(unlogged), lastCount: lastCount };
}

/* An amount someone typed: "1,200", "1,20,000", "1200.50", "12,50" (comma
   decimal), "¥3,000". Negative, scientific or garbled input gives NaN. */
function parseAmount(str) {
  var s = String(str == null ? "" : str).replace(/[¥₹\s]/g, "").replace(/^\+/, "");
  if (!s || s.charAt(0) === "-") return NaN;
  var c = s.indexOf(",") > -1, d = s.indexOf(".") > -1;
  if (c && d) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (c) { var parts = s.split(","); s = parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 2 ? parts[0] + "." + parts[1] : s.replace(/,/g, ""); }
  return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
}

/* the same settle-up recorded on two phones must be one payment, not two */
function paymentId(from, to, amount, day) {
  return "pay:" + from + ":" + to + ":" + Math.round(amount * 100) + ":" + day;
}

var api = {
  CURS: CURS, convert: convert, netOf: netOf, balances: balances, totalSpend: totalSpend,
  settleUp: settleUp, parseCSV: parseCSV, matchPerson: matchPerson,
  parseSplitwise: parseSplitwise, mergeImport: mergeImport, isPayment: isPayment,
  CATS: CATS, bucketOf: bucketOf, shares: shares, report: report, isoDay: isoDay,
  walletOf: walletOf, CASH_START_JPY: CASH_START_JPY, parseAmount: parseAmount, paymentId: paymentId
};
if (typeof module === "object" && module.exports) module.exports = api;
else root.TripMoney = api;

})(this);
