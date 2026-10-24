# Japan 2026

Trip utility for Arnav, Ayush and Manan. 24 Nov – 6 Dec 2026.

Static site, no build step, no dependencies, no backend. Shared trip data —
the Buy shopping lists, Split-the-bill expenses, booking deadlines, checklists,
and the Fuji day swap — automatically sync across Arnav, Ayush, and Manan's phones
through a shared cloud JSON record (JSONBin). Personal passport scans remain strictly
private on each phone's local IndexedDB.

## The seven tabs

| Tab | What's in it |
|---|---|
| **今 Now** | Countdown or day number, today's plan, today's weather, the Fuji go/no-go card, the next thing to book, and the before-you-leave-the-room list |
| **程 Days** | All 13 days. Tap one for the plan, map links for each stop, the thing you can't afford to miss that day, and the host's number |
| **¥ Money** | Converter on a live rate, what you've spent and how fast, and the bill splitter |
| **要 To do** | Bookings sorted by deadline, documents, packing |
| **買 Buy** | Shared shopping lists for Arnav, Ayush and Manan (synced via JSONBin), what to buy before you fly, early in Japan, and to take home |
| **爆 Bakugai** | The shopping-spree tab: watch guide, other buys, India customs, duty calculator, spending scenarios |
| **報 Info** | Emergency numbers, your passport copies, flights, passes, phrases you can hold up, addresses in Japanese for a taxi driver |

## Passport copies

The Info tab has **Your documents**. Each of you photographs your own passport
page, visa and insurance certificate on your own phone, and they are stored in
that browser's IndexedDB — shrunk to 1600px, never uploaded, never shared with
the other two, and they open with no signal. That last part is the whole point:
a passport copy you can't reach without a connection is no use at immigration.

It is deliberately **not** a folder of JPEGs in this repo. Anything sitting next
to `index.html` is served at a public, guessable URL the moment this deploys —
a passport scan is the one file that must never be there. The in-app version
gives you the same thing at the same speed with none of that.

It is also not a backup. Clearing browser data or deleting the site from the
home screen deletes them. Keep the originals in your photos or a password
manager too.

## Before you deploy anything

Vercel serves **every file in this folder** at a public URL, and those URLs are
guessable. There are passport scans in here. `.vercelignore` and `.gitignore`
now keep `.jpg`, `.jpeg`, `.pdf` and `.heic` out of both the deploy and the
repo, with the two icons explicitly allowed back in.

If you deployed this folder before those files existed, you're fine. If you
deployed it after, treat those scans as public: check the deployment's file
list, delete the deployment, and redeploy from a clean folder.

Keep passport scans in your phone's photos or a password manager, not next to a
website.

## Booking reminders (Telegram)

A GitHub Action tries several times each morning (**~08:00–11:00 IST**) and
posts to your trip Telegram group when something in `deadlines.json` is
overdue (last 3 days), due within 48 hours, or due this week. It sends **at
most once per IST day**. A single daily cron on GitHub often never runs — that’s
why there are multiple slots. Check **Actions** if a morning is quiet; use
**Run workflow** to test. Keep `deadlines.json` in sync when you change dated
rows in `BOOKINGS` inside `index.html`.

### One-time setup

1. In Telegram, message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the **bot token**.
2. Create a group (or use the existing trip chat). Add the bot. Send any message in the group.
3. Open  
   `https://api.telegram.org/bot<TOKEN>/getUpdates`  
   in a browser. Find `"chat":{"id":` — for a group it’s usually a **negative** number. That’s the **chat id**.
4. In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `TELEGRAM_BOT_TOKEN` — the bot token  
   - `TELEGRAM_CHAT_ID` — the chat id  
5. **Actions → Telegram booking reminders → Run workflow** (force = true) to test.

Only people with access to the GitHub secrets / bot token can change where it posts. The site itself never sees the token.

## Deploy to Vercel

