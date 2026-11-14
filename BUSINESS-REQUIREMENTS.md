# Laundry Dashboard: Business Requirements v1

Oct 31, 2026 · @Alec

## Purpose and v1 goal

v1 is a mobile-first sales demo that shows a Manila laundry owner their pickups, orders and cash in one place, so we can learn within weeks whether owners will pay for it. It is built for shop owners and staff first; customers only fill in a pickup form.

**Problem.** Small shops take pickup and delivery requests over text and Messenger and track orders in notebooks. Orders get lost, "is it ready?" calls interrupt work, and cash collected by riders is hard to reconcile.

**v1 is done when:**

- A phone walkthrough of form, order list and daily summary runs in under 5 minutes using the shop's own name and realistic sample data.
- It works with the phone's data connection off after the first load (tested).
- We have held 3 owner conversations (Extremadura, Quicklaba, Silayan) and recorded what each said.
- At least 2 of the 3 shops agree to a pilot, free or discounted in exchange for a testimonial.

## Users and their jobs

The shop owner or staff member is the primary user; every v1 decision favors them over the customer.

| User | Who | Job to be done | Access |
| --- | --- | --- | --- |
| Owner | Runs the shop, sets prices, checks cash at day end | When the day ends, I want to see what came in, what is done, and what money is owed, so I can close the day without a notebook | Login |
| Staff / rider | Receives loads, does pickups and deliveries, collects cash | When I pick up or deliver a load, I want to update its status and record payment in a few taps on my phone | Login (same shop) |
| Customer | Household or small business near the shop | When I need laundry picked up, I want to send my details once without chatting back and forth | Public form link, no account |
| Us (setup) | Builds and configures each shop | Set up a new shop's name, logo, prices and logins in under 30 minutes | Admin access |

## Functional requirements

v1 has three must-have areas: the pickup request form, the order list with status, and payments with a daily summary. Priority is **Must** (demo fails without it) or **Should** (include if cheap).

### A. Pickup request form (customer-facing)

| ID | Requirement | Priority |
| --- | --- | --- |
| A1 | Each shop has its own public form link showing the shop's name and logo | Must |
| A2 | Fields: name, mobile number, address with landmark, service type, preferred pickup date and time slot, notes | Must |
| A3 | Mobile number accepts Philippine formats (09xx, +639xx) and is validated before submit | Must |
| A4 | Submitting creates an order with status "Requested" and shows the customer a confirmation screen | Must |
| A5 | A new request appears at the top of the owner's order list without a page reload | Should |
| A6 | Basic spam protection (hidden field or rate limit) | Should |

### B. Order list and status (owner and staff)

| ID | Requirement | Priority |
| --- | --- | --- |
| B1 | List of orders, newest first, showing customer name, address area, service, status, balance | Must |
| B2 | Statuses: Requested, Picked up, Washing, Ready, Delivered, Cancelled | Must |
| B3 | Change status in one or two taps from the list | Must |
| B4 | Filter by status; search by name or phone number | Must |
| B5 | Add an order by hand (for walk-ins and orders received over Messenger or text) | Must |
| B6 | Order detail: edit weight (kg), service, notes, address; see status history with time | Should |
| B7 | "Ready" message button: copies a prefilled message (customer name, shop name, amount due) to paste into Messenger or SMS | Should |

### C. Payments and daily summary

| ID | Requirement | Priority |
| --- | --- | --- |
| C1 | Shop sets a price per kilo for each service; order total is weight × rate and can be overridden | Must |
| C2 | Record a payment on an order: amount, method (cash, GCash, bank transfer), who collected it | Must |
| C3 | Order shows Unpaid, Partial or Paid and the remaining balance | Must |
| C4 | Daily summary for a chosen date: orders received, orders delivered, total billed, total collected by method, unpaid balance | Must |
| C5 | Unpaid list: orders delivered but not fully paid, oldest first | Should |
| C6 | Staff view shows only their collections for the day, so cash handover can be checked | Should |

### D. Shop setup and access

| ID | Requirement | Priority |
| --- | --- | --- |
| D1 | One app serves many shops; a user sees only their own shop's data | Must |
| D2 | Owner and staff log in; owner can add or remove staff | Must |
| D3 | We can create a shop with name, logo, services, rates and logins without editing code | Should |

> I left the ready notification as a Should because you did not pick it as a must-have. The copy-paste button (B7) is cheap and matches your plan; SMS is out of scope for v1.

## Data to store

Six records cover every v1 requirement; every record except Shop belongs to exactly one shop.

| Record | Key fields | Used by |
| --- | --- | --- |
| Shop | name, logo, contact number, address area | D1, D3, A1 |
| User | shop, name, role (owner or staff), login | D2, C6 |
| Service | shop, name, price per kilo, active | C1, A2 |
| Customer | shop, name, mobile number, address, landmark | A2, B4 |
| Order | shop, customer, service, weight, total, status, pickup slot, notes, created time, status history | A4, B1 to B6 |
| Payment | order, amount, method, collected by, time | C2 to C6 |

