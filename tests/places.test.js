/* Run with: node --test */
var test = require("node:test");
var assert = require("node:assert/strict");
var P = require("../places.js");

test("every place is well formed", function () {
  var ids = {};
  P.PLACES.forEach(function (p) {
    assert.ok(!ids[p.id], "duplicate id " + p.id); ids[p.id] = 1;
    assert.ok(p.name, p.id);
    assert.ok(P.KINDS.indexOf(p.kind) > -1, p.id + " kind " + p.kind);
    assert.ok(P.AREAS.indexOf(p.area) > -1, p.id + " area " + p.area);
    assert.ok(p.lat > 30 && p.lat < 40 && p.lng > 130 && p.lng < 145, p.id + " is in Japan");
    if (p.day) assert.match(p.day, /^2026-(11-2[4-9]|11-30|12-0[1-6])$/, p.id + " day inside the trip");
  });
});

test("no duplicate places", function () {
  var seen = {};
  P.PLACES.forEach(function (p) {
    var k = p.name + "|" + p.lat + "|" + p.lng;
    assert.ok(!seen[k], "duplicate " + p.name); seen[k] = 1;
  });
});

test("map links search by name, or by coordinates for unnamed pins", function () {
  var named = P.PLACES.filter(function (p) { return p.name === "Kiyomizu-dera"; })[0];
  assert.match(P.mapUrl(named), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Kiyomizu-dera/);
  var pin = P.PLACES.filter(function (p) { return /^Pinned spot/.test(p.name); })[0];
  assert.ok(P.mapUrl(pin).indexOf(encodeURIComponent(pin.lat + "," + pin.lng)) > -1);
});

test("distance and per-day lookup", function () {
  /* Tokyo Station to Kyoto Station is about 370 km in a straight line */
  var km = P.distanceKm(35.6812, 139.7671, 34.9858, 135.7588);
  assert.ok(km > 360 && km < 380, String(km));
  assert.ok(P.forDay("2026-11-26").every(function (p) { return p.area === "Fuji"; }), "Fuji day is all Fuji");
});
