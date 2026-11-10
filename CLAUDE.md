# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A trip companion PWA for three people (Arnav, Ayush, Manan) on a Japan trip, 24 Nov – 6 Dec 2026. A static site: no build step, no dependencies, no framework, no backend. Deployed to Vercel as plain files; installed to phones' home screens and used offline. README.md is the user-facing manual.

## Commands

```bash
node --test                                   # all tests (Node 18+, nothing to install)
node --test tests/sync.test.js                # one file
node --test --test-name-pattern="laptop"      # tests whose name matches
python3 -m http.server 8765                   # serve locally, open http://localhost:8765/
```

There is no lint, type-check or build. `tests/app.test.js` parses the inline `<script>` in `index.html`, so it is the closest thing to a syntax check for the page.

## Architecture

**`index.html` is the app.** One file: CSS in `<style>`, markup for seven tab panels (`#p-now`, `#p-days`, `#p-money`, `#p-list`, `#p-buy`, `#p-baku`, `#p-info`), and one large ES5 `<script>`. Trip data lives as `var` arrays near the top of that script (`STAY`, `DAYS`, `BOOKINGS`, `PACK`, `DOCS`, `BEFORE`, `NEED`, `GIFTS`, `PHRASES`, `FX_SOURCES`); logic follows; an init sequence at the bottom calls `init*`/`render*` in order. Small helpers are reused everywhere: `$`, `el(tag, class, text)`, `esc`, `yen`, `rupees`, `num`, and `S` (localStorage wrapper that never throws, falls back to memory).

