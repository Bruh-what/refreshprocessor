// Test script for exact-only phone number matching
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

// Create maps for exact name matching
const exactPhoneNameMap = new Map();

// Build map of phone contacts
for (const phoneContact of phoneData) {
  // Only consider phone contacts that have phone numbers
  const phoneNumbers = processor.getAllPhoneNumbers(phoneContact);
  if (phoneNumbers.length === 0) continue;

  const firstName = (phoneContact["First name"] || "").toLowerCase().trim();
  const lastName = (phoneContact["Last name"] || "").toLowerCase().trim();

  if (!firstName && !lastName) continue;

  // Create exact name key
  if (firstName && lastName) {
    const exactNameKey = `${firstName}|${lastName}`;

    // Store ALL phone contacts with the same name in an array
    if (exactPhoneNameMap.has(exactNameKey)) {
      const contacts = exactPhoneNameMap.get(exactNameKey);
      contacts.push(phoneContact);
    } else {
      exactPhoneNameMap.set(exactNameKey, [phoneContact]);
    }
  }
}

// Find Compass contacts without phone numbers
const compassContactsWithoutPhones = compassData.filter((contact) => {
  const phoneCount = processor.getAllPhoneNumbers(contact).length;
  return phoneCount === 0;
});

console.log(
  `Found ${compassContactsWithoutPhones.length} Compass contacts without phone numbers`
);
console.log(`Phone export data has ${exactPhoneNameMap.size} unique names`);

// Test exact name matches
let exactMatchCount = 0;
let potentialPhonesAdded = 0;

for (const compassContact of compassContactsWithoutPhones) {
  const firstName = (compassContact["First Name"] || "").toLowerCase().trim();
  const lastName = (compassContact["Last Name"] || "").toLowerCase().trim();

  if (!firstName && !lastName) continue;

  // Create exact name key
  if (firstName && lastName) {
    const exactNameKey = `${firstName}|${lastName}`;

    // Check if this name exists in Phone data
    if (exactPhoneNameMap.has(exactNameKey)) {
      const phoneContacts = exactPhoneNameMap.get(exactNameKey);

      // Skip if no phone contacts found
      if (phoneContacts === null || phoneContacts.length === 0) continue;

      // Get all phone numbers from all phone contacts with this name
      const allPhoneNumbers = new Set();
      for (const phoneContact of phoneContacts) {
        const phoneNumbers = processor.getAllPhoneNumbers(phoneContact);
        for (const num of phoneNumbers) {
          allPhoneNumbers.add(num);
        }
      }

      if (allPhoneNumbers.size > 0) {
        exactMatchCount++;
        potentialPhonesAdded += allPhoneNumbers.size;

        // Display up to 10 examples
        if (exactMatchCount <= 10) {
          console.log(`\nExact match: ${firstName} ${lastName}`);
          console.log(
            `  Phone numbers available: ${Array.from(allPhoneNumbers).join(
              ", "
            )}`
          );
        }
      }
    }
  }
}

console.log(
  `\nFound ${exactMatchCount} exact name matches out of ${compassContactsWithoutPhones.length} contacts without phones`
);
console.log(`Potential phones that could be added: ${potentialPhonesAdded}`);
console.log(
  `This represents ${(
    (exactMatchCount / compassContactsWithoutPhones.length) *
    100
  ).toFixed(1)}% of contacts without phones`
);
