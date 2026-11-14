// The /demo page keeps everything in the browser: no login, no API calls, reset on refresh.
// The same walkthrough runs with the network off in cypress/offline/demo-offline.cy.ts.
import { walkthrough } from "../demo-walkthrough";

describe("demo", () => {
  it("runs the whole walkthrough without touching the server, and resets on refresh", () => {
    cy.intercept("/api/**", cy.spy().as("api"));
    cy.visit("/demo");
    walkthrough();
    cy.get("@api").should("not.have.been.called");

    // Refresh: the samples again.
    cy.visit("/demo?v=orders");
    cy.contains("article", "Marites Dela Cruz");
    cy.contains("Demo Visitor").should("not.exist");
    cy.contains("Walk In Wendy").should("not.exist");
  });
});
