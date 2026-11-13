// The /demo pages keep everything in the browser: no login, no API calls, reset on refresh.
describe("demo", () => {
  it("runs the whole journey without touching the server, and resets on refresh", () => {
    cy.intercept("/api/**", cy.spy().as("api"));

    cy.visit("/demo");
    cy.contains("Sample data only.");
    cy.get('input[name="name"]').type("Demo Visitor");
    cy.get('input[name="phone"]').type("0900 000 0444");
    cy.get('textarea[name="address"]').type("44 Demo St");
    cy.get('select[name="pickupWindow"]').select("1 to 3 PM");
    cy.contains("button", "Request pickup").click();

    cy.location("pathname").should("match", /^\/demo\/order\/.+/);
    cy.contains("Request sent!");
    cy.get('[aria-current="step"]').should("have.text", "Request received");

    // Owner view: no login, sample orders plus the new one.
    cy.contains("a", "Owner view").click();
    cy.location("pathname").should("eq", "/demo/owner");
    cy.contains("article", "Marites Dela Cruz");
    cy.contains("article", "Demo Visitor").contains("button", "Mark picked up").click();
    cy.contains("article", "Demo Visitor").contains("button", "Start washing").click();
    cy.contains("article", "Demo Visitor").contains("button", "Mark ready").click();
    cy.contains('[role="tab"]', "Ready").click();
    cy.contains("article", "Demo Visitor").contains("Hi Demo! Your laundry from");
    cy.contains("button", "Log out").should("not.exist");

    // The customer's status page follows (same browser memory).
    cy.go("back");
    cy.get('[aria-current="step"]').should("have.text", "Ready");

    cy.get("@api").should("not.have.been.called");

    // Refresh: back to the samples.
    cy.visit("/demo/owner");
    cy.contains("article", "Marites Dela Cruz");
    cy.contains("Demo Visitor").should("not.exist");
  });
});