## Non-functional requirements

- **Mobile-first.** Every screen is usable one-handed on a 360 px wide Android phone in Chrome.
- **Fast on weak data.** First load under 3 seconds on 4G; later loads use cached assets.
- **Offline-tolerant for the demo.** The demo walkthrough works with data off after the first load. Real offline sync is not a v1 requirement.
- **Multi-shop from the start.** One codebase and database, with each shop's data isolated by shop.
- **Low running cost.** Target hosting cost for the first 3 shops stays within free or entry-level tiers (to confirm once the stack is chosen).
- **Local conventions.** Times in Asia/Manila, amounts in pesos, labels in simple English with room for Filipino wording.
- **Privacy.** Store only name, mobile number and address. The form states how the shop uses this data. Check Data Privacy Act duties before the first paid pilot.
- **Safe to lose a phone.** Logins required for owner and staff views; the customer form exposes no existing orders.

## Out of scope for v1

These are real needs we are deliberately leaving out so the demo ships fast.

- Customer-facing order tracking page or QR code
- Messenger automation and SMS sending (Meta window limits and SMS cost are still unresearched)
- Online payments, GCash integration, receipts and printing
- Machine, inventory, payroll and staff scheduling features
- Route planning for riders
- Billing us-to-shop (subscription invoices)
- Native mobile apps; v1 is a web app
- Real offline sync across devices

## Assumptions and open questions

The riskiest assumption is that owners want to manage orders in an app at all, rather than only receive requests. Test that first, before building beyond the demo.

| Assumption | Risk if wrong | How to test |
| --- | --- | --- |
| Owners want a dashboard, not just a form | High: the core pitch fails | Show the demo to the 3 shops and ask what they would stop doing in the notebook |
| Staff will update status on a phone during the day | High: list goes stale | Ask who updates orders today and how; watch one shop's flow |
| Shops price per kilo with a few service types | Medium: C1 needs redesign | Ask each shop for its price list |
| Owners will pay PHP 5,000 to 15,000 once plus PHP 500 to 1,000 a month | High: no business | Ask the price question in all 3 conversations, unprompted by a number first |
| Customers will use a form instead of texting | Medium: A-section unused | Share the form link with 5 regular customers in one shop |

### Open questions

- What do these shops use today (notebook, Messenger, Excel) and what do they pay for it?
- Login method: phone number with PIN, or email? Staff may not use email.
- Which stack and host fit the cost target? (Needed before the build tasks start.)
- Do riders collect cash on delivery, and how is it handed over at day end?
- Contract and payment terms for pilots (50% upfront, GCash or bank transfer) from your plan.

## First task breakdown

Each task is meant to fit in half a day or less and points to the requirement it delivers. Phase 0 can start today and needs no code.

### Phase 0: Validate (no code)

- [ ] Draft the Messenger and walk-in script for the 3 shops
- [ ] Hold the 3 owner conversations and record answers to the open questions
- [ ] Collect each shop's price list, statuses they use, and how riders handle cash

### Phase 1: Foundation

- [ ] Choose stack, host and login method (decision note, one page)
- [ ] Create the project, deploy an empty page to a live URL
- [ ] Define the six records from the data section (D1)
- [ ] Owner and staff login, with data limited to their shop (D1, D2)
- [ ] Seed script: create a shop with name, logo, services, rates and sample orders (D3)

### Phase 2: Pickup form

- [ ] Public form page per shop with name and logo (A1)
- [ ] Form fields and Philippine mobile validation (A2, A3)
- [ ] Save submission as a "Requested" order and show confirmation (A4)

### Phase 3: Order list

- [ ] Order list screen, newest first (B1)
- [ ] One-tap status change with the six statuses (B2, B3)
- [ ] Filter by status and search by name or phone (B4)
- [ ] Add order by hand (B5)
- [ ] Order detail with weight, notes and status history (B6)
- [ ] "Ready" message copy button (B7)

### Phase 4: Payments and daily summary

- [ ] Service rates setting and total calculation (C1)
- [ ] Record payment on an order (C2)
- [ ] Show Unpaid, Partial or Paid with balance (C3)
- [ ] Daily summary screen by date (C4)
- [ ] Unpaid list (C5)
- [ ] Per-staff collections view (C6)

### Phase 5: Demo polish

- [ ] Load each target shop's name, logo and realistic sample data
- [ ] Test on a real low-end Android phone, including data off after first load
- [ ] Write a 5-minute demo script and rehearse it
- [ ] Re-read these requirements after the 3 conversations and revise to v1.1

**Suggested next step:** do Phase 0 this week, then ask me to turn Phases 1 to 5 into a build plan with the stack decided.
