// Everything shop-specific lives here. To set the app up for a new shop,
// edit this file and replace public/logo.svg.
//
// NOTE: the name, phone, hours and prices below are SAMPLE values.

export const shop = {
  name: "Sampaloc Laundry House",
  tagline: "Pickup and delivery around Sampaloc, Manila",
  logo: "/logo.svg",
  phone: "+639000000000", // shop contact number shown to customers
  hours: "Open daily, 7 AM to 8 PM",
  services: [
    { name: "Wash, dry and fold", price: "₱180 per load (up to 8 kg)" },
    { name: "Wash, dry and iron", price: "₱280 per load (up to 8 kg)" },
    { name: "Comforters and bulky items", price: "₱200 per piece" },
  ],
  pickupWindows: ["8 to 10 AM", "10 AM to 12 PM", "1 to 3 PM", "3 to 5 PM", "5 to 7 PM"],
  // How many days ahead a customer can book a pickup.
  maxDaysAhead: 14,
} as const;

// Demo login made by `npm run seed` (never in production). For a real shop,
// run `npm run create-owner` instead.
export const DEMO_OWNER = { email: "owner@example.com", password: "laundry1234" };
