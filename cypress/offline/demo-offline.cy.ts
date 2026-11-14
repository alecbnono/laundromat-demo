// "v1 is done when ... it works with the phone's data connection off after the first load
// (tested)." This runs against a production build (see scripts/e2e.ts): the development
// server reloads the page when it loses its own live-reload connection, which a real
// deployment does not have.
import { walkthrough } from "../demo-walkthrough";

/** Switches the browser's network off or on (Chrome only). */
function setOffline(offline: boolean) {
  const send = (command: string, params: object = {}) =>
    Cypress.automation("remote:debugger:protocol", { command, params });
  cy.wrap(null).then(() =>
    send("Network.enable").then(() =>
      send("Network.emulateNetworkConditions", {
        offline,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      }),
    ),
  );
  cy.window().its("navigator.onLine").should("eq", !offline);
}

describe("demo with the data connection off", () => {
  afterEach(() => setOffline(false));

  it("runs the whole walkthrough after the first load", () => {
    cy.visit("/demo");
    cy.contains("button", "Request pickup");
    setOffline(true);
    walkthrough();
  });

  it("still opens after a refresh, from the copy kept on the phone", () => {
    cy.visit("/demo");
    cy.contains("button", "Request pickup");
    // Wait until the page's files have been kept for offline use.
    cy.window().then({ timeout: 20000 }, async (win) => {
      await win.navigator.serviceWorker.ready;
      for (let i = 0; i < 100; i++) {
        const kept = await (await win.caches.open("demo-v1")).keys();
        if (kept.some((r) => r.url.endsWith("/demo")) && kept.length > 5) return;
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error("The demo's files were not kept for offline use.");
    });

    setOffline(true);
    cy.reload();
    cy.contains("Sample data only.");
    cy.contains("button", "Request pickup");
    cy.contains("a", "Owner view").click();
    cy.contains("article", "Marites Dela Cruz");
  });
});
