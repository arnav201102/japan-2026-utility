/* Japan 2026 — merging the shared trip record so nobody's edits get lost.

   The cloud is one JSON record that all three phones read and write. Writing
   the whole thing back used to mean the last phone to save wiped whatever the
   others had added since it last looked. Now every save is pull → merge → push:

   - every item in a shared list has an id and m, the time it last changed;
   - a change is noticed by comparing against a snapshot of the last state,
     so the code that edits lists doesn't have to remember to stamp anything;
   - deleting leaves a tombstone, so an item missing from the cloud is never
     taken to mean "deleted" — a save that got overwritten just comes back;
   - the newer edit of an item wins; a deletion wins only over older edits.

   Pure functions, no DOM. index.html loads it with a <script> tag;
   tests/sync.test.js loads it with require(). */
(function (root) {

var TOMBSTONE_DAYS = 90;

/* djb2: short, stable across phones — used only to name items saved before ids existed */
function hash(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* Give every item an id. Items from before ids existed get one made from their
   content, the same on every phone, so the same old item never doubles up. */
function ensureIds(prefix, arr, fields) {
  var seen = {}, changed = false;
  (arr || []).forEach(function (it) {
    if (!it || it.id) return;
    var base = prefix + ":" + hash(fields.map(function (f) { return String(it[f] == null ? "" : it[f]); }).join("|"));
    var n = seen[base] = (seen[base] || 0) + 1;
    it.id = n > 1 ? base + "#" + n : base;
    changed = true;
  });
  return changed;
}

/* an item as it compares for "did it change" — m itself doesn't count */
function body(it) {
  var o = {}, keys = Object.keys(it).sort();
  keys.forEach(function (k) { if (k !== "m") o[k] = it[k]; });
  return JSON.stringify(o);
}

/* state: {colls:{key:[items]}, scal:{key:{v, m}}, del:{key:{id:ms}}} */
function snapshot(state) {
  var snap = { c: {}, s: {} };
  Object.keys(state.colls).forEach(function (k) {
    var m = snap.c[k] = {};
    state.colls[k].forEach(function (it) { m[it.id] = body(it); });
  });
  Object.keys(state.scal).forEach(function (k) { snap.s[k] = JSON.stringify(state.scal[k].v); });
  return snap;
}

/* Stamp what changed since snap. With no snapshot yet (first run after this
   update) nothing is claimed as fresh: edit times are unknown, so they're 0
   and anything the cloud knows to be newer wins. Mutates state. */
function stamp(state, snap, now) {
  var changed = false, first = !snap;
  snap = snap || { c: {}, s: {} };
  Object.keys(state.colls).forEach(function (k) {
    var prev = snap.c[k] || {}, cur = {};
    state.colls[k].forEach(function (it) {
      cur[it.id] = 1;
      if (prev[it.id] !== body(it)) {
        it.m = first ? (it.m || 0) : now;
        if (!first) changed = true;
      }
    });
    if (first) return;
    Object.keys(prev).forEach(function (id) {
      if (cur[id]) return;
      (state.del[k] = state.del[k] || {})[id] = now;
      changed = true;
    });
  });
  Object.keys(state.scal).forEach(function (k) {
    var s = state.scal[k];
    if (snap.s[k] !== JSON.stringify(s.v)) {
      s.m = first ? (s.m || 0) : now;
      if (!first) changed = true;
    }
  });
  return changed;
}

function mergeDel(a, b, now) {
  var out = {}, cutoff = now - TOMBSTONE_DAYS * 86400000;
  [a || {}, b || {}].forEach(function (d) {
    Object.keys(d).forEach(function (k) {
      Object.keys(d[k] || {}).forEach(function (id) {
        var t = d[k][id];
        if (t < cutoff) return;
        var o = out[k] = out[k] || {};
        if (!(o[id] >= t)) o[id] = t;
      });
    });
  });
  return out;
}

/* Merge two states. Newer m wins per item and per value; ties go to the cloud
   copy so every phone settles on the same answer. Order follows the cloud,
   with anything only this phone has appended in its own order. */
function merge(local, remote, now) {
  now = now || Date.now();
  var out = { colls: {}, scal: {}, del: mergeDel(local.del, remote.del, now) };
  var keys = {};
  Object.keys(local.colls).concat(Object.keys(remote.colls)).forEach(function (k) { keys[k] = 1; });
  Object.keys(keys).forEach(function (k) {
    var L = {}, R = {}, order = [], seen = {};
    (remote.colls[k] || []).forEach(function (it) { R[it.id] = it; if (!seen[it.id]) { seen[it.id] = 1; order.push(it.id); } });
    (local.colls[k] || []).forEach(function (it) { L[it.id] = it; if (!seen[it.id]) { seen[it.id] = 1; order.push(it.id); } });
    var dead = out.del[k] || {};
    out.colls[k] = [];
    order.forEach(function (id) {
      var a = L[id], b = R[id];
      var pick = !a ? b : !b ? a : ((a.m || 0) > (b.m || 0) ? a : b);
      if (dead[id] != null && dead[id] >= (pick.m || 0)) return;
      out.colls[k].push(pick);
    });
  });
  var sk = {};
  Object.keys(local.scal).concat(Object.keys(remote.scal)).forEach(function (k) { sk[k] = 1; });
  Object.keys(sk).forEach(function (k) {
    var a = local.scal[k], b = remote.scal[k];
    out.scal[k] = !a ? b : !b ? a : ((a.m || 0) > (b.m || 0) ? a : b);
  });
  return out;
}

/* Does the cloud need this state written to it? */
function same(a, b) {
  function canon(s) {
    var o = { c: {}, s: {}, d: {} }, del = s.del || {};
    Object.keys(del).sort().forEach(function (k) {
      o.d[k] = Object.keys(del[k]).sort().map(function (id) { return id + "@" + del[k][id]; });
    });
    Object.keys(s.colls).sort().forEach(function (k) {
      o.c[k] = s.colls[k].map(function (it) { return body(it) + "@" + (it.m || 0); });
    });
    Object.keys(s.scal).sort().forEach(function (k) { o.s[k] = JSON.stringify(s.scal[k]); });
    return JSON.stringify(o);
  }
  return canon(a) === canon(b);
}

var api = {
  TOMBSTONE_DAYS: TOMBSTONE_DAYS, hash: hash, uid: uid, ensureIds: ensureIds,
  snapshot: snapshot, stamp: stamp, merge: merge, same: same
};
if (typeof module === "object" && module.exports) module.exports = api;
else root.TripSync = api;

})(this);
