# Japan 2026

Trip utility for Arnav, Ayush and Manan. 24 Nov – 6 Dec 2026.

Static site, no build step, no dependencies, no backend. Everything each person
ticks or types stays in their own browser's local storage — nothing is shared
between the three of you and nothing leaves the phone.

## Deploy to Vercel

**Easiest: drag and drop.** Go to [vercel.com/new](https://vercel.com/new), drop
this whole folder onto the page. Done, usually in under a minute.

**Or from the terminal:**

```bash
npm i -g vercel
cd japan-trip-site
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

## Things to change

Everything lives in `index.html`. The data is near the top of the `<script>`
block, in plain arrays you can edit without touching any logic:

| What | Where |
|---|---|
| Hosts, addresses, booking refs | `var STAY` |
| The 13 days and their plans | `var DAYS` |
| Booking deadlines | `var BOOKINGS` |
| Packing and documents | `var PACK`, `var DOCS` |
| Rate sources, in order | `var FX_SOURCES` |

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

Colours and type are CSS variables in `:root`.

## One caveat

Fares, opening hours and booking windows were correct in September 2026 but
move around. Check anything you're about to pay for against the official site.
