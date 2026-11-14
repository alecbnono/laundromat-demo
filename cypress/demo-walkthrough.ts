// The demo walkthrough: form, order list, payments, summary, settings. Used twice: online
// against the development server (e2e/demo.cy.ts) and with the network off against a
// production build (offline/demo-offline.cy.ts).
const card = (name: string) => cy.contains("article", name);

export function walkthrough() {
  cy.contains("Sample data only.");
  cy.contains("h1", "Sampaloc Laundry House");

  // --- A. The customer's form
  cy.get('input[name="name"]').type("Demo Visitor");
  cy.get('input[name="phone"]').type("0900 000 0444");
  cy.get('textarea[name="address"]').type("44 Demo St");
  cy.get('select[name="pickupWindow"]').select("1 to 3 PM");
  cy.contains("button", "Request pickup").click();
  cy.contains("Request sent!");
  cy.get('[aria-current="step"]').should("have.text", "Request received");

  // --- B. The owner's order list: the new request is at the top (A5, B1)
  cy.contains("a", "Owner view").click();
  cy.get("article").first().should("contain", "Demo Visitor").and("contain", "Requested");
  card("Demo Visitor").contains("button", "Mark picked up").click();
  card("Demo Visitor").contains("Picked up");

  // C1: the total fills in from the kilos (4 kg x ₱35)
  card("Demo Visitor").find('input[name="weightKg"]').type("4");
  card("Demo Visitor").find('input[name="amount"]').should("have.value", "140");
  card("Demo Visitor").contains("button", "Save").click();
  card("Demo Visitor").contains("Balance ₱140");

  // C2, C3: a part payment, then the rest
  card("Demo Visitor").find('input[name="payment"]').clear().type("100");
  card("Demo Visitor").find('select[name="collectedBy"]').select("Benjo Cruz");
  card("Demo Visitor").contains("button", "Cash").click();
  card("Demo Visitor").contains("Partial");
  card("Demo Visitor").contains("Balance ₱40");
  card("Demo Visitor").contains("₱100 · Cash · Benjo Cruz");
  card("Demo Visitor").contains("button", "GCash").click();
  card("Demo Visitor").contains("Paid ₱140");

  card("Demo Visitor").contains("button", "Start washing").click();
  card("Demo Visitor").contains("button", "Mark ready").click();
  card("Demo Visitor").contains("Hi Demo! Your laundry from Sampaloc Laundry House is ready");

  // B4: filter by status, search by name or phone
  cy.contains('[aria-label="Filter by status"] button', "Ready").click();
  card("Demo Visitor");
  cy.contains("article", "Paolo Garcia").should("not.exist");
  cy.get('input[name="search"]').type("0900 000 0108");
  cy.get("article").should("have.length", 1).and("contain", "Paolo Garcia");
  cy.get('input[name="search"]').clear().type("marites");
  cy.get("article").should("have.length", 1).and("contain", "Marites Dela Cruz");
  cy.get('input[name="search"]').clear();

  // B6: status history
  card("Demo Visitor").contains("summary", "More").click();
  card("Demo Visitor").contains("li", "Requested").should("contain", "Customer");
  card("Demo Visitor").contains("li", "Ready").should("contain", "Rosa Dizon");

  // B5: add a walk-in by hand
  cy.contains("button", "Add order").click();
  cy.get("#add-name").type("Walk In Wendy");
  cy.get("#add-phone").type("0900 000 0445");
  cy.get("#add-weightKg").type("5");
  cy.contains("button", "Save order").click();
  cy.contains('[aria-label="Filter by status"] button', "Open").click();
  cy.get("article").first().should("contain", "Walk In Wendy").and("contain", "Dropped off");
  card("Walk In Wendy").contains("Balance ₱175");

  // --- C4: the daily summary
  cy.contains('nav[aria-label="Screens"] a', "Summary").click();
  cy.contains("Orders received");
  cy.contains("Total collected");
  cy.get('[data-testid="by-person"]').should("contain", "Benjo Cruz").and("contain", "Rosa Dizon");
  cy.contains("Unpaid balance");
  // C5: the unpaid list
  cy.contains("button", "Delivered but not fully paid").click();
  cy.contains("article", "Ramon Bautista").contains("Delivered");

  // --- Settings: a price change shows on the customer's form (C1)
  cy.contains('nav[aria-label="Screens"] a', "Settings").click();
  cy.contains("No login is created");
  cy.get('input[id^="service-price-"]').first().clear().type("38");
  cy.contains("li", "₱ per kilo").contains("button", "Save").click();
  cy.contains("a", "Customer view").click();
  cy.contains("label", "Wash, dry and fold").should("contain", "₱38/kg");

  cy.contains("button", "Log out").should("not.exist");
}
