/* Run with: node --test
   index.html is one big script, so a second function with the same name
   silently replaces the first. This caught renderBuys being shadowed once. */
var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");

var html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
var scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
var js = scripts.join("\n");

test("no top-level function or var is declared twice", function () {
  var seen = {}, dups = [];
  (js.match(/^(?:function|var) ([A-Za-z0-9_$]+)/gm) || []).forEach(function (m) {
    var n = m.split(/\s+/)[1];
    if (seen[n]) dups.push(n); seen[n] = 1;
  });
  assert.deepEqual(dups, []);
});

test("the inline script parses", function () {
  assert.doesNotThrow(function () { new Function(js.replace(/<\/?script>/g, "")); });
});

test("every tab button has a panel", function () {
  (html.match(/data-p="([a-z]+)"/g) || []).forEach(function (m) {
    var id = m.slice(8, -1);
    assert.ok(html.indexOf('id="p-' + id + '"') > -1, "missing panel p-" + id);
  });
});
