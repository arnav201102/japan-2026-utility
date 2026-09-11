/* Japan 2026 — offline cache.
   The page, the icons and the fonts get kept on the phone. The exchange rate
   and the weather are never cached here; they have their own saved values in
   local storage and say how old they are. */

var VERSION = "jp2026-v2";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      /* addAll fails the whole install if any one file 404s, so add them one
         at a time and let the page itself be the only thing that must land. */
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isLiveData(url) {
  return /api\.open-meteo\.com|frankfurter|exchangerate-api|er-api\.com|currency-api|jsdelivr/.test(url);
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = req.url;
  if (isLiveData(url)) return;                      /* always straight to the network */

  var isPage = req.mode === "navigate" ||
               (req.headers.get("accept") || "").indexOf("text/html") > -1;

  if (isPage) {
    /* Network first, so a redeploy lands next time you open it on wifi.
       Fall back to whatever was cached — this is the aeroplane-mode path. */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (hit) {
          return hit || caches.match("./") || new Response(
            "<h1>Offline</h1><p>Open this once on wifi and it will work without a signal after that.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }
          );
        });
      })
    );
    return;
  }

  /* Everything else — icons, the Google fonts CSS and the font files — comes
     from the cache if it is there, and gets added to it if it is not. */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === "opaque")) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy).catch(function () {}); });
        }
        return res;
      }).catch(function () {
        return hit || Response.error();
      });
    })
  );
});
