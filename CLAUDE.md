# Laundry shop app (Manila): project context

## What we're building
A small, done-for-you tool for owner-run laundry shops in Manila (starting in Sampaloc). Services first, productize later.

v1 scope:
- Pickup request form (customer intake)
- Order list (owner sees and updates orders)
- "Ready" notification: copy-paste message button, plus SMS using the phone number from the form

Out of scope for v1: Messenger automation (add only if a client asks), payroll, machine management, full POS.

## Why this niche
- Shops take pickup/delivery requests over text/Messenger and track orders by hand.
- Several have no website (Facebook page only).
- One demo can be reused for every shop.
- Competitors (LaundromatAI, LaundryVerse, LaundryPOS, SpinScale) are self-serve counter/POS tools, don't mention Messenger, and charge monthly. Our angle: we do the setup, intake fits how shops already get orders.

## Demo rules
- Mobile-first, frontend-only HTML page, shown on a phone.
- Realistic sample data, the shop's name and logo.
- Must work offline.
- Do not fake integrations. Anything not really built is labeled as such.

## Notifications: constraints
- Messenger replies are limited to a 24-hour window; laundry often takes longer.
- Reportedly Meta retired order-update message tags in April 2026 (unconfirmed on Meta's page). Verify before relying on it.
- A multi-client Messenger app probably needs Meta App Review and business verification (inference, not confirmed).
- SMS provider and per-message cost in the Philippines: still to research.

## Business assumptions (untested)
- Pricing: one-time PHP 5,000 to 15,000 plus PHP 500 to 1,000/mo upkeep. Low end for the first 2 to 3 clients in exchange for testimonials.
- Payment terms: 50% upfront, GCash or bank transfer.
- Validate with 3 owner conversations before building anything large.

## First targets (Sampaloc, Manila)
- Extremadura Laundry House: no website, pickup/delivery by text.
- Quicklaba Manila: no website, clerk phones the owner to price a load.
- Silayan Laundry Service: Facebook page only, owners do pickups themselves.

## Related engine (future niches)
Same code can later serve water refilling stations (add container tracking) and other order/delivery or job-queue businesses. Keep the data model generic: customer, order, status, pickup/delivery, payment. See `docs/niche-exploration.md`.

## Working notes
- Keep it simple; the owner is not technical.
- Prefer plain HTML/CSS/JS for the demo; no build step.
- Ask before adding dependencies or paid services.
