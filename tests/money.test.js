/* Run with: node --test */
var test = require("node:test");
var assert = require("node:assert/strict");
var M = require("../money.js");

var P = ["Arnav", "Ayush", "Manan"];

test("an equal three-way split", function () {
  var n = M.netOf({ a: 3000, cur: "JPY", p: "Arnav" }, P);
  assert.deepEqual(n, { Arnav: 2000, Ayush: -1000, Manan: -1000 });
});

test("a split between only some of you", function () {
  var n = M.netOf({ a: 2000, cur: "JPY", p: "Ayush", split: ["Ayush", "Manan"] }, P);
  assert.deepEqual(n, { Arnav: 0, Ayush: 1000, Manan: -1000 });
});

test("balances mix yen and rupees, each at its own locked rate", function () {
  var exps = [
    { a: 3000, cur: "JPY", p: "Arnav", fx: 0.6 },   /* ₹1,800 */
    { a: 900, cur: "INR", p: "Ayush", fx: 0.5 }     /* ₹900 */
  ];
  var inr = M.balances(exps, P, "INR", 0.7);
  /* ¥3,000 three ways is ₹1,200 / −600 / −600; ₹900 three ways is −300 / +600 / −300 */
  assert.deepEqual(inr, { Arnav: 900, Ayush: 0, Manan: -900 });
  var jpy = M.balances(exps, P, "JPY", 0.7);
  /* the ₹900 goes back to yen at its own 0.5, not today's 0.7 */
  assert.deepEqual(jpy, { Arnav: 1400, Ayush: 200, Manan: -1600 });
});

test("a balance doesn't move when today's rate does", function () {
  var exps = [{ a: 3000, cur: "JPY", p: "Arnav", fx: 0.6 }];
  assert.deepEqual(M.balances(exps, P, "INR", 0.55), M.balances(exps, P, "INR", 0.65));
});

test("expenses without a locked rate use today's", function () {
  var b = M.balances([{ a: 3000, cur: "JPY", p: "Arnav" }], P, "INR", 0.5);
  assert.equal(b.Arnav, 1000);
});

test("balances always add up to zero", function () {
  var exps = [
    { a: 1234, cur: "JPY", p: "Arnav", fx: 0.61 },
    { a: 777, cur: "INR", p: "Manan", split: ["Arnav", "Manan"], fx: 0.6 },
    { a: 5000, cur: "JPY", p: "Ayush", fx: 0.6 }
  ];
  var b = M.balances(exps, P, "INR", 0.6);
  assert.ok(Math.abs(b.Arnav + b.Ayush + b.Manan) < 0.05);
});

test("settle up with the fewest payments", function () {
  assert.deepEqual(M.settleUp({ Arnav: 1500, Ayush: 300, Manan: -1800 }), [
    { from: "Manan", to: "Arnav", amount: 1500 },
    { from: "Manan", to: "Ayush", amount: 300 }
  ]);
  assert.deepEqual(M.settleUp({ Arnav: 0.4, Ayush: -0.4, Manan: 0 }), [], "pennies count as square");
});

test("a recorded payment squares the balance", function () {
  var exps = [{ a: 3000, cur: "INR", p: "Arnav", fx: 0.6 }];
  var b = M.balances(exps, P, "INR", 0.6);
  M.settleUp(b).forEach(function (t) {
    exps.push({ a: t.amount, cur: "INR", p: t.from, split: [t.to], cat: "Payment", fx: 0.6 });
  });
  var after = M.balances(exps, P, "INR", 0.6);
  P.forEach(function (p) { assert.ok(Math.abs(after[p]) < 0.01, p); });
  assert.equal(M.totalSpend(exps, "INR", 0.6), 3000, "payments aren't spending");
});

test("CSV parsing copes with quotes, commas and blank lines", function () {
  var rows = M.parseCSV('a,b\r\n"x, y","say ""hi"""\n\nlast,1');
  assert.deepEqual(rows, [["a", "b"], ["x, y", 'say "hi"'], [""], ["last", "1"]]);
});

var SW = [
  "Date,Description,Category,Cost,Currency,Arnav S,Ayush G,Manan K",
  "2026-11-25,Ramen,Dining out,3000.00,JPY,2000.00,-1000.00,-1000.00",
  '2026-11-26,"Bike hire, Kawaguchiko",General,4500.00,JPY,-1500.00,3000.00,-1500.00',
  "2026-10-10,Visa fees,General,9000.00,INR,-3000.00,-3000.00,6000.00",
  "2026-11-27,Ayush paid Arnav,Payment,500.00,JPY,-500.00,500.00,0.00",
  "",
  "2026-11-27,Total balance, , ,JPY,0.00,2500.00,-2500.00",
  "2026-11-27,Total balance, , ,INR,-3000.00,-3000.00,6000.00"
].join("\n");

