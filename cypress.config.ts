import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // `npm run test:e2e` starts the app here on a throwaway database.
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3100",
    // The offline demo test lives apart: it needs a production build (scripts/e2e.ts).
    specPattern: process.env.CYPRESS_SPECS ?? "cypress/e2e/**/*.cy.ts",
    supportFile: false,
    video: false,
    screenshotOnRunFailure: false,
    viewportWidth: 390, // phone-sized, like the real users
    viewportHeight: 844,
  },
});
