// The real app, on the database `npm run test:e2e` prepares: the sample shop with its owner
// and staff logins and sample orders, plus a second shop ("Other Laundry").
const FORM = "/s/sampaloc-laundry-house";
const OWNER = { email: "owner@example.com", password: "laundry1234" };
const STAFF = { email: "staff@example.com", password: "laundry1234" };
const OTHER_OWNER = { email: "other-owner@example.com", password: "other-password-123" };

function login(who: { email: string; password: string }) {
  cy.visit("/owner/login");
  cy.get('input[name="email"]').type(who.email);
  cy.get('input[name="password"]').type(who.password);
  cy.contains("button", "Open order list").click();
  cy.location("pathname", { timeout: 15000 }).should("eq", "/owner");
}

function logout() {
  cy.contains("button", "Log out").click();
  cy.location("pathname").should("eq", "/owner/login");
}

const card = (name: string) => cy.contains("article", name);
const screen = (label: string) => cy.contains('nav[aria-label="Screens"] a', label);

describe("customer form (A)", () => {
  it("shows the shop's own name on its own link (A1)", () => {
    cy.visit(FORM);
    cy.contains("h1", "Sampaloc Laundry House");
    cy.visit("/s/other-laundry");
    cy.contains("h1", "Other Laundry");
    cy.contains("label", "Wash and fold").should("contain", "₱40/kg");
    cy.request({ url: "/s/no-such-shop", failOnStatusCode: false }).its("status").should("eq", 404);
  });

  it("does not show or favour any shop at the bare address", () => {
    cy.visit("/");
    cy.contains("open the link your laundry shop gave you");
    cy.contains("Sampaloc").should("not.exist");
  });

  it("shows validation messages on an empty form (A3)", () => {
    cy.visit(FORM);
    cy.contains("button", "Request pickup").click();
    cy.contains("Please enter your name.");
    cy.contains("Enter a mobile number like 0917 123 4567.");
    cy.contains("Please enter your pickup address.");
    cy.contains("Please choose a pickup time.");
    cy.location("pathname").should("eq", FORM);
  });
});

describe("logins (D2)", () => {
  it("keeps the order list behind a login", () => {
    cy.visit("/owner");
    cy.location("pathname").should("eq", "/owner/login");
    cy.visit("/owner/summary");
    cy.location("pathname").should("eq", "/owner/login");
    cy.get('input[name="email"]').type(OWNER.email);
    cy.get('input[name="password"]').type("not-the-password");
    cy.contains("button", "Open order list").click();
    cy.contains("Wrong email or password.", { timeout: 15000 });
    cy.request({ url: "/api/orders", failOnStatusCode: false }).its("status").should("eq", 401);
  });

  it("lets the owner add and remove a staff login", () => {
    login(OWNER);
    screen("Settings").click();
    cy.get("#staff-name").type("New Rider");
    cy.get("#staff-email").type("new-rider@example.com");
    cy.get("#staff-password").type("rider-password-1");
    cy.contains("button", "Add staff").click();
    cy.get('[data-member="new-rider@example.com"]').should("contain", "New Rider");
    logout();

    // The new login works, and is staff: no Settings.
    login({ email: "new-rider@example.com", password: "rider-password-1" });
    cy.contains("New Rider · Staff");
    screen("Settings").should("not.exist");
    cy.visit("/owner/settings");
    cy.contains("Only the shop owner can change settings.");
    cy.request({
      method: "POST",
      url: "/api/services",
      body: { name: "Free laundry", pricePerKgCentavos: 0, active: true },
      failOnStatusCode: false,
    })
      .its("status")
      .should("eq", 403);
    logout();

    login(OWNER);
    screen("Settings").click();
    cy.get('[data-member="new-rider@example.com"]').contains("button", "Remove").click();
    cy.get('[data-member="new-rider@example.com"]').should("not.exist");
    logout();

    // The removed login no longer works.
    cy.location("pathname").should("eq", "/owner/login");
    cy.get('input[name="email"]').type("new-rider@example.com");
    cy.get('input[name="password"]').type("rider-password-1");
    cy.contains("button", "Open order list").click();
    cy.contains("Wrong email or password.");
  });
});