test("Splitwise export: names, currencies, nets, totals skipped", function () {
  var r = M.parseSplitwise(SW, P);
  assert.equal(r.error, undefined);
  assert.deepEqual(r.mapping, { "Arnav S": "Arnav", "Ayush G": "Ayush", "Manan K": "Manan" });
  assert.equal(r.expenses.length, 4);
  assert.equal(r.skipped, 2);
  assert.deepEqual(r.currencies, { JPY: 3, INR: 1 });
  var bike = r.expenses[1];
  assert.equal(bike.d, "Bike hire, Kawaguchiko");
  assert.equal(bike.p, "Ayush");
  assert.deepEqual(bike.net, { Arnav: -1500, Ayush: 3000, Manan: -1500 });
  assert.equal(r.expenses[3].cat, "Payment");
});

test("Splitwise balances match its own Total balance rows", function () {
  var r = M.parseSplitwise(SW, P);
  var jpy = r.expenses.filter(function (x) { return x.cur === "JPY"; });
  var inr = r.expenses.filter(function (x) { return x.cur === "INR"; });
  assert.deepEqual(M.balances(jpy, P, "JPY", 0.6), { Arnav: 0, Ayush: 2500, Manan: -2500 });
  assert.deepEqual(M.balances(inr, P, "INR", 0.6), { Arnav: -3000, Ayush: -3000, Manan: 6000 });
});

test("importing twice adds nothing the second time", function () {
  var r = M.parseSplitwise(SW, P);
  var once = M.mergeImport([], r.expenses);
  var twice = M.mergeImport(once.list, M.parseSplitwise(SW, P).expenses);
  assert.equal(once.added, 4);
  assert.equal(twice.added, 0);
  assert.equal(twice.already, 4);
});

test("unknown members are reported, and can be mapped by hand", function () {
  var csv = "Date,Description,Category,Cost,Currency,Arnav,Rahul Mehta\n2026-11-01,Cab,General,1000,INR,500,-500";
  var r = M.parseSplitwise(csv, P);
  assert.deepEqual(r.unmatched, ["Rahul Mehta"]);
  var r2 = M.parseSplitwise(csv, P, { "Rahul Mehta": "Manan" });
  assert.deepEqual(r2.expenses[0].net, { Arnav: 500, Manan: -500 });
});

test("not a Splitwise file", function () {
  assert.match(M.parseSplitwise("name,amount\nx,1", P).error, /Splitwise/);
});

/* ---------- an invented export laid out exactly like Splitwise's ---------- */
var LIKE_REAL = [
  "Date,Description,Category,Cost,Currency,Arnav S,Manan K,Ayush B",
  "",
  "2026-10-14,Flights,Plane,90000.00,INR,60000.00,-30000.00,-30000.00",
  "2026-10-14,Stay,Hotel,30000.00,INR,-10000.00,-10000.00,20000.00",
  "2026-10-14,Manan K. paid Arnav S.,Payment,30000.00,INR,-30000.00,30000.00,0.00",
  "2026-11-01,Train,Bus/train,3000.00,INR,-1000.00,2000.00,-1000.00",
  "2026-11-01,Sagano,General,1500.00,INR,1000.00,-500.00,-500.00",
  "2026-11-10,Settle all balances,General,5000.00,INR,5000.00,0.00,-5000.00",
  "",
  "2026-11-10,Total balance, , ,INR,25000.00,-8500.00,-16500.00",
  ""
].join("\n");

test("balances match the file's own Total balance row", function () {
  var r = M.parseSplitwise(LIKE_REAL, P);
  assert.deepEqual(r.mapping, { "Arnav S": "Arnav", "Manan K": "Manan", "Ayush B": "Ayush" });
  assert.equal(r.expenses.length, 6);
  assert.equal(r.skipped, 1);
  assert.deepEqual(M.balances(r.expenses, P, "INR", 0.6), { Arnav: 25000, Ayush: -16500, Manan: -8500 });
});

