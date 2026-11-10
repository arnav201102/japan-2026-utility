/* Run with: node --test — the evening Telegram wrap-up, on invented data */
var test = require("node:test");
var assert = require("node:assert/strict");
var W = require("../scripts/telegram-wrap.js");

var DAYS = [
  { d: "2026-11-24", dow: "Tue", city: "In transit", t: "Delhi → Tokyo" },
  { d: "2026-11-25", dow: "Wed", city: "Tokyo", t: "Meiji Jingu, Harajuku, Shibuya" },
  { d: "2026-11-26", dow: "Thu", city: "Mt. Fuji", t: "Chureito, Kawaguchiko by bike" }
];
function at(iso, hh) { return Date.parse(iso + "T" + (hh || "12") + ":00:00"); }

var REC = {
  exps: [
    { id: "a", d: "Flights", a: 90000, cur: "INR", fx: 0.6, p: "Arnav", ts: at("2026-10-14") },
    { id: "b", d: "Ramen", a: 3600, cur: "JPY", fx: 0.6, p: "Ayush", cash: true, ts: at("2026-11-25", "13") },
    { id: "c", d: "Shibuya Sky", a: 7500, cur: "JPY", fx: 0.6, p: "Arnav", ts: at("2026-11-25", "16") },
    { id: "d", d: "Manan paid Arnav", a: 1000, cur: "INR", fx: 0.6, p: "Manan", split: ["Arnav"], cat: "Payment", ts: at("2026-11-25", "20") }
  ],
  cash: [{ id: "w", who: "Manan", kind: "count", jpy: 3000, ts: at("2026-11-25", "21") }]
};

test("the itinerary and cloud details are read from index.html", function () {
  var idx = W.fromIndex();
  assert.equal(idx.days.length, 13);
  assert.equal(idx.days[0].d, "2026-11-24");
  assert.ok(idx.bin && idx.key);
});

test("Japan date", function () {
  assert.equal(W.jstToday(Date.parse("2026-11-25T13:30:00Z")), "2026-11-25", "22:30 in Tokyo");
  assert.equal(W.jstToday(Date.parse("2026-11-25T15:30:00Z")), "2026-11-26", "00:30 in Tokyo is the next day");
});

test("the wrap-up for a trip day", function () {
  var msg = W.buildWrap(REC, DAYS, "2026-11-25", 0.6);
  assert.match(msg, /Day 2 wrap · 25 Nov · Tokyo/);
  assert.match(msg, /Spent today: ¥11,100 \(≈ ₹6,660\) · 2 expenses/, "the payment isn't spending");
  assert.match(msg, /Ayush paid ¥3,600 · Arnav paid ¥7,500|Arnav paid ¥7,500 · Ayush paid ¥3,600/);
  assert.match(msg, /On the trip so far: ¥11,100 · about ¥5,550 a day/);
  assert.match(msg, /Cash wallets: Arnav ¥15,000 · Ayush ¥11,400 · Manan ¥3,000 \(low\)/);
  assert.match(msg, /To settle: /);
  assert.match(msg, /Tomorrow, Day 3 · Mt\. Fuji: Chureito/);
});

test("a quiet day says so, and the last day has no tomorrow", function () {
  var msg = W.buildWrap(REC, DAYS, "2026-11-26", 0.6);
  assert.match(msg, /Nothing logged today/);
  assert.doesNotMatch(msg, /Tomorrow/);
});

test("outside the trip there's no day number and no tomorrow", function () {
  var msg = W.buildWrap(REC, DAYS, "2026-11-10", 0.6);
  assert.doesNotMatch(msg, /Day \d|Tomorrow/);
});