All top-level `function`/`var` names share one global scope. A duplicate name silently replaces the earlier one (this once broke the Buy tab's shopping lists), and `tests/app.test.js` fails on duplicates. Pick distinct names.

**Four pure modules sit beside it**, written as UMD-ish IIFEs so the page loads them with `<script>` (as `window.Bakugai` / `window.TripSync` / `window.TripPlaces` / `window.TripMoney`) and tests `require()` them:

- `bakugai.js`: the 爆 Bakugai tab's data and maths. One `CONFIG` object (exchange-rate fallback, tax refund %, ¥5,000 refund minimum, ₹75,000 India duty-free allowance, 35% baggage duty, laptop exemption, scenario spends), plus `WATCHES`, `SHOP_ITEMS` (categories; an optional `guide: {title, steps, sources}` renders as a how-to box on that category's tab), `SHOP_PRODUCTS` (items in each category; `liquid: "small"|"big"` drives the liquids-bag badge, `no_refund: true` marks online-only buys), `JAPAN_ONLY`, `ABOVE_BUDGET`, `CUSTOMS_LINKS`, `SHOP_LINKS`. Rupee figures are never stored; they are computed from yen at the live rate (`watchRate()` in the page uses the Money tab's `rate`). The tag price includes tax, so the refund is `tag ÷ 1.1`, applied only when the pre-tax price is ≥ ¥5,000. In the page, `WG` refers to this module.
- `sync.js`: merge rules for the shared cloud record (see below). In the page, `TS` refers to this module.
- `places.js`: the 168 places from Manan's shared Google Maps list "Japan" (list id `i90fOtX28k7MoN776yqaVao7MOORKw`), each hand-sorted into `kind` (visit/eat/shop/other), `area`, `hood`, a short `tag`, and the itinerary `day` it fits (or null). It was pulled once from `https://www.google.com/maps/preview/entitylist/getlist?...` (a `)]}'`-prefixed JSON array; places are at `[0][8]`, name at `[2]`, address and coordinates at `[1][4]` and `[1][5]`); new places on the list need sorting by hand. Shown in Days → Places (`renderPlaces`, `#days/places`) and under each day (`placesBlock`, which skips names already in that day's `spots`). In the page, `PL` refers to this module.
- `money.js`: the bill splitter's maths. An expense is `{id, d, a, cur: "JPY"|"INR", p, split?, fx, ts, cat?, src?, net?}`. `fx` locks ₹-per-¥ at the moment it was added, so balances don't move with the live rate; `net` (paid-minus-owed per person, in the expense's currency) comes from Splitwise imports and overrides `p`/`split`. `cat: "Payment"` marks a settle-up between you and is left out of spending. `parseSplitwise` reads a Splitwise group CSV export (Date, Description, Category, Cost, Currency, then one column per member; skips "Total balance" rows), matches members by first name, and gives each row a content-hash `sw:` id so re-imports only add what's new. `settleUp` gives the fewest payments. `isPayment` also catches Splitwise's "Settle all balances" rows (filed as General). `bucketOf` maps any category onto `CATS` (Food, Transport, Stay, Activities, Shopping, Other), guessing from the description when Splitwise says General. `mergeImport` updates a row edited in Splitwise (same day and description, new content) and keeps rows that have vanished from a newer export, as history. `shares`/`report` feed the trip report. Each import is logged in `importLog`, a synced collection (`imports` in the cloud record). Never copy a real Splitwise export into the repo, because it would be published; tests use an invented export in the same layout. In the page, `MO` refers to this module; `normExp` in `index.html` is what keeps these fields through sync and import — add new expense fields there too.

**Cloud sync.** Shared data lives in one JSONBin record (`CLOUD_URL`/`CLOUD_KEY` in `index.html`). Synced data: expenses, budget, the per-person shopping lists (`buyMap`), every checklist/booking list (`getList`/`setList`, stored as `items_<name>`), the Fuji/Kamakura swap, and the per-person Bakugai cart (`cartMap`). Every save is pull → merge → push (`cloudSync`):
- every item has an `id` and `m` (last-modified ms). Items saved before ids existed get deterministic content-hash ids, so every phone picks the same one;
- `stampLocal()` notices changes by diffing against a snapshot persisted in `syncMeta`, so edit sites only need to call `touchCloud()` after mutating state. They never stamp anything themselves;
- deletions are tombstones in `del` (kept 90 days), so an item missing from the cloud never means "deleted";
- `syncMeta.pending` is persisted, so offline edits survive restarts; retries back off, and the `online` event triggers a sync.

When adding new shared data: put it in `localState()`, `remoteState()`, `recordOf()` and `applyState()`, and call `touchCloud()` after every mutation. List items already use a field named `u` (urgent), so don't reuse `u`, `m` or `id` for anything else. Never test against the real JSONBin, because it is the trip's live data. The browser tests used so far intercept `api.jsonbin.io` with a fake record. The fake must send CORS headers and answer the OPTIONS preflight.

**Not synced, on purpose:** passport/document copies (IndexedDB on each phone only, `initDocs`), theme, filters, tab state, and a manually typed exchange rate.

**Routing.** The active tab is in the hash: `#now`, `#days[/places]`, `#money`, `#todo`, `#buy`, `#bakugai[/watches|buys|customs|calculator|scenarios][/<shop category id>]` (`TAB_SLUG`, `SUB_SLUG`, `readPath`, `writePath`). Updates use `history.replaceState`, so Back still leaves the app.

**Offline (`sw.js`).** The page, `bakugai.js`, `sync.js`, `places.js` and `money.js` are fetched network-first (edits land without a cache bump). Icons and fonts are cache-first. Live APIs (rates, weather, JSONBin) bypass the cache. To add a new script, add it to `SHELL` and to the network-first regex; bump `VERSION` to force every phone to drop its cache.

**Telegram reminders.** `.github/workflows/telegram-reminders.yml` runs `scripts/telegram-remind.js` several times each IST morning and sends at most once a day. It reads `deadlines.json`, which must be kept in step with dated `BOOKINGS` entries in `index.html`.

## Conventions and constraints

- Match the existing ES5 style (`var`, `function`, no arrow functions or modules in browser code); keep it dependency-free.
- Colours are CSS variables on `:root`, defined three times: light, `@media (prefers-color-scheme: dark)` under `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`. New tokens go in all three. The scenario chart uses validated categorical tokens `--s0`…`--s4`.
- Layout is phone-first, `max-width: 600px`, no horizontal page scroll; the tab bar is a fixed 7-column grid.
- `.tip > b:first-child` is the tip's heading; use `<strong>` for inline emphasis inside tips.
- Elements toggled with the `hidden` attribute rely on the global `[hidden]{display:none!important}` rule (flex containers like `.addrow` would otherwise ignore it).
- **Never put personal files in this folder.** Vercel serves every file at a public, guessable URL. `.gitignore`/`.vercelignore` exclude images and PDFs except the two icons.
- Facts in the Bakugai and Customs content come from sources (National Tax Agency Q&A on the refund method, Baggage Rules 2026 / Notification 14/2026-Customs, Notification 26/2016 as amended, Notification 07/2025 for the surcharge exemption). Links must be verified official pages or `null` with `link_verified: false`, never guessed, and tests enforce that `link_verified` matches `link !== null`. The tax refund is claimed at **Haneda** (the airport they leave Japan from), not KIX, and every tax-free item must be in hand at that kiosk (checked bags go through from KIX).