test("Settle all balances is a payment, not spending", function () {
  var r = M.parseSplitwise(LIKE_REAL, P);
  var settle = r.expenses.filter(function (x) { return x.d === "Settle all balances"; })[0];
  assert.equal(M.isPayment(settle), true);
  assert.equal(M.totalSpend(r.expenses, "INR", 0.6), 124500);
});

test("an expense edited in Splitwise replaces the old one on re-import", function () {
  var first = M.mergeImport([], M.parseSplitwise(LIKE_REAL, P).expenses).list;
  var edited = LIKE_REAL.replace("2026-11-01,Sagano,General,1500.00,INR,1000.00,-500.00,-500.00",
                                 "2026-11-01,Sagano,General,1800.00,INR,1200.00,-600.00,-600.00");
  var m = M.mergeImport(first, M.parseSplitwise(edited, P).expenses);
  assert.equal(m.changed, 1);
  assert.equal(m.added, 0);
  assert.equal(m.already, 5);
  assert.equal(m.list.length, 6);
  assert.equal(m.list.filter(function (x) { return x.d === "Sagano"; })[0].a, 1800);
});

test("rows deleted in Splitwise stay here as history", function () {
  var first = M.mergeImport([], M.parseSplitwise(LIKE_REAL, P).expenses).list;
  var fewer = LIKE_REAL.split("\n").filter(function (l) { return l.indexOf(",Train,") < 0; }).join("\n");
  var m = M.mergeImport(first, M.parseSplitwise(fewer, P).expenses);
  assert.equal(m.missing, 1);
  assert.equal(m.list.length, 6);
});

test("categories map onto ours", function () {
  assert.equal(M.bucketOf({ cat: "Plane" }), "Transport");
  assert.equal(M.bucketOf({ cat: "Bus/train" }), "Transport");
  assert.equal(M.bucketOf({ cat: "Hotel" }), "Stay");
  assert.equal(M.bucketOf({ cat: "Dining out" }), "Food");
  assert.equal(M.bucketOf({ cat: "General" }), "Other");
  assert.equal(M.bucketOf({ cat: "Food" }), "Food");
  assert.equal(M.bucketOf({ cat: "Payment" }), "Payment");
});

test("each person's share adds up to the total, and paid follows who paid", function () {
  var s = M.shares(M.parseSplitwise(LIKE_REAL, P).expenses, P, "INR", 0.6);
  assert.deepEqual(s.share, { Arnav: 41500, Ayush: 41500, Manan: 41500 });
  assert.deepEqual(s.paid, { Arnav: 91500, Ayush: 30000, Manan: 3000 });
});

test("the trip report splits before, during and after the trip", function () {
  var days = [{ d: "2026-11-24", city: "In transit" }, { d: "2026-11-25", city: "Tokyo" }, { d: "2026-12-06", city: "Going home" }];
  var exps = M.parseSplitwise(LIKE_REAL, P).expenses.concat([
    { a: 3000, cur: "JPY", p: "Arnav", fx: 0.6, ts: Date.parse("2026-11-25T19:00:00"), cat: "Food" }
  ]);
  var rep = M.report(exps, P, "INR", 0.6, days);
  assert.equal(rep.phase.before, 124500);
  assert.equal(rep.phase.during, 1800);
  assert.equal(rep.byCity.Tokyo, 1800);
  assert.equal(rep.byCat.Food, 1800);
  assert.equal(rep.byCat.Transport, 93000);
  assert.equal(rep.count, 5);
});

test("a General category is guessed from the description", function () {
  assert.equal(M.bucketOf({ cat: "General", d: "Shinkansen" }), "Transport");
  assert.equal(M.bucketOf({ cat: "General", d: "USJ Studio + Express Pass" }), "Activities");
  assert.equal(M.bucketOf({ cat: "General", d: "Teamlab Biovertex" }), "Activities");
  assert.equal(M.bucketOf({ cat: "General", d: "Vaccum Bags" }), "Shopping");
  assert.equal(M.bucketOf({ cat: "General", d: "Something else" }), "Other");
  assert.equal(M.bucketOf({ cat: "Hotel", d: "Shinkansen" }), "Stay", "a real category wins");
});

