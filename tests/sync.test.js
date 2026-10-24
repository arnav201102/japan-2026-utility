/* Run with: node --test */
var test = require("node:test");
var assert = require("node:assert/strict");
var T = require("../sync.js");

function st(items, scal, del) {
  return { colls: { list: items || [] }, scal: scal || {}, del: del || {} };
}
function clone(x) { return JSON.parse(JSON.stringify(x)); }
function ids(s) { return s.colls.list.map(function (i) { return i.id; }); }

test("two phones adding different things keep both", function () {
  var a = st([{ id: "x", t: "Tea", m: 100 }]);
  var b = st([{ id: "y", t: "Knife", m: 120 }]);
  assert.deepEqual(ids(T.merge(a, b, 1000)).sort(), ["x", "y"]);
});

test("a deletion on one phone removes it everywhere", function () {
  var local = st([], {}, { list: { x: 200 } });
  var remote = st([{ id: "x", t: "Tea", m: 100 }]);
  assert.deepEqual(ids(T.merge(local, remote, 1000)), []);
});

test("an edit made after a deletion brings the item back; an older one doesn't", function () {
  var del = { list: { x: 200 } };
  assert.deepEqual(ids(T.merge(st([], {}, del), st([{ id: "x", t: "Tea", k: true, m: 300 }]), 1000)), ["x"]);
  assert.deepEqual(ids(T.merge(st([], {}, del), st([{ id: "x", t: "Tea", k: true, m: 150 }]), 1000)), []);
});

test("an overwritten save isn't lost: missing from the cloud is not deleted", function () {
  /* Ayush's phone saved "Hibiki" but Arnav's phone wrote over the cloud before seeing it */
  var ayush = st([{ id: "a", t: "Tea", m: 100 }, { id: "h", t: "Hibiki", m: 500 }]);
  var cloud = st([{ id: "a", t: "Tea", m: 100 }]);
  var merged = T.merge(ayush, cloud, 1000);
  assert.deepEqual(ids(merged), ["a", "h"]);
  assert.equal(T.same(merged, cloud), false, "so Ayush's phone writes it back");
});

test("the newer edit of the same item wins, and a tie goes to the cloud copy", function () {
  var mine = st([{ id: "x", t: "Tea", k: true, m: 300 }]);
  var cloud = st([{ id: "x", t: "Tea", k: false, m: 200 }]);
  assert.equal(T.merge(mine, cloud, 1000).colls.list[0].k, true);
  var tie = st([{ id: "x", t: "Tea", k: false, m: 300 }]);
  assert.equal(T.merge(mine, tie, 1000).colls.list[0].k, false);
});

test("values like the budget: newer wins", function () {
  var a = st([], { budget: { v: 300000, m: 50 } }), b = st([], { budget: { v: 250000, m: 90 } });
  assert.equal(T.merge(a, b, 1000).scal.budget.v, 250000);
  assert.equal(T.merge(b, a, 1000).scal.budget.v, 250000);
});

test("stamp notices adds, edits and deletes against the snapshot", function () {
  var s = st([{ id: "x", t: "Tea", k: false }, { id: "y", t: "Pen" }], { budget: { v: 1, m: 0 } });
  var snap = T.snapshot(s);
  s.colls.list[0].k = true;              /* edit */
  s.colls.list.splice(1, 1);             /* delete y */
  s.colls.list.push({ id: "z", t: "Mug" }); /* add */
  s.scal.budget.v = 2;
  assert.equal(T.stamp(s, snap, 777), true);
  assert.equal(s.colls.list[0].m, 777);
  assert.equal(s.colls.list[1].m, 777);
  assert.equal(s.del.list.y, 777);
  assert.equal(s.scal.budget.m, 777);
  assert.equal(T.stamp(s, T.snapshot(s), 888), false, "nothing new the second time");
});

test("an offline edit survives closing the app: the snapshot is what's saved", function () {
  var s = st([{ id: "x", t: "Tea", k: false, m: 10 }]);
  var savedSnap = JSON.parse(JSON.stringify(T.snapshot(s)));
  s.colls.list[0].k = true;                       /* ticked offline, sync failed */
  var reopened = clone(s);                        /* app closed and reopened */
  assert.equal(T.stamp(reopened, savedSnap, 999), true);
  var merged = T.merge(reopened, st([{ id: "x", t: "Tea", k: false, m: 10 }]), 1000);
  assert.equal(merged.colls.list[0].k, true);
});

test("first run after the update doesn't let stale copies beat newer cloud edits", function () {
  var stale = st([{ id: "x", t: "Tea", k: false }, { id: "mine", t: "Only here" }]);
  assert.equal(T.stamp(stale, null, 5000), false);
  assert.equal(stale.colls.list[0].m, 0);
  var cloud = st([{ id: "x", t: "Tea", k: true, m: 4000 }]);
  var merged = T.merge(stale, cloud, 6000);
  assert.equal(merged.colls.list[0].k, true, "the cloud's newer tick wins");
  assert.deepEqual(ids(merged), ["x", "mine"], "but nothing this phone has is dropped");
});

test("old items get the same id on every phone, duplicates stay separate", function () {
  var a = [{ t: "KitKat", a: 500 }, { t: "KitKat", a: 500 }, { t: "Tea", a: 300 }];
  var b = clone(a);
  assert.equal(T.ensureIds("buy", a, ["t", "a"]), true);
  T.ensureIds("buy", b, ["t", "a"]);
  assert.deepEqual(a.map(function (x) { return x.id; }), b.map(function (x) { return x.id; }));
  assert.notEqual(a[0].id, a[1].id);
  assert.equal(T.ensureIds("buy", a, ["t", "a"]), false, "already have ids");
});

test("tombstones are forgotten after 90 days", function () {
  var day = 86400000, now = 100 * day;
  var merged = T.merge(st([], {}, { list: { old: 5 * day, recent: 50 * day } }), st([]), now);
  assert.deepEqual(Object.keys(merged.del.list), ["recent"]);
});

test("same() ignores key order but not content", function () {
  var a = { colls: { list: [{ id: "x", t: "a", m: 1 }] }, scal: {}, del: { list: { p: 1, q: 2 } } };
  var b = { colls: { list: [{ t: "a", id: "x", m: 1 }] }, scal: {}, del: { list: { q: 2, p: 1 } } };
  assert.equal(T.same(a, b), true);
  b.colls.list[0].m = 2;
  assert.equal(T.same(a, b), false);
});

test("uid is unique enough", function () {
  var seen = {};
  for (var i = 0; i < 2000; i++) { var u = T.uid(); assert.ok(!seen[u]); seen[u] = 1; }
});
