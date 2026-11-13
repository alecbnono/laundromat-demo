// The whole v1 journey: a customer requests a pickup, the owner works the order through
// to "ready", and the customer's status page follows along.
const OWNER = { email: "e2e-owner@example.com", password: "e2e-password-123" };

describe("pickup request to ready", () => {
  it("shows validation messages on an empty form", () => {
    cy.visit("/");
    cy.contains("button", "Request pickup").click();
    cy.contains("Please enter your name.");
    cy.contains("Enter a mobile number like 0917 123 4567.");
    cy.contains("Please enter your pickup address.");
    cy.contains("Please choose a pickup time.");
    cy.location("pathname").should("eq", "/");
  });

  it("keeps the order list behind the owner login", () => {
    cy.visit("/owner");
    cy.location("pathname").should("eq", "/owner/login");
    cy.get('input[name="email"]').type(OWNER.email);
    cy.get('input[name="password"]').type("not-the-password");
    cy.contains("button", "Open order list").click();
    cy.contains("Wrong email or password.");
  });

  it("takes an order from request to ready", () => {
    // Customer
    cy.visit("/");
    cy.get('input[name="name"]').type("Cypress Customer");
    cy.get('input[name="phone"]').type("0900 000 0777");
    cy.get('textarea[name="address"]').type("77 Test St, Sampaloc");
    cy.get('select[name="pickupWindow"]').select("1 to 3 PM");
    cy.contains("label", "I will collect it at the shop").click();
    cy.contains("button", "Request pickup").click();

    cy.location("pathname").should("match", /^\/order\/.+/);
    cy.contains("Request sent!");
    cy.get('[aria-current="step"]').should("have.text", "Request received");
    cy.location("pathname").as("statusPage");

    // Owner
    cy.visit("/owner/login");
    cy.get('input[name="email"]').type(OWNER.email);
    cy.get('input[name="password"]').type(OWNER.password);
    cy.contains("button", "Open order list").click();
    cy.location("pathname").should("eq", "/owner");

    cy.contains("article", "Cypress Customer").as("card");
    cy.get("@card").contains("0900 000 0777");
    cy.get("@card").find('input[name="weightKg"]').type("7.5");
    cy.get("@card").find('input[name="amount"]').type("180");
    cy.get("@card").contains("button", "Save").click();
    cy.contains("Unpaid so far: ₱180");

    cy.contains("article", "Cypress Customer").contains("button", "Mark picked up").click();
    cy.contains("article", "Cypress Customer").contains("button", "Start washing").click();
    cy.contains("article", "Cypress Customer").contains("button", "Mark ready").click();

    // It moves out of "To do" and into "Ready", with the message to send.
    cy.contains("article", "Cypress Customer").should("not.exist");
    cy.contains('[role="tab"]', "Ready").click();
    cy.contains("article", "Cypress Customer").within(() => {
      cy.contains("Hi Cypress! Your laundry from");
      cy.contains("Total: ₱180.");
      cy.contains("a", "Send SMS")
        .should("have.attr", "href")
        .and("match", /^sms:\+639000000777\?&body=Hi%20Cypress/);
      cy.contains("button", "GCash").click();
      cy.contains("Paid ₱180 · GCash");
      cy.contains("button", "I told the customer").click();
      cy.contains("Customer told");
    });

    // Customer's page follows.
    cy.get<string>("@statusPage").then((path) => cy.visit(path));
    cy.get('[aria-current="step"]').should("have.text", "Ready");
    cy.contains("₱180 (paid)");

    // Logging out locks the list again.
    cy.visit("/owner");
    cy.contains("button", "Log out").click();
    cy.location("pathname").should("eq", "/owner/login");
  });
});