/* ---------- cash wallet ---------- */
test("the wallet: withdrawals minus cash spending, reset by a count", function () {
  var cash = [
    { who: "Arnav", kind: "withdraw", jpy: 30000, ts: 1 },
    { who: "Arnav", kind: "count", jpy: 20000, ts: 4 },
    { who: "Ayush", kind: "withdraw", jpy: 10000, ts: 1 }
  ];
  var exps = [
    { a: 3000, cur: "JPY", p: "Arnav", cash: true, ts: 2 },
    { a: 5000, cur: "JPY", p: "Arnav", ts: 3 },                 /* on card — not from the wallet */
    { a: 900, cur: "INR", p: "Arnav", cash: true, ts: 3 },      /* rupees — not the yen wallet */
    { a: 1200, cur: "JPY", p: "Arnav", cash: true, ts: 5 }
  ];
  var w = M.walletOf("Arnav", cash, exps, 0);   /* no starting cash, to keep the sums simple */
  assert.equal(w.withdrawn, 30000);
  assert.equal(w.spent, 4200);
  assert.deepEqual(w.lastCount, { ts: 4, jpy: 20000, gap: 7000 }, "¥27,000 expected, ¥20,000 found");
  assert.equal(w.unlogged, 7000);
  assert.equal(w.balance, 18800);
  assert.equal(M.walletOf("Ayush", cash, exps, 0).balance, 10000);
  assert.equal(M.walletOf("Manan", cash, exps, 0).balance, 0);
});

test("everyone starts with ¥15,000", function () {
  assert.equal(M.CASH_START_JPY, 15000);
  assert.equal(M.walletOf("Manan", [], []).balance, 15000);
  var exps = [{ a: 2000, cur: "JPY", p: "Manan", cash: true, ts: 1 }];
  assert.equal(M.walletOf("Manan", [], exps).balance, 13000);
  /* counting ¥12,000 when ¥13,000 was expected: ¥1,000 unlogged */
  assert.equal(M.walletOf("Manan", [{ who: "Manan", kind: "count", jpy: 12000, ts: 2 }], exps).unlogged, 1000);
});

/* ---------- edge cases from the review ---------- */
var HEAD = "Date,Description,Category,Cost,Currency,Arnav S,Ayush B,Manan K";

test("two identical Splitwise rows stay two expenses", function () {
  var csv = HEAD + "\n2026-11-26,Drinks,Dining out,600.00,JPY,400,-200,-200\n2026-11-26,Drinks,Dining out,600.00,JPY,400,-200,-200";
  var r = M.parseSplitwise(csv, P);
  assert.notEqual(r.expenses[0].id, r.expenses[1].id);
  var m = M.mergeImport([], r.expenses);
  assert.equal(m.added, 2);
  assert.deepEqual(M.balances(m.list, P, "JPY", 0.6), { Arnav: 800, Ayush: -400, Manan: -400 });
  assert.equal(M.mergeImport(m.list, M.parseSplitwise(csv, P).expenses).added, 0, "and re-importing adds neither");
});

test("shares with two payers on one Splitwise row", function () {
  /* ¥1,000, Arnav paid 600 and Ayush 400, split three ways */
  var x = { a: 1000, cur: "JPY", fx: 0.6, net: { Arnav: 266.67, Ayush: 66.67, Manan: -333.34 } };
  var s = M.shares([x], P, "JPY", 0.6);
  assert.deepEqual(s.share, { Arnav: 333.33, Ayush: 333.33, Manan: 333.34 });
  assert.deepEqual(s.paid, { Arnav: 600, Ayush: 400, Manan: 0 });
});

test("a Splitwise refund (negative cost) lowers spending and shares", function () {
  var csv = HEAD + "\n2026-11-26,Hotel,Hotel,9000,JPY,6000,-3000,-3000\n2026-11-27,Hotel refund,Hotel,-3000,JPY,-2000,1000,1000";
  var r = M.parseSplitwise(csv, P);
  assert.equal(r.refunds, 1);
  assert.equal(M.totalSpend(r.expenses, "JPY", 0.6), 6000);
  var s = M.shares(r.expenses, P, "JPY", 0.6);
  assert.deepEqual(s.share, { Arnav: 2000, Ayush: 2000, Manan: 2000 });
  assert.deepEqual(M.balances(r.expenses, P, "JPY", 0.6), { Arnav: 4000, Ayush: -2000, Manan: -2000 });
});

test("rows that don't involve any of you are skipped, not charged to Arnav", function () {
  var csv = "Date,Description,Category,Cost,Currency,Arnav S,Bob X,Carol Y\n2026-11-26,Taxi,Taxi,900,JPY,0,450,-450";
  var r = M.parseSplitwise(csv, P);
  assert.equal(r.expenses.length, 0);
  assert.equal(r.outside, 1);
});

