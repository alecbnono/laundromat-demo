# Laundry Dashboard

Pickup requests, orders and cash for small laundry shops, in one place. One app serves many
shops; each shop has its own customer form, its own logins and its own data.

**What it must do is defined in [`BUSINESS-REQUIREMENTS.md`](BUSINESS-REQUIREMENTS.md).**
The IDs below (A1 to D3) refer to it.

## What is built

| Area | What works |
| --- | --- |
| A. Pickup form | A public form per shop at `/s/<shop>` (A1 to A4), spam trap (A6), confirmation page |
| B. Orders | List newest first, refreshed every 30 seconds (A5, B1); six statuses, one tap to move on (B2, B3); filter by status, search by name, phone or order number (B4); add an order by hand (B5); edit details and see status history (B6); "ready" message to copy (B7) |
| C. Money | Price per kilo per service, total = kilos x rate unless typed over (C1); payments with amount, method and who collected (C2); Unpaid / Partial / Paid with balance (C3); daily summary for any date (C4); unpaid list (C5); staff see only their own collections (C6) |
| D. Shops and access | Every record belongs to one shop (D1); owner and staff logins, owner adds and removes staff (D2); shops are created with a command, not by editing code (D3) |

Not built, on purpose (out of scope for v1): Messenger automation, SMS sending, online
payment, receipts, password reset by email. "Send SMS" only opens the phone's own texting
app with the message filled in; **the app sends nothing itself**, so "Customer told" is
ticked by hand.

## Stack

| Part | Tool |
| --- | --- |
| Framework, language | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Radix). Colours in `app/globals.css`; components in `components/ui/` |
| Database | Drizzle ORM over SQLite/libSQL |
| Logins | BetterAuth (email and password) |
| Data fetching | TanStack Query |
| UI state | Zustand |
| Forms | React Hook Form + Zod (same rules checked in the browser and on the server) |
| Animation, icons | Framer Motion, Lucide |
| Tests | Vitest (unit), Cypress (end to end) |

The shadcn/ui components are copied into `components/ui/` and are ours to edit. They differ
from stock shadcn in a few places: buttons, inputs and selects are 48px tall for thumbs on a
phone, badges and alerts have `success` / `warning` colours, and the font is the system font
(nothing is downloaded). Add more with `npx shadcn@latest add <name>`; if you re-add one of
the existing components, check the diff so those changes are not lost.

## Run it

```bash
npm install
cp .env.example .env.local   # set BETTER_AUTH_SECRET
npm run seed                 # the sample shop: prices, orders, an owner and a staff login
npm run dev                  # http://localhost:3000
```

Needs Node 22.13 or newer.

| Page | Who | What |
| --- | --- | --- |
| `/s/<shop>` | Customer | That shop's pickup request form |
| `/order/<token>` | Customer | Confirmation page (private link) |
| `/owner/login` | Owner, staff | Log in |
| `/owner` | Owner, staff | Order list |
| `/owner/summary` | Owner, staff | Daily summary (staff: their own collections) |
| `/owner/settings` | Owner | Form link, services and prices, team |
| `/demo` | Anyone | The demo (see below) |
| `/` | Anyone | With one shop, goes to its form; with several, names none of them |

Sample logins after `npm run seed`: `owner@example.com` and `staff@example.com`, both with
password `laundry1234`. The sample form is at `/s/sampaloc-laundry-house`.

To show it on a phone: run `npm run dev`, connect the phone to the same Wi-Fi, and open
`http://<your-computer-ip>:3000`.

## Demo (`/demo`)

One page with the customer form and the owner's screens, for showing the app to a shop. No
login. It starts from the samples in `lib/sample-data.ts` and keeps everything in the
browser's memory: nothing is sent to the server or written to the database, and refreshing
the page (or pressing Reset) starts over. A banner says so.

**It works with the phone's data off after the first load.** When built for production
(`npm run build && npm start`) it also survives a refresh offline, from a copy kept on the
phone (`public/demo-sw.js`). In `npm run dev` it needs the connection.

The demo uses the same screens as the real app; only the source of the data is swapped
(`lib/backend.tsx` chooses between the API and `lib/demo/store.ts`).

## Setting up a shop

```bash
npm run create-shop
```

It asks for the shop's name, link name, mobile number, hours, logo file, services with their
price per kilo, pickup times, and the owner's name, email and password. Nothing in the code
changes. The owner then adds staff in Settings.

`npm run create-user` makes another login for a shop, or resets a forgotten password (give
the same email again). There is no sign-up page.

Production also needs `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (see `.env.example`).

## Data

One SQLite file at `data/laundry.db`. Back up that file to back up everything.
`npm run seed -- --reset` deletes the sample shop's orders and reloads the samples; other
shops are never touched.

Tables are defined in `lib/db/schema.ts`: shops, services, customers, orders, order events
(status history), payments, and the login tables. After changing it, run
`npm run db:generate`; the new migration in `drizzle/` is applied automatically the next
time the app starts. `npm run db:studio` opens a table browser.

The 2nd iteration replaced the 1st iteration's tables outright (there was no real data). A
database file from before it will not open; move it away and seed again.

Hosting needs either a server with a disk that persists (a small VPS, Railway/Fly volume)
or a hosted libSQL database (e.g. Turso) via `DATABASE_URL` and `DATABASE_AUTH_TOKEN`,
which also works on serverless hosts such as Vercel.

## Tests

```bash
npm test             # unit tests: money, summary, form rules, queries, shop separation, demo
npm run test:e2e     # browser tests: the real journeys, then the demo with the network off
npm run typecheck
```

`test:e2e` starts its own copy of the app on ports 3100 and 3101 with a throwaway database,
so it never touches real orders. It also makes a production build for the offline test.
Stop `npm run dev` first. It needs Chrome installed, and the first time,
`npx cypress install` to download Cypress's test runner.

## Code map

- `lib/types.ts` the six records · `lib/validation.ts` form rules
- `lib/money.ts` totals and balances · `lib/summary.ts` daily summary, unpaid list, search
- `lib/format.ts` phone/peso/date helpers and the ready message text
- `lib/db/` schema, connection, queries (`orders`, `shops`, `team`) · `drizzle/` migrations
- `lib/auth.ts` login setup · `lib/session.ts` who is logged in and which shop is theirs
- `lib/backend.tsx` real API or demo memory · `lib/demo/store.ts` the demo's in-memory shop
- `lib/sample-data.ts` the sample shop, used by the seed script and the demo
- `lib/api.ts` browser calls to the API · `lib/owner-store.ts` owner screen UI state
- `app/api/` orders, payments, services, team, login endpoints
- `app/s/[slug]/` a shop's form · `app/owner/` the owner/staff screens · `app/demo/` the demo
- `components/` pickup form, confirmation page · `components/owner/` orders, summary, settings
- `components/ui/` shadcn/ui components · `components.json` shadcn settings
- `scripts/` seed, create-shop, create-user, e2e runner · `cypress/` browser tests
