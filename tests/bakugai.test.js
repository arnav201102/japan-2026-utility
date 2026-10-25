/* Run with: node --test */
var test = require("node:test");
var assert = require("node:assert/strict");
var W = require("../bakugai.js");

/* the rate the original guide was worked out at */
var cfg = Object.assign({}, W.CONFIG, { jpy_to_inr: 0.63 });
var R = 0.63;

test("refund takes the tax out of a tax-inclusive tag (÷1.1, not ×0.9)", function () {
  assert.equal(Math.round(W.effectiveInr(11000, R, cfg)), 6300);
  assert.equal(Math.round(W.effectiveInr(50000, R, cfg)), 28636);
});

test("under the ¥5,000 tax-excluded minimum there is no refund", function () {
  assert.equal(W.refundApplies(4500, cfg), false);
  assert.equal(W.effectiveInr(4500, R, cfg), 4500 * R);
  assert.equal(W.effectiveInr(1800, R, cfg), 1800 * R);
});

test("the minimum is checked on the tax-excluded price", function () {
  assert.equal(W.refundApplies(5400, cfg), false); /* ¥4,909 before tax */
  assert.equal(W.refundApplies(5500, cfg), true);  /* exactly ¥5,000 before tax */
  assert.equal(Math.round(W.effectiveInr(5500, R, cfg)), Math.round(5000 * R));
});

test("saving is null when there is no India price", function () {
  assert.equal(W.savingPct(13800, null), null);
  assert.equal(W.savingPct(13800, undefined), null);
  assert.equal(W.savingPct(13800, 0), null);
  var p = W.priced(W.WATCHES.find(function (w) { return w.id === "attesa-entry"; }), R, cfg);
  assert.equal(p.india_inr, null);
  assert.equal(p.saving_pct, null);
});

test("saving percentage, including Japan costing more", function () {
  assert.equal(W.savingPct(28636, 47000), 39);
  assert.equal(W.savingPct(5000, 4000), -25);
});

test("a card markup raises every figure", function () {
  var marked = Object.assign({}, cfg, { card_markup_pct: 2 });
  assert.equal(Math.round(W.effectiveInr(11000, R, marked)), Math.round(W.effectiveInr(11000, R, cfg) * 1.02));
});

test("changing the rate moves every price", function () {
  W.WATCHES.forEach(function (w) {
    var a = W.priced(w, 0.63, cfg).jp_effective_inr;
    var b = W.priced(w, 0.55, cfg).jp_effective_inr;
    assert.ok(b < a, w.id);
  });
});

test("at ₹0.63 every watch lands in the band the guide put it in", function () {
  W.WATCHES.forEach(function (w) {
    assert.equal(W.priced(w, R, cfg).live_band, w.band, w.id);
  });
});

test("movement kinds", function () {
  assert.equal(W.movementKind("automatic"), "automatic");
  assert.equal(W.movementKind("solar radio-controlled bluetooth"), "solar");
  assert.equal(W.movementKind("quartz"), "quartz");
});