test("a blank header between members doesn't shift the columns", function () {
  var csv = "Date,Description,Category,Cost,Currency,Arnav S,,Ayush B,Manan K\n2026-11-26,Lunch,Food,900,JPY,600,,-300,-300";
  var r = M.parseSplitwise(csv, P);
  assert.deepEqual(r.expenses[0].net, { Arnav: 600, Ayush: -300, Manan: -300 });
});

test("two members matching the same person are flagged", function () {
  var csv = "Date,Description,Category,Cost,Currency,Arnav S,Arnav K,Manan K\n2026-11-26,Lunch,Food,900,JPY,600,-300,-300";
  assert.deepEqual(M.parseSplitwise(csv, P).clashes, [{ person: "Arnav", members: ["Arnav S", "Arnav K"] }]);
});

test("currencies other than yen and rupees are counted, not silently lost", function () {
  var r = M.parseSplitwise(HEAD + "\n2026-11-26,Duty free,General,50,USD,50,-25,-25", P);
  assert.equal(r.otherCur, 1);
  assert.equal(r.expenses.length, 0);
});

test("an expense deleted here doesn't come back on re-import", function () {
  var r = M.parseSplitwise(LIKE_REAL, P).expenses;
  var del = {}; del[r[0].id] = 123;
  var m = M.mergeImport(r.slice(1), M.parseSplitwise(LIKE_REAL, P).expenses, { deleted: del });
  assert.equal(m.added, 0);
  assert.equal(m.skippedDeleted, 1);
});

test("a row renamed here still matches when Splitwise edits it later", function () {
  var first = M.mergeImport([], M.parseSplitwise(LIKE_REAL, P).expenses).list;
  var sag = first.filter(function (x) { return x.d === "Sagano"; })[0];
  sag.d = "Sagano romantic train"; sag.ts = Date.parse("2026-11-02T12:00:00"); sag.cat = "Activities"; sag.catLocal = true; sag.cash = true;
  var edited = LIKE_REAL.replace("2026-11-01,Sagano,General,1500.00,INR,1000.00,-500.00,-500.00",
                                 "2026-11-01,Sagano,General,1800.00,INR,1200.00,-600.00,-600.00");
  var m = M.mergeImport(first, M.parseSplitwise(edited, P).expenses);
  assert.equal(m.changed, 1);
  assert.equal(m.added, 0);
  var now = m.list.filter(function (x) { return x.a === 1800; })[0];
  assert.equal(now.cat, "Activities", "the category set here is kept");
  assert.equal(now.cash, true, "and the cash tick");
});

test("an edited row keeps the rate it was imported at", function () {
  var first = M.mergeImport([], M.parseSplitwise(LIKE_REAL, P).expenses.map(function (x) { x.fx = 0.55; return x; })).list;
  var edited = M.parseSplitwise(LIKE_REAL.replace("Sagano,General,1500.00,INR,1000.00,-500.00,-500.00", "Sagano,General,1800.00,INR,1200.00,-600.00,-600.00"), P)
    .expenses.map(function (x) { x.fx = 0.62; return x; });
  var m = M.mergeImport(first, edited);
  assert.equal(m.list.filter(function (x) { return x.d === "Sagano"; })[0].fx, 0.55);
});

test("rows kept as history are named, and likely duplicates of hand-logged ones flagged", function () {
  var mine = [{ id: "m1", d: "Train tickets", a: 3000, cur: "INR", p: "Manan", ts: Date.parse("2026-11-01T09:00:00") }];
  var m = M.mergeImport(mine, M.parseSplitwise(LIKE_REAL, P).expenses);
  assert.deepEqual(m.dupes, [{ imported: "Train", existing: "Train tickets", day: "2026-11-01" }]);
  var fewer = LIKE_REAL.split("\n").filter(function (l) { return l.indexOf(",Stay,") < 0; }).join("\n");
  var m2 = M.mergeImport(m.list, M.parseSplitwise(fewer, P).expenses);
  assert.deepEqual(m2.kept, [{ d: "Stay", day: "2026-10-14", a: 30000, cur: "INR" }]);
});

