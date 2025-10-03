// Test the enhanced phone matching logic
import RealEstateProcessor from "./src/utils/RealEstateProcessor.js";
import fs from "fs";
import Papa from "papaparse";

// Path to your files
const COMPASS_FILE =
  "../processed_compass_contacts_with_anniversaries (31).csv";
const PHONE_EXPORT_FILE =
  "../Lisie Abrams_ Phone Export - Lisie Abrams_ Phone Export.csv.csv";

// Read and parse the CSV files
const compassCsv = fs.readFileSync(COMPASS_FILE, "utf8");
const phoneCsv = fs.readFileSync(PHONE_EXPORT_FILE, "utf8");

const compassData = Papa.parse(compassCsv, { header: true }).data;
const phoneData = Papa.parse(phoneCsv, { header: true }).data;

console.log(
  `Loaded ${compassData.length} Compass contacts and ${phoneData.length} phone contacts`
);

// Initialize the processor
const processor = new RealEstateProcessor();

// Count phone matches with different strategies
function countPotentialMatches() {
  // Count exact name matches
  const exactNameMatches = new Map();
  const exactNameMatchCount = { matches: 0, phones: 0 };

  // Count partial matches (last name + first initial)
  const partialMatches = new Map();
  const partialMatchCount = { matches: 0, phones: 0 };

  // Process compass contacts first
  console.log("Analyzing potential matches...");

  for (const compassContact of compassData) {
    const firstName = (compassContact["First Name"] || "").toLowerCase().trim();
    const lastName = (compassContact["Last Name"] || "").toLowerCase().trim();

    if (!firstName || !lastName) continue;

    // Check if this contact already has phones
    const existingPhones = processor.getAllPhoneNumbers(compassContact);
    if (existingPhones.length >= 3) continue; // Skip if already has 3 or more phones

    // Create exact name key
    const exactNameKey = `${firstName}|${lastName}`;
    exactNameMatches.set(exactNameKey, compassContact);

    // Create partial match key (last name + first initial)
    const firstInitial = firstName.charAt(0);
    const partialKey = `${lastName}|${firstInitial}`;
    partialMatches.set(partialKey, compassContact);
  }

  console.log(
    `Created ${exactNameMatches.size} exact name keys and ${partialMatches.size} partial name keys`
  );

  // Now check phone contacts for matches
  for (const phoneContact of phoneData) {
    const firstName = (phoneContact["First Name"] || "").toLowerCase().trim();
    const lastName = (phoneContact["Last Name"] || "").toLowerCase().trim();

    if (!firstName || !lastName) continue;

    // Get phones from this contact
    const phoneNumbers = processor.getAllPhoneNumbers(phoneContact);
    if (phoneNumbers.length === 0) continue;

    // Check for exact name match
    const exactNameKey = `${firstName}|${lastName}`;
    if (exactNameMatches.has(exactNameKey)) {
      exactNameMatchCount.matches++;
      exactNameMatchCount.phones += phoneNumbers.length;

      // Log some examples
      if (exactNameMatchCount.matches <= 5) {
        console.log(
          `Exact match example #${exactNameMatchCount.matches}: ${firstName} ${lastName} with ${phoneNumbers.length} phones`
        );
        console.log(`  Phone numbers: ${phoneNumbers.join(", ")}`);
      }
    }

    // Check for partial match
    const firstInitial = firstName.charAt(0);
    const partialKey = `${lastName}|${firstInitial}`;
    if (partialMatches.has(partialKey) && !exactNameMatches.has(exactNameKey)) {
      // Only count if not already exact match
      partialMatchCount.matches++;
      partialMatchCount.phones += phoneNumbers.length;

      // Log some examples
      if (partialMatchCount.matches <= 5) {
        console.log(
          `Partial match example #${partialMatchCount.matches}: ${firstName} ${lastName} with ${phoneNumbers.length} phones`
        );
        console.log(
          `  Matched with first initial '${firstInitial}' and last name '${lastName}'`
        );
        console.log(`  Phone numbers: ${phoneNumbers.join(", ")}`);
      }
    }
  }

  return {
    exactNameMatches: exactNameMatchCount,
    partialMatches: partialMatchCount,
    totalPotentialPhones: exactNameMatchCount.phones + partialMatchCount.phones,
  };
}

// Run the analysis
const potentialMatches = countPotentialMatches();

console.log("\n=== Potential Match Analysis ===");
console.log(
  `Exact name matches: ${potentialMatches.exactNameMatches.matches} contacts with ${potentialMatches.exactNameMatches.phones} phone numbers`
);
console.log(
  `Partial matches (last name + first initial): ${potentialMatches.partialMatches.matches} contacts with ${potentialMatches.partialMatches.phones} phone numbers`
);
console.log(
  `Total potential phones to add: ${potentialMatches.totalPotentialPhones}`
);

// Count how many Compass contacts could benefit
let contactsMissingPhones = 0;
let contactsWithSomePhones = 0;
let contactsWithAllPhones = 0;

for (const contact of compassData) {
  const phones = processor.getAllPhoneNumbers(contact);
  if (phones.length === 0) {
    contactsMissingPhones++;
  } else if (phones.length < 3) {
    contactsWithSomePhones++;
  } else {
    contactsWithAllPhones++;
  }
}

console.log("\n=== Compass Contact Phone Status ===");
console.log(`Contacts with no phones: ${contactsMissingPhones}`);
console.log(`Contacts with some phones (1-2): ${contactsWithSomePhones}`);
console.log(`Contacts with 3+ phones: ${contactsWithAllPhones}`);
console.log(`Total contacts: ${compassData.length}`);
