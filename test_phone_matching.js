// Script to test phone matching with real files
import RealEstateProcessor from "./src/utils/RealEstateProcessor.js";
import fs from "fs";
import Papa from "papaparse";

console.log("Starting phone matching test...");

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

// Count contacts with empty phone fields
const compassContactsWithoutPhones = compassData.filter((contact) => {
  const phones = processor.getAllPhoneNumbers(contact);
  return phones.length === 0;
});

console.log(
  `Found ${compassContactsWithoutPhones.length} Compass contacts without phone numbers`
);

// Try to match by name
let nameMatches = 0;
let phonesAdded = 0;

// Normalize name for matching
const normalizeName = (firstName, lastName) => {
  return `${(firstName || "").toLowerCase().trim()} ${(lastName || "")
    .toLowerCase()
    .trim()}`.trim();
};

// Create maps for faster lookup
const phoneContactsByName = new Map();
phoneData.forEach((phoneContact) => {
  const firstName =
    phoneContact["First name"] || phoneContact["First Name"] || "";
  const lastName = phoneContact["Last name"] || phoneContact["Last Name"] || "";
  const name = normalizeName(firstName, lastName);

  if (name) {
    if (!phoneContactsByName.has(name)) {
      phoneContactsByName.set(name, []);
    }
    phoneContactsByName.get(name).push(phoneContact);
  }
});

console.log(
  `Created lookup map with ${phoneContactsByName.size} unique names from phone data`
);

// Test matching for the first 20 compass contacts without phones
console.log("\nTesting name-based matching for sample contacts:");
const sampleSize = Math.min(20, compassContactsWithoutPhones.length);

for (let i = 0; i < sampleSize; i++) {
  const compassContact = compassContactsWithoutPhones[i];
  const compassName = normalizeName(
    compassContact["First Name"],
    compassContact["Last Name"]
  );

  if (!compassName) continue;

  console.log(`\nLooking for matches for: ${compassName}`);

  // Look for exact name matches
  if (phoneContactsByName.has(compassName)) {
    const matchingPhoneContacts = phoneContactsByName.get(compassName);
    console.log(
      `  Found ${matchingPhoneContacts.length} matching phone contacts!`
    );

    if (matchingPhoneContacts.length > 0) {
      nameMatches++;

      // Get all phone numbers from all matching phone contacts
      const allPhoneNumbers = [];
      for (const phoneContact of matchingPhoneContacts) {
        const phoneNumbers = processor.getAllPhoneNumbers(phoneContact);
        for (const phone of phoneNumbers) {
          if (!allPhoneNumbers.includes(phone)) {
            allPhoneNumbers.push(phone);
          }
        }
      }

      console.log(
        `  Found ${
          allPhoneNumbers.length
        } unique phone numbers: ${allPhoneNumbers.join(", ")}`
      );

      // Find empty phone fields in the compass contact
      const phoneFields = [
        "Mobile Phone",
        "Home Phone",
        "Work Phone",
        "Phone",
        "Primary Mobile Phone",
        "Primary Home Phone",
      ];

      let phonesAddedToContact = 0;
      for (const phone of allPhoneNumbers) {
        let added = false;
        for (const field of phoneFields) {
          if (!compassContact[field]) {
            console.log(`  Added phone ${phone} to field ${field}`);
            compassContact[field] = phone;
            phonesAdded++;
            phonesAddedToContact++;
            added = true;
            break;
          }
        }
        if (!added) {
          console.log(`  Could not add phone ${phone} (no empty fields)`);
        }
      }

      console.log(`  Added ${phonesAddedToContact} phones to this contact`);
    }
  } else {
    console.log(`  No exact matches found`);
  }
}

console.log("\nSummary:");
console.log(
  `Found name matches for ${nameMatches} out of ${sampleSize} tested contacts`
);
console.log(`Added ${phonesAdded} phone numbers in total`);
console.log(
  `This suggests we could potentially add approximately ${Math.floor(
    (phonesAdded / sampleSize) * compassContactsWithoutPhones.length
  )} phone numbers to the full dataset`
);

// Also check how many total phone numbers are available for matching
let totalUniquePhoneNumbers = 0;
const phoneSet = new Set();

for (const phoneContact of phoneData) {
  const phoneNumbers = processor.getAllPhoneNumbers(phoneContact);
  for (const phone of phoneNumbers) {
    if (!phoneSet.has(phone)) {
      phoneSet.add(phone);
      totalUniquePhoneNumbers++;
    }
  }
}

console.log(
  `\nTotal unique phone numbers available in phone export: ${totalUniquePhoneNumbers}`
);

// Check if our getAllPhoneNumbers function is working correctly for the phone export format
const phoneFieldsFound = new Set();
const phoneContactsWithPhones = phoneData.filter((contact) => {
  const phones = processor.getAllPhoneNumbers(contact);

  // Record which fields contained phone numbers
  if (phones.length > 0) {
    for (const key in contact) {
      if (key.includes("Phone") && contact[key] && contact[key].trim()) {
        phoneFieldsFound.add(key);
      }
    }
  }

  return phones.length > 0;
});

console.log(
  `\nPhone export contacts with extractable phone numbers: ${phoneContactsWithPhones.length} out of ${phoneData.length}`
);
console.log(`Phone fields found in the data (${phoneFieldsFound.size} total):`);
console.log(
  [...phoneFieldsFound].slice(0, 20).join(", ") +
    (phoneFieldsFound.size > 20 ? "..." : "")
);

console.log("\nTest complete");