test("typed amounts", function () {
  assert.equal(M.parseAmount("1,200"), 1200);
  assert.equal(M.parseAmount("1,20,000"), 120000);
  assert.equal(M.parseAmount("1200.50"), 1200.5);
  assert.equal(M.parseAmount("12,50"), 12.5);
  assert.equal(M.parseAmount("1.200,50"), 1200.5);
  assert.equal(M.parseAmount(" ¥3,000 "), 3000);
  assert.ok(isNaN(M.parseAmount("-500")), "no silent minus");
  assert.ok(isNaN(M.parseAmount("1e5")));
  assert.ok(isNaN(M.parseAmount("abc")));
  assert.ok(isNaN(M.parseAmount("")));
  assert.equal(M.parseAmount("0"), 0);
});

test("the same settle-up on two phones has one id", function () {
  assert.equal(M.paymentId("Manan", "Ayush", 12901.79, "2026-11-10"), "pay:Manan:Ayush:1290179:2026-11-10");
});

/* ---------- refunds, uneven splits, several payers ---------- */
test("an uneven split by amounts", function () {
  var x = { a: 3000, cur: "JPY", p: "Arnav", owe: { Arnav: 1000, Ayush: 2000 } };
  assert.deepEqual(M.netOf(x, P), { Arnav: 2000, Ayush: -2000, Manan: 0 });
  assert.deepEqual(M.shares([x], P, "JPY", 0.6).share, { Arnav: 1000, Ayush: 2000, Manan: 0 });
});

test("a split by shares adds up exactly", function () {
  assert.deepEqual(M.oweFromWeights(1000, { Arnav: 2, Ayush: 1, Manan: 0 }, P), { Arnav: 666.67, Ayush: 333.33 });
  assert.deepEqual(M.oweFromWeights(100, { Arnav: 1, Ayush: 1, Manan: 1 }, P), { Arnav: 33.34, Ayush: 33.33, Manan: 33.33 });
  assert.equal(M.oweFromWeights(100, {}, P), null);
});

test("several payers on one expense", function () {
  var x = { a: 9000, cur: "JPY", p: "Arnav", paid: { Arnav: 6000, Ayush: 3000 } };
  assert.deepEqual(M.netOf(x, P), { Arnav: 3000, Ayush: 0, Manan: -3000 });
  var s = M.shares([x], P, "JPY", 0.6);
  assert.deepEqual(s.paid, { Arnav: 6000, Ayush: 3000, Manan: 0 });
  assert.deepEqual(s.share, { Arnav: 3000, Ayush: 3000, Manan: 3000 });
});

test("several payers and an uneven split together", function () {
  var x = { a: 1000, cur: "JPY", p: "Arnav", paid: { Arnav: 700, Manan: 300 }, owe: { Arnav: 200, Ayush: 500, Manan: 300 } };
  assert.deepEqual(M.netOf(x, P), { Arnav: 500, Ayush: -500, Manan: 0 });
});

test("a refund runs the expense backwards", function () {
  var ticket = { a: 9000, cur: "INR", fx: 0.6, p: "Arnav" };
  var refund = { a: 3000, cur: "INR", fx: 0.6, p: "Arnav", refund: true };   /* Arnav got ₹3,000 back */
  assert.deepEqual(M.balances([ticket, refund], P, "INR", 0.6), { Arnav: 4000, Ayush: -2000, Manan: -2000 });
  assert.equal(M.totalSpend([ticket, refund], "INR", 0.6), 6000);
  assert.deepEqual(M.shares([ticket, refund], P, "INR", 0.6).share, { Arnav: 2000, Ayush: 2000, Manan: 2000 });
  var days = [{ d: "2026-11-24", city: "x" }, { d: "2026-12-06", city: "y" }];
  assert.equal(M.report([ticket, refund], P, "INR", 0.6, days).total, 6000);
});

test("cash: each payer's part leaves their wallet; a cash refund comes back", function () {
  var exps = [
    { a: 9000, cur: "JPY", p: "Arnav", paid: { Arnav: 6000, Ayush: 3000 }, cash: true, ts: 1 },
    { a: 1000, cur: "JPY", p: "Arnav", refund: true, cash: true, ts: 2 }
  ];
  assert.equal(M.walletOf("Arnav", [], exps).balance, 15000 - 6000 + 1000);
  assert.equal(M.walletOf("Ayush", [], exps).balance, 15000 - 3000);
});

test("amounts that should add up to the total", function () {
  assert.deepEqual(M.addsUp(1000, { Arnav: 333.33, Ayush: 333.33, Manan: 333.34 }), { ok: true, sum: 1000, left: 0 });
  assert.deepEqual(M.addsUp(1000, { Arnav: 600 }), { ok: false, sum: 600, left: 400 });
});