describe("pickup request to delivered and paid", () => {
  it("takes an order from the form to the daily summary", () => {
    // --- Customer (A2, A4)
    cy.visit(FORM);
    cy.get('input[name="name"]').type("Cypress Customer");
    cy.get('input[name="phone"]').type("0900 000 0777");
    cy.get('textarea[name="address"]').type("77 Test St, Sampaloc");
    cy.get('select[name="pickupWindow"]').select("1 to 3 PM");
    cy.contains("label", "I will collect it at the shop").click();
    cy.contains("button", "Request pickup").click();

    cy.location("pathname").should("match", /^\/order\/.+/);
    cy.contains("Request sent!");
    cy.get('[aria-current="step"]').should("have.text", "Request received");
    cy.location("pathname").as("statusPage", { type: "static" });

    // "Safe to lose a phone": the form shows no existing orders.
    cy.visit(FORM);
    cy.contains("Cypress Customer").should("not.exist");
    cy.contains("Order #").should("not.exist");

    // --- Staff: the new request is at the top (A5, B1); update it in a few taps (B3)
    login(STAFF);
    cy.contains("Benjo Cruz · Staff");
    cy.get("article").first().should("contain", "Cypress Customer").and("contain", "Requested");
    card("Cypress Customer").contains("0900 000 0777");
    card("Cypress Customer").contains("button", "Mark picked up").click();
    card("Cypress Customer").contains("Picked up");

    // C1: kilos x rate, then a typed total overrides it
    card("Cypress Customer").find('input[name="weightKg"]').type("8");
    card("Cypress Customer").find('input[name="amount"]').should("have.value", "280");
    card("Cypress Customer").contains("button", "Save").click();
    card("Cypress Customer").contains("Balance ₱280");
    card("Cypress Customer").find('input[name="amount"]').clear().type("250");
    card("Cypress Customer").contains("Total typed by hand");
    card("Cypress Customer").contains("button", "Save").click();
    card("Cypress Customer").contains("Balance ₱250");

    // C2, C3: staff takes a part payment
    card("Cypress Customer").find('input[name="payment"]').clear().type("100");
    card("Cypress Customer").contains("button", "Cash").click();
    card("Cypress Customer").contains("Partial");
    card("Cypress Customer").contains("₱100 · Cash · Benjo Cruz");
    card("Cypress Customer").contains("Balance ₱150");

    // C6: staff see only their own collections
    screen("My collections").click();
    cy.contains("What I collected");
    cy.contains("li", "Cypress Customer").should("contain", "₱100");
    cy.contains("Jun Pascual").should("not.exist"); // collected by the owner
    cy.contains("Orders received").should("not.exist");
    logout();

    // --- Owner: finish the order
    login(OWNER);
    card("Cypress Customer").contains("button", "Start washing").click();
    card("Cypress Customer").contains("button", "Mark ready").click();
    cy.contains('[aria-label="Filter by status"] button', "Ready").click();
    card("Cypress Customer").within(() => {
      // B7: name, shop name and amount due
      cy.contains("Hi Cypress! Your laundry from Sampaloc Laundry House is ready");
      cy.contains("Total: ₱250. Still to pay: ₱150.");
      cy.contains("a", "Send SMS")
        .should("have.attr", "href")
        .and("match", /^sms:\+639000000777\?&body=Hi%20Cypress/);
      cy.contains("button", "I told the customer").click();
      cy.contains("Customer told");
      cy.contains("button", "GCash").click(); // the rest, collected by the owner
      cy.contains("Paid ₱250");
      cy.contains("button", "Mark collected").click();
    });
    cy.contains('[aria-label="Filter by status"] button', "Delivered").click();
    card("Cypress Customer").contains("summary", "More").click();
    // B6: history with who and when
    card("Cypress Customer").contains("li", "Picked up").should("contain", "Benjo Cruz");
    card("Cypress Customer").contains("li", "Delivered").should("contain", "Rosa Dizon");

    // B4: search by phone number finds it whatever the filter
    cy.contains('[aria-label="Filter by status"] button', "Open").click();
    cy.get('input[name="search"]').type("09000000777");
    cy.get("article").should("have.length", 1).and("contain", "Cypress Customer");

    // --- C4: the owner's daily summary includes both payments, split by person
    screen("Summary").click();
    cy.get('[data-testid="by-person"]').within(() => {
      cy.contains("Benjo Cruz");
      cy.contains("Rosa Dizon");
    });
    cy.contains("li", "Cypress Customer");
    cy.contains("Orders received");

    // The customer's page follows.
    cy.get<string>("@statusPage").then((path) => cy.visit(path));
    cy.get('[aria-current="step"]').should("have.text", "Completed");
    cy.contains("₱250 (paid)");
    cy.contains("Benjo Cruz").should("not.exist"); // staff names are not sent to customers
  });

  it("adds a walk-in by hand (B5) and edits its details (B6)", () => {
    login(OWNER);
    cy.contains("button", "Add order").click();
    cy.contains("button", "Save order").click();
    cy.contains("Enter a mobile number like 0917 123 4567.");
    cy.get("#add-name").type("Walk In Wendy");
    cy.get("#add-phone").type("0900 000 0778");
    cy.get("#add-weightKg").type("5");
    cy.contains("button", "Save order").click();

    cy.get("article").first().should("contain", "Walk In Wendy").and("contain", "Picked up");
    card("Walk In Wendy").contains("Dropped off");
    card("Walk In Wendy").contains("Balance ₱175"); // 5 kg x ₱35

    card("Walk In Wendy").contains("summary", "More").click();
    card("Walk In Wendy").find('select[id$="-service"]').select("Wash, dry and iron (₱60/kg)");
    card("Walk In Wendy").find('textarea[id$="-notes"]').type("Hang the polos");
    card("Walk In Wendy").contains("button", "Save details").click();
    card("Walk In Wendy").contains("Wash, dry and iron (₱60/kg)");
    card("Walk In Wendy").contains("Hang the polos");
    card("Walk In Wendy").contains("Balance ₱300"); // the total followed the new rate
  });

  it("uses a changed price on the form and on new totals (C1)", () => {
    login(OWNER);
    screen("Settings").click();
    cy.contains("/s/sampaloc-laundry-house");
    cy.get("#service-name-new").type("Dry cleaning");
    cy.get("#service-price-new").type("120");
    cy.contains("button", "Add service").click();
    cy.get('input[value="Dry cleaning"]').should("exist");

    cy.visit(FORM);
    cy.contains("label", "Dry cleaning").should("contain", "₱120/kg");
  });
});