test("data is well formed", function () {
  var ids = {};
  W.WATCHES.forEach(function (w) {
    assert.ok(!ids[w.id], "duplicate id " + w.id); ids[w.id] = 1;
    assert.ok(w.jp_tag_jpy > 0, w.id);
    assert.equal(w.link_verified, w.link !== null, w.id + ": a link must be verified, or null");
    if (w.link) assert.match(w.link, /^https:\/\//, w.id);
  });
  W.JAPAN_ONLY.concat(W.ABOVE_BUDGET, W.SHOP_ITEMS).forEach(function (x) {
    assert.equal(x.link_verified, x.link !== null, x.line || x.category);
  });
});

/* ---------- customs ---------- */
var STD = W.dutyRate("std", cfg), ALT = W.dutyRate("alt", cfg), SWS = W.dutyRate("sws", cfg);

test("duty-rate options", function () {
  assert.equal(STD, 0.35);
  assert.equal(ALT, 0.10);
  assert.ok(Math.abs(SWS - 0.385) < 1e-12);
  var on = Object.assign({}, cfg, { surcharge_on_baggage: true });
  assert.ok(Math.abs(W.dutyRate("std", on) - 0.385) < 1e-12, "the surcharge toggle lifts the default");
});

test("break-even saving", function () {
  assert.equal(Math.round(W.breakEvenPct(0.35) * 10) / 10, 25.9);
  assert.equal(Math.round(W.breakEvenPct(0.385) * 10) / 10, 27.8);
  assert.equal(W.belowBreakEven(15, 0.35), true);
  assert.equal(W.belowBreakEven(40, 0.35), false);
  assert.equal(W.belowBreakEven(null, 0.35), false);
});

test("spend under the allowance pays nothing", function () {
  var c = W.dutyCalc({ total: 60000 }, STD, cfg);
  assert.equal(c.excess, 0); assert.equal(c.duty, 0); assert.equal(c.landed, 60000);
});

test("spend exactly at ₹75,000 pays nothing", function () {
  var c = W.dutyCalc({ items: [{ inr: 50000 }, { inr: 25000 }] }, STD, cfg);
  assert.equal(c.excess, 0); assert.equal(c.duty, 0);
  assert.equal(W.dutyCalc({ total: 75001 }, STD, cfg).excess, 1);
});

test("one laptop is exempt on top of the allowance", function () {
  var c = W.dutyCalc({ items: [{ inr: 95000, is_laptop: true }, { inr: 80000 }] }, STD, cfg);
  assert.equal(c.laptop_value, 95000);
  assert.equal(c.excess, 5000);
  assert.equal(c.duty, 1750);
});

test("two laptops: only the first is exempt", function () {
  var c = W.dutyCalc({ items: [{ inr: 95000, is_laptop: true }, { inr: 90000, is_laptop: true }] }, STD, cfg);
  assert.equal(c.laptop_value, 95000);
  assert.equal(c.dutiable_base, 90000);
  assert.equal(c.excess, 15000);
});

test("quick mode: laptop can't exceed the total, and laptop_exempt off removes it", function () {
  assert.equal(W.dutyCalc({ total: 50000, laptop: 95000 }, STD, cfg).laptop_value, 50000);
  var off = Object.assign({}, cfg, { laptop_exempt: false });
  assert.equal(W.dutyCalc({ total: 100000, laptop: 95000 }, STD, off).excess, 25000);
});

test("each duty-rate option on the same excess", function () {
  assert.equal(W.dutyCalc({ total: 100000 }, STD, cfg).duty, 8750);
  assert.equal(W.dutyCalc({ total: 100000 }, ALT, cfg).duty, 2500);
  assert.equal(Math.round(W.dutyCalc({ total: 100000 }, SWS, cfg).duty), 9625);
});

test("a 0% saving means India costs the same, so duty is pure loss", function () {
  assert.equal(W.indiaEquivalent(100000, 0), 100000);
  var s = W.scenario(100000, 0, STD, 0, cfg);
  assert.equal(s.net_saving, -8750);
  assert.equal(W.indiaEquivalent(100000, 100), null);
});

test("marginal saving past the allowance (the ~5% insight)", function () {
  assert.equal(Math.round(W.marginalSavingPct(0.35, 30) * 10) / 10, 5.5);
  assert.ok(W.marginalSavingPct(0.35, 20) < 0, "a 20% saving loses money once dutied");
});

/* the brief's scenario table: spend, laptop, excess, duty35, landed35, duty10, landed10, india, net35 */
var TABLE = [
  [50000, 0, 0, 0, 50000, 0, 50000, 71400, 21400],
  [100000, 0, 25000, 8750, 108750, 2500, 102500, 142900, 34150],
  [100000, 95000, 0, 0, 100000, 0, 100000, 142900, 42900],
  [150000, 0, 75000, 26250, 176250, 7500, 157500, 214300, 38050],
  [150000, 95000, 0, 0, 150000, 0, 150000, 214300, 64300],
  [200000, 0, 125000, 43750, 243750, 12500, 212500, 285700, 41950],
  [200000, 95000, 30000, 10500, 210500, 3000, 203000, 285700, 75200],
  [250000, 0, 175000, 61250, 311250, 17500, 267500, 357100, 45850],
  [250000, 95000, 80000, 28000, 278000, 8000, 258000, 357100, 79100]
];
TABLE.forEach(function (r) {
  test("scenario ₹" + r[0] + (r[1] ? " with laptop" : "") + " matches the brief", function () {
    var a = W.scenario(r[0], r[1], STD, 30, cfg), b = W.scenario(r[0], r[1], ALT, 30, cfg);
    assert.equal(a.excess, r[2]);
    assert.equal(Math.round(a.duty), r[3]);
    assert.equal(Math.round(a.landed), r[4]);
    assert.equal(Math.round(b.duty), r[5]);
    assert.equal(Math.round(b.landed), r[6]);
    assert.ok(Math.abs(a.india_equivalent - r[7]) <= 100, "india " + a.india_equivalent);
    assert.ok(Math.abs(a.net_saving - r[8]) <= 100, "net " + a.net_saving);
  });
});

/* ---------- shop products ---------- */
test("products price like the watches, and tolerate missing prices", function () {
  var p = W.pricedProduct({ jp_tag_jpy: 11000, india_inr: 8000 }, R, cfg);
  assert.equal(p.jp_effective_inr, 6300);
  assert.equal(p.saving_pct, 21);
  var q = W.pricedProduct({ jp_tag_jpy: null, india_inr: 8000 }, R, cfg);
  assert.equal(q.jp_effective_inr, null);
  assert.equal(q.saving_pct, null);
  assert.equal(W.pricedProduct({ jp_tag_jpy: 330, india_inr: null }, R, cfg).refund, false);
});

test("every product belongs to a category and links are verified or null", function () {
  var cats = {};
  W.SHOP_ITEMS.forEach(function (x) { cats[x.id] = 1; assert.ok(x.tab, x.id + " needs a tab label"); });
  var ids = {};
  W.SHOP_PRODUCTS.forEach(function (p) {
    assert.ok(cats[p.cat], p.name + ": unknown category " + p.cat);
    assert.ok(!ids[p.id], "duplicate id " + p.id); ids[p.id] = 1;
    assert.equal(p.link_verified, p.link !== null, p.name);
    if (p.jp_tag_jpy !== null) assert.ok(p.jp_tag_jpy > 0, p.name);
  });
});

test("online-only products get no refund, whatever the price", function () {
  var p = W.pricedProduct({ jp_tag_jpy: 110000, india_inr: 79900, no_refund: true }, R, cfg);
  assert.equal(p.refund, false);
  assert.equal(p.jp_effective_inr, Math.round(110000 * R));
  assert.equal(Math.round(W.effectiveInr(110000, R, cfg, true)), Math.round(110000 * R));
  assert.equal(Math.round(W.effectiveInr(110000, R, cfg)), Math.round(100000 * R));
});