**Easiest: drag and drop.** Go to [vercel.com/new](https://vercel.com/new), drop
this whole folder onto the page. Done, usually in under a minute.

**Or from the terminal:**

```bash
npm i -g vercel
cd japan-2026-utility
vercel          # preview URL
vercel --prod   # live URL
```

Accept every default. When it asks about a build command or output directory,
leave both blank — this is plain HTML and Vercel serves it as-is.

**Or from GitHub**, if you want to edit it later without redeploying by hand:
push this folder to a repo, then Vercel → Add New → Project → import it. Every
push to `main` redeploys automatically.

## After deploying

Send the URL to Ayush and Manan and tell them to add it to their home screen —
Share → Add to Home Screen on iOS, or the install prompt on Android. It then
opens full-screen like an app, which matters when you're checking a host's
phone number one-handed on a platform.

**Tell them to open it once on wifi before they fly.** That's what saves it to
the phone.

## Works with no signal

`sw.js` is a service worker that keeps the page, the icons and the fonts on the
phone after the first visit. Aeroplane mode, a dead eSIM, a basement izakaya —
the itinerary, the addresses, the booking refs and the emergency numbers are
all still there.

It's network-first for the page itself, so a redeploy lands the next time the
phone has a connection, and cache-first for everything else. The rate and
weather requests are never cached; they keep their own saved values and say how
old they are. The Info tab says whether the save worked.

Bump `VERSION` in `sw.js` if you ever need to force every phone to drop its
cache and take a fresh copy.

## Things to buy

Three lists, in the order you'll need them:

- **Before you fly** — shoes you've broken in, adapters (Japan's sockets are flat two-pin; your round-pin plugs will not fit), a suitcase, a luggage scale, a power bank. Priced in rupees.
- **Get these early** — the konbini and Don Quijote run on the first night. Heattech, heat pads for the Fuji day, a coin purse. Priced in yen.
- **Taking things home** — where to buy it cheaper than the airport.

The curated lists are tick-only. At the top of Buy, each of you has a shared
list (Arnav / Ayush / Manan) kept in one JSONBin record — any of you can add,
tick or delete, and it syncs when there's a connection. Ticked items count as
spent on that person's running tab.

## Sync, and not losing anything

Everything you add — expenses, the budget, the three shopping lists, every
checklist and booking, the Fuji swap, and each person's Bakugai cart — is
saved on the phone first and then merged into one shared JSONBin record.

Every save is **pull → merge → push** (`sync.js`), so two of you editing at
once never wipes the other's changes:

- each item has an id and the time it last changed; the newer edit wins;
- deleting leaves a tombstone (kept 90 days), so an item missing from the
  cloud is never taken to mean "deleted" — a save that got overwritten just
  comes back on the next sync;
- what's waiting to go up is remembered on the phone, so an edit made with no
  signal survives closing the app and syncs when you're back online (it
  retries on its own, and again the moment the phone reconnects).

The pill under the dates shows the state — *Synced 14:32*, *Saving…*, or
*Not synced · retrying*. Tap it to sync now.

Not synced, on purpose: passport copies (private to each phone, see above),
and per-phone settings like theme, filters and your own exchange rate.

Tests: `node --test` runs `tests/sync.test.js` — concurrent adds, deletes vs
edits, overwritten saves, offline restarts, the first run after updating.

## Things to change

Everything else lives in `index.html`. The data is near the top of the
`<script>` block, in plain arrays you can edit without touching any logic:

| What | Where |
|---|---|
| Hosts, addresses in English and Japanese, booking refs | `var STAY` |
| The 13 days, their plans, map pins and last-train notes | `var DAYS` |
| Booking deadlines | `var BOOKINGS` in `index.html`, and dated copies in `deadlines.json` for Telegram |
| Packing and documents | `var PACK`, `var DOCS` |
| Things to buy | `var BEFORE`, `var NEED`, `var GIFTS` |
| Phrases | `var PHRASES` |
| Rate sources, in order | `var FX_SOURCES` |
| Watches, other buys, customs rules, scenarios, links | `bakugai.js` (`CONFIG` at the top) |

Colours and type are CSS variables in `:root`, defined once for light and again
for dark.

## 爆 Bakugai — the shopping-spree tab

爆買い (*bakugai*, "explosive buying") is the seventh tab. Five sub-tabs:

| Sub-tab | What's in it |
|---|---|
| **Watches** | About 60 watches up to ₹50,000 in ₹5,000 bands, Japan cost after the refund next to the India price, filters, a shelf-price checker, Japan-only lines, a few above budget |
| **Buys** | 16 category tabs (knives, Muji, shoes, Uniqlo, skincare, stationery, cameras, audio, whisky, MacBook, iPhone, Switch 2, snacks, anime, 100-yen, pre-owned), each with specific products: Japan cost after the refund, India price, saving, a tip and an official link. An All view compares the categories against the break-even |
| **Customs** | The break-even rule, the Haneda tax-refund steps, India's Baggage Rules 2026, penalties, cash limits, sources |
| **Calculator** | A cart (fed by **+ Cart** on watches and buys, or typed in) or a quick total, the duty rate, landed cost and the India comparison |
| **Scenarios** | ₹50k to ₹2.5L, with and without a laptop, as a chart and a table |

