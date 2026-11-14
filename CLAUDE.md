# Laundry Dashboard (Manila): project context

## Source of truth

**`BUSINESS-REQUIREMENTS.md` is the source of truth for what v1 is.** Read it before
planning or building. If this file, the README or the code disagrees with it, the
requirements document wins; say so and fix the other one. Requirement IDs (A1 to D3) are
used in code comments, tests and commit messages.

We are on the **2nd iteration**: bringing the app in line with that document. The 1st
iteration built a single-shop pickup form, order list and "ready" message.

## What v1 is (summary of the requirements)

A mobile-first sales demo that shows a Manila laundry owner their pickups, orders and cash in
one place. Built for owners and staff first; customers only fill in a pickup form.

- **A. Pickup request form** (public, per shop, no account).
- **B. Order list and status** for owner and staff: six statuses, filter and search, add an
  order by hand, edit details, status history, "ready" message to copy.
- **C. Payments and daily summary:** price per kilo, payments with amount, method and who
  collected, Unpaid / Partial / Paid with balance, daily summary, unpaid list, staff's own
  collections.
- **D. Shop setup and access:** one app for many shops, owner and staff logins, shops created
  without editing code.

Non-functional: usable one-handed on a 360 px Android phone, the demo walkthrough works with
data off after the first load, every record belongs to one shop, Asia/Manila time, pesos,
simple English, store only name, mobile number and address.

**Out of scope for v1** (do not build without asking): Messenger automation, SMS sending,
online payments and GCash integration, receipts and printing, machine/inventory/payroll,
route planning, subscription billing, native apps, real offline sync, a customer order
tracking page or QR code.

## Decisions made while building (not in the requirements)

- **Stack:** Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, SQLite/libSQL through
  Drizzle, BetterAuth. See the README for the full table and the code map.
- **Login method:** email and password for now. The requirements leave "phone number with
  PIN, or email?" open; revisit after the owner conversations.
- **Confirmation screen:** `/order/<token>` is the A4 confirmation screen. It also shows the
  order's status, which goes slightly past the "no tracking page" line; it was built in the
  1st iteration and is kept because it costs nothing. Do not extend it.
- **The public form shows no existing orders** ("safe to lose a phone").
- **"Send SMS" button** only opens the phone's own texting app. The app sends nothing.
- **Demo (`/demo`)** is one page that keeps everything in the browser's memory, so it works
  offline after the first load. It must stay labelled as sample data.

## Demo rules

- Mobile-first; shown on a phone.
- Realistic sample data, the shop's name and logo.
- Do not fake integrations. Anything not really built is labelled as such.

## Why this niche

- Shops take pickup/delivery requests over text/Messenger and track orders by hand.
- Several have no website (Facebook page only).
- One demo can be reused for every shop.
- Competitors (LaundromatAI, LaundryVerse, LaundryPOS, SpinScale) are self-serve counter/POS
  tools, don't mention Messenger, and charge monthly. Our angle: we do the setup, intake fits
  how shops already get orders.

## Notifications: constraints (for later; out of scope in v1)

- Messenger replies are limited to a 24-hour window; laundry often takes longer.
- Reportedly Meta retired order-update message tags in April 2026 (unconfirmed on Meta's
  page). Verify before relying on it.
- A multi-client Messenger app probably needs Meta App Review and business verification
  (inference, not confirmed).
- SMS provider and per-message cost in the Philippines: still to research.

## Business assumptions (untested)

- Pricing: one-time PHP 5,000 to 15,000 plus PHP 500 to 1,000/mo upkeep. Low end for the
  first 2 to 3 clients in exchange for testimonials.
- Payment terms: 50% upfront, GCash or bank transfer.
- Validate with 3 owner conversations before building anything large. The requirements
  document lists the assumptions to test and the open questions to ask.

## First targets (Sampaloc, Manila)

- Extremadura Laundry House: no website, pickup/delivery by text.
- Quicklaba Manila: no website, clerk phones the owner to price a load.
- Silayan Laundry Service: Facebook page only, owners do pickups themselves.

## Related engine (future niches)

Same code can later serve water refilling stations (add container tracking) and other
order/delivery or job-queue businesses. Keep the data model generic: shop, user, service,
customer, order, payment. See `docs/niche-exploration.md`.

## Working notes

- Keep it simple; the owner is not technical.
- Ask before adding dependencies or paid services.
- After changing `lib/db/schema.ts`, run `npm run db:generate`.
- Before calling work done: `npm run typecheck`, `npm test`, `npm run test:e2e`.
