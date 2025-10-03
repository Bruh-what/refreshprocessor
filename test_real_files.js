// Script to test phone matching with real files
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

// Sample 5 phone contacts to check format
console.log("\nSample phone contact fields:");
if (phoneData.length > 0) {
  const samplePhone = phoneData[0];
  const phoneFields = Object.keys(samplePhone);
  console.log(phoneFields);

  // Check for phone fields
  const phoneFieldsFound = phoneFields.filter(
    (field) => field.includes("Phone") || field.includes("phone")
  );
  console.log("\nPhone fields found:", phoneFieldsFound);

  // Show a sample phone record
  console.log("\nSample phone record:");
  console.log(samplePhone);
}

// Test phone extraction from a sample phone contact
if (phoneData.length > 0) {
  console.log("\nTesting phone extraction from a phone export contact:");
  const processor = new RealEstateProcessor();
  const samplePhoneContact = phoneData[0];

  const phoneNumbers = processor.getAllPhoneNumbers(samplePhoneContact);
  console.log(`Found ${phoneNumbers.length} phone numbers:`, phoneNumbers);

  // Show which fields contained the phone numbers
  console.log("\nPhone-containing fields in the sample contact:");
  for (const [key, value] of Object.entries(samplePhoneContact)) {
    if (
      value &&
      typeof value === "string" &&
      value.replace(/\D/g, "").length >= 10
    ) {
      console.log(`Field "${key}": ${value}`);
    }
  }
}

// Test adding a phone to a Compass contact
if (compassData.length > 0 && phoneData.length > 0) {
  console.log("\nTesting adding a phone to a Compass contact:");
  const processor = new RealEstateProcessor();

  // Find a Compass contact without a phone
  const compassContactWithoutPhone = compassData.find((contact) => {
    const phones = processor.getAllPhoneNumbers(contact);
    return phones.length === 0;
  });

  if (compassContactWithoutPhone) {
    console.log(
      `Found Compass contact without phone: ${compassContactWithoutPhone["First Name"]} ${compassContactWithoutPhone["Last Name"]}`
    );

    // Find a phone contact with the same name
    const phoneContact = phoneData.find(
      (pc) =>
        pc["First Name"]?.toLowerCase() ===
          compassContactWithoutPhone["First Name"]?.toLowerCase() &&
        pc["Last Name"]?.toLowerCase() ===
          compassContactWithoutPhone["Last Name"]?.toLowerCase()
    );

    if (phoneContact) {
      console.log(
        `Found matching phone contact: ${phoneContact["First Name"]} ${phoneContact["Last Name"]}`
      );

      const phoneNumbers = processor.getAllPhoneNumbers(phoneContact);
      if (phoneNumbers.length > 0) {
        console.log(
          `Phone contact has ${phoneNumbers.length} phone numbers:`,
          phoneNumbers
        );

        // Add the phone to the Compass contact
        compassContactWithoutPhone["Mobile Phone"] = phoneNumbers[0];
        console.log(`Added phone ${phoneNumbers[0]} to Compass contact`);
        console.log(`Updated Compass contact:`, compassContactWithoutPhone);
      } else {
        console.log(`No phones found in the matching phone contact`);
      }
    } else {
      console.log(`No matching phone contact found`);
    }
  } else {
    console.log(`All Compass contacts already have phones`);
  }
}

console.log("\nTest complete");