describe("shops are separate (D1)", () => {
  it("shows another shop none of this shop's orders, and refuses to change them", () => {
    login(OTHER_OWNER);
    cy.contains("h1", "Other Laundry");
    cy.contains("No open orders.");
    cy.get("article").should("not.exist");
    cy.request("/api/orders").its("body").should("have.length", 0);
    cy.request("/api/team").its("body").should("have.length", 1);
    cy.request({
      method: "PATCH",
      url: "/api/orders/1",
      body: { status: "cancelled" },
      failOnStatusCode: false,
    })
      .its("status")
      .should("eq", 404);
    cy.request({
      method: "POST",
      url: "/api/orders/1/payments",
      body: { amountCentavos: 100, method: "cash" },
      failOnStatusCode: false,
    })
      .its("status")
      .should("eq", 404);

    // A customer of this shop gets order #1, not a number that counts other shops' orders.
    cy.visit("/s/other-laundry");
    cy.get('input[name="name"]').type("Other Customer");
    cy.get('input[name="phone"]').type("0900 000 0779");
    cy.get('textarea[name="address"]').type("1 Other St");
    cy.get('select[name="pickupWindow"]').select("9 to 11 AM");
    cy.contains("button", "Request pickup").click();
    cy.contains("h2", "Order #1");
  });
});
