# Laundry shop app (MVP)

Pickup request form for customers, order list for the owner, and a "ready" message
the owner can copy or send by SMS.

## Stack

| Part | Tool |
| --- | --- |
| Framework, language | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS (colours in `app/globals.css`; small shared pieces in `components/ui.tsx`) |
| Database | Drizzle ORM over SQLite/libSQL |
| Owner login | BetterAuth (email and password) |
| Data fetching | TanStack Query (order list, all saves) |
| UI state | Zustand (open tab, confirmation toast) |
| Forms | React Hook Form + Zod (same rules checked in the browser and on the server) |
| Animation, icons | Framer Motion, React Icons |
| Tests | Vitest (unit), Cypress (end to end) |

shadcn/ui is not installed. The app has about six shared UI pieces, so they are plain
Tailwind components in one file; add shadcn later if the UI grows.

## Run it

```bash
npm install
cp .env.example .env.local   # set BETTER_AUTH_SECRET
npm run seed                 # sample orders + a demo owner login
npm run dev                  # http://localhost:3000
```

Needs Node 22.13 or newer.

| Page | Who | What |
| --- | --- | --- |
| `/` | Customer | Pickup request form |
| `/order/<token>` | Customer | Confirmation and order status (private link) |
| `/owner` | Owner | Order list: status, kilos, amount, paid, ready message |
| `/owner/login` | Owner | Email and password login |
| `/demo`, `/demo/owner` | Anyone | Demo of both screens with sample orders (see below) |

Demo login after `npm run seed`: `owner@example.com` / `laundry1234` (never created in
production).

To show it on a phone: run `npm run dev`, connect the phone to the same Wi-Fi, and open
`http://<your-computer-ip>:3000`.

## Demo (`/demo`)

A copy of the customer form and the owner's order list for showing the app to a shop.
No login. It starts from the sample orders in `lib/sample-orders.ts` and keeps everything
in the browser's memory: nothing is sent to the server or written to the database, and
refreshing the page (or pressing Reset) starts over. A banner on every demo page says so.

The demo uses the same screens as the real app; only the source of the orders is swapped
(`lib/backend.tsx` chooses between the API and `lib/demo/store.ts`).

## Setting up for a shop

1. Edit `lib/shop.ts` (name, phone, hours, services, prices, pickup times) and replace
   `public/logo.svg`. Everything in there now is sample data.
2. Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (see `.env.example`).
3. Create the owner's login: `npm run create-owner`. It asks for an email and password.
   Run it again with the same email to reset a forgotten password.

There is no sign-up page; logins are only made with that command. Every login is an owner.

## What is real and what is not

- **Real:** the form, the order list, statuses, payment tracking, the customer status page,
  owner login.
- **Copy message:** copies the text; the owner pastes it into Messenger, Viber, etc.
- **Send SMS:** opens the owner's own texting app with the customer's number and the
  message filled in. The owner presses send; it uses their normal load/plan.
  **The app does not send any SMS itself** (no SMS provider is connected), so
  "Customer told" is something the owner ticks by hand.
- **Not built:** Messenger automation, online payment, automatic SMS, password reset by
  email (no email provider is connected; use `npm run create-owner`).

## Data

One SQLite file at `data/laundry.db`. Back up that file to back up everything.
`npm run seed -- --reset` deletes all orders and reloads the samples.

Tables are defined in `lib/db/schema.ts`. After changing it, run `npm run db:generate`;
the new migration in `drizzle/` is applied automatically the next time the app starts.
`npm run db:studio` opens a table browser.

Hosting needs either a server with a disk that persists (a small VPS, Railway/Fly volume)
or a hosted libSQL database (e.g. Turso) via `DATABASE_URL` and `DATABASE_AUTH_TOKEN`,
which also works on serverless hosts such as Vercel.

## Tests

```bash
npm test             # unit tests: phone/peso/date helpers, form rules, order queries
npm run test:e2e     # browser test: request -> owner marks ready -> customer page
npm run typecheck
```

`test:e2e` starts its own copy of the app on port 3100 with a throwaway database, so it
never touches real orders. Stop `npm run dev` first. It needs Chrome installed, and the
first time, `npx cypress install` to download Cypress's test runner.

## Code map

- `lib/shop.ts` shop settings · `lib/types.ts` data model · `lib/validation.ts` form rules
- `lib/format.ts` phone/peso/date helpers and the ready message text
- `lib/db/` schema, connection, order queries · `drizzle/` migrations
- `lib/auth.ts` login setup · `lib/session.ts` "is this the owner?" check
- `lib/backend.tsx` real API or demo memory · `lib/demo/store.ts` the demo's in-memory orders
- `lib/api.ts` browser calls to the API · `lib/owner-store.ts` owner screen UI state
- `app/api/orders/` create, list, update orders · `app/api/auth/` login endpoints
- `app/demo/` demo pages · `components/DemoShell.tsx` demo banner and view switch
- `components/` pickup form, login form · `components/owner/` order list, card, ready message
- `scripts/` seed, create-owner, e2e runner · `cypress/e2e/` browser tests
