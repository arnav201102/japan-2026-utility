# Japan 2026

Trip utility for Arnav, Ayush and Manan. 24 Nov – 6 Dec 2026.

Static site, no build step, no dependencies, no backend. Everything each person
ticks or types stays in their own browser's local storage — nothing is shared
between the three of you and nothing leaves the phone, except the two requests
that fetch the exchange rate and the weather.

## The six tabs

| Tab | What's in it |
|---|---|
| **今 Now** | Countdown or day number, today's plan, today's weather, the Fuji go/no-go card, the next thing to book, and the before-you-leave-the-room list |
| **程 Days** | All 13 days. Tap one for the plan, map links for each stop, the thing you can't afford to miss that day, and the host's number |
| **¥ Money** | Converter on a live rate, what you've spent and how fast, and the bill splitter |
| **要 To do** | Bookings sorted by deadline, documents, packing |
| **買 Buy** | What to buy here before you fly, your shopping list with a running tab, what to buy in Japan, and what to take home |
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

The curated lists are tick-only. The running tab at the top of the Buy tab is
your own list, in yen, and only counts what you have ticked as bought.

## Things to change

Everything else lives in `index.html`. The data is near the top of the
`<script>` block, in plain arrays you can edit without touching any logic:

| What | Where |
|---|---|
| Hosts, addresses in English and Japanese, booking refs | `var STAY` |
| The 13 days, their plans, map pins and last-train notes | `var DAYS` |
| Booking deadlines | `var BOOKINGS` |
| Packing and documents | `var PACK`, `var DOCS` |
| Things to buy | `var BEFORE`, `var NEED`, `var GIFTS` |
| Phrases | `var PHRASES` |
| Rate sources, in order | `var FX_SOURCES` |

Colours and type are CSS variables in `:root`, defined once for light and again
for dark.

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

The splitter assumes all three of you won't enter the same data, because you
won't. So:

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

Tax-free shopping is the one to watch: Japan has been moving from tax deducted
at the till to a refund collected at the airport, possibly from November 2026.
Ask at the first big shop you walk into rather than trusting the Buy tab.