Everything lives in `bakugai.js`: one `CONFIG`, the data (`WATCHES`, `SHOP_ITEMS`, `SHOP_PRODUCTS`), and the maths. No
rupee figure is stored — they're worked out from yen at the live rate from the
Money tab (no card markup; your cards are zero-forex). Change a rate in
`CONFIG` and every screen follows.

The rules it uses, and where they come from:

- **Tax refund** — the tag includes 10% tax, so the refund is tag ÷ 1.1, only
  when the price before tax is ¥5,000 or more at one shop. It's claimed at
  **Haneda**, the airport you leave Japan from (National Tax Agency Q&A, Q32).
- **₹75,000 allowance** per person, not poolable — Baggage Rules 2026.
- **One laptop** per adult on top of it — Rule 5 proviso. Only the first laptop
  in the cart is exempt.
- **35% duty** on the excess — Notification 26/2016, as amended in 2026. No
  surcharge on baggage since Notification 07/2025. The 10% and 38.5% options
  are for comparison only.
- **Break-even** — past the allowance, Japan only wins if the saving beats
  duty ÷ (1 + duty), about 25.9% at 35%.

The cart is kept on each phone, not synced, because the allowance is per
person. A link only appears if it was checked; otherwise it's `null`. `sw.js`
fetches `bakugai.js` network-first, so edits land without bumping `VERSION`.

Tests for all the maths, the data, and a check that no function in `index.html` is declared twice: `node --test` (Node 18+,
nothing to install).

## The exchange rate

Fetched automatically on load, and again whenever you open the Money tab if the
saved rate is more than six hours old. It tries four free no-key sources in
turn — ECB via Frankfurter, then ExchangeRate-API, then two mirrors of Currency
API — and takes the first that answers with a sane number.

When you have no signal it keeps the last rate it got and says how old it is,
rather than silently showing something wrong. Type your own rate into the field
and it stops auto-updating until you tap "Use the live rate".

The number shown is the mid-market rate. A forex card or ATM will give you a
couple of percent less, which the Money tab says out loud.

## The weather and the Fuji day

Open-Meteo, free and no key, cached for three hours. The Now tab shows today's
forecast for wherever you are, and a card for the Fuji day that reads the
morning cloud cover and the rain chance and says **Go**, **Probably fine** or
**Swap it**.

The forecast only reaches about 16 days out, so until mid-November that card
says so instead of guessing.

**Swap** exchanges the Fuji day and the Kamakura day everywhere in the app and
remembers it. It only moves them in here — reserved seats still have to be
changed with the railway, which the card reminds you about.

## Booking deadlines

`var BOOKINGS` entries carry a `when` in IST. The list sorts itself by
deadline, shows how long is left, marks anything inside a week, sinks what
you've ticked, and says on the Now tab if a deadline has gone past unticked.

**Alarm** on any dated row downloads a `.ics` with two reminders, 30 and 5
minutes before. Open it and it drops into the phone's own calendar, which will
actually wake you — the web page can't.

## Money between the three of you

Expenses and the budget automatically sync across all three phones through the cloud JSON record whenever you are online. Whenever someone logs or removes an expense, it updates for everyone.

You also have:
- **Refresh from cloud** to pull fresh additions from the others on demand.

- **Copy summary** puts a plain-text who-owes-what on the clipboard for the group chat.
- **Send to the others** uses the phone's share sheet where there is one.
- **Export / import** gives you a code. Whoever pastes it in gets the same list — it replaces theirs, and asks first.

**Spending** shows what the three of you spent today, the trip total, the daily
average and how many days are left. Set a per-person daily budget and it tells
you how much room is left today.

## Showing things to people

Tap any phrase in Info to fill the screen with it, big enough to hold up in a
shop. Each accommodation has its address in Japanese with a **Show a driver**
button — taxi drivers don't read romaji.

The Kyoto and Osaka addresses are only as precise as Airbnb makes them public.
The postcode gets a driver to the block; screenshot the host's message with the
door number before you fly.

## One caveat

Fares, opening hours and booking windows were correct in September 2026 but
move around. Check anything you're about to pay for against the official site.

Tax-free shopping is the one to watch: from 1 November 2026 Japan uses a
refund-at-departure system, not tax off at the till. This trip is entirely under
the new rules. The Buy tab and the 6 Dec day note say what to do; refunds for
you happen at Haneda (final international departure), not at KIX.
