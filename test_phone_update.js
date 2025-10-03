// Test script to implement improved phone matching
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

// 1. First identify Compass contacts needing phones
const compassContactsNeedingPhones = compassData.filter((contact) => {
  // Count existing phone fields
  const phoneFields = [
    "Mobile Phone",
    "Home Phone",
    "Work Phone",
    "Phone",
    "Primary Mobile Phone",
    "Primary Home Phone",
  ];

  let emptyPhoneFields = 0;
  for (const field of phoneFields) {
    if (!contact[field] || contact[field].trim() === "") {
      emptyPhoneFields++;
    }
  }

  // Consider a contact as needing phones if it has at least one empty phone field
  return emptyPhoneFields > 0;
});

console.log(
  `Found ${compassContactsNeedingPhones.length} Compass contacts with at least one empty phone field`
);

// 2. Process phone data to extract valid phone numbers
const phoneContactsWithPhones = phoneData.filter((contact) => {
  return processor.getAllPhoneNumbers(contact).length > 0;
});

console.log(
  `Found ${phoneContactsWithPhones.length} phone contacts with valid phone numbers`
);

// 3. Create lookup maps for more efficient matching
const compassContactsByName = new Map();
const compassContactsByEmail = new Map();
const compassContactsByPartialName = new Map();

// Build lookup maps
for (const contact of compassContactsNeedingPhones) {
  const firstName = (contact["First Name"] || "").toLowerCase().trim();
  const lastName = (contact["Last Name"] || "").toLowerCase().trim();

  if (firstName && lastName) {
    // Exact name key
    const nameKey = `${firstName}|${lastName}`;
    if (!compassContactsByName.has(nameKey)) {
      compassContactsByName.set(nameKey, []);
    }
    compassContactsByName.get(nameKey).push(contact);

    // Partial name keys for more flexible matching
    const firstInitial = firstName.charAt(0);
    const lastInitial = lastName.charAt(0);

    // First initial + last name
    const firstInitialLastKey = `${firstInitial}|${lastName}`;
    if (!compassContactsByPartialName.has(firstInitialLastKey)) {
      compassContactsByPartialName.set(firstInitialLastKey, []);
    }
    compassContactsByPartialName.get(firstInitialLastKey).push(contact);

    // First name + last initial
    const firstNameLastInitialKey = `${firstName}|${lastInitial}`;
    if (!compassContactsByPartialName.has(firstNameLastInitialKey)) {
      compassContactsByPartialName.set(firstNameLastInitialKey, []);
    }
    compassContactsByPartialName.get(firstNameLastInitialKey).push(contact);
  }

  // Email-based lookup
  const emails = processor.getAllEmails(contact);
  for (const email of emails) {
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!compassContactsByEmail.has(normalizedEmail)) {
        compassContactsByEmail.set(normalizedEmail, []);
      }
      compassContactsByEmail.get(normalizedEmail).push(contact);
    }
  }
}

// 4. Match and add phone numbers
let exactNameMatches = 0;
let partialNameMatches = 0;
let emailMatches = 0;
let totalPhonesAdded = 0;

// Track how many contacts were updated
const updatedContacts = new Set();

// Process each phone contact
for (const phoneContact of phoneContactsWithPhones) {
  // Get phone numbers from this contact
  const phoneNumbers = processor.getAllPhoneNumbers(phoneContact);
  if (phoneNumbers.length === 0) continue;

  const firstName = (phoneContact["First Name"] || "").toLowerCase().trim();
  const lastName = (phoneContact["Last name"] || "").toLowerCase().trim();

  // Skip if no name information
  if (!firstName && !lastName) continue;

  let matchFound = false;

  // Try exact name match first
  if (firstName && lastName) {
    const nameKey = `${firstName}|${lastName}`;
    if (compassContactsByName.has(nameKey)) {
      const matchingContacts = compassContactsByName.get(nameKey);
      for (const compassContact of matchingContacts) {
        // Add phones to this contact
        const addedPhones = addPhonesToContact(compassContact, phoneNumbers);
        if (addedPhones > 0) {
          totalPhonesAdded += addedPhones;
          exactNameMatches++;
          updatedContacts.add(compassContact);
          matchFound = true;
        }
      }
    }
  }

  // If no exact match found, try partial name matching
  if (!matchFound && (firstName || lastName)) {
    // Try first initial + last name
    if (firstName && lastName) {
      const firstInitial = firstName.charAt(0);
      const firstInitialLastKey = `${firstInitial}|${lastName}`;

      if (compassContactsByPartialName.has(firstInitialLastKey)) {
        const matchingContacts =
          compassContactsByPartialName.get(firstInitialLastKey);
        for (const compassContact of matchingContacts) {
          // Only consider this a match if the first name doesn't completely mismatch
          const compassFirstName = (compassContact["First Name"] || "")
            .toLowerCase()
            .trim();
          if (compassFirstName.charAt(0) === firstInitial) {
            // Add phones to this contact
            const addedPhones = addPhonesToContact(
              compassContact,
              phoneNumbers
            );
            if (addedPhones > 0) {
              totalPhonesAdded += addedPhones;
              partialNameMatches++;
              updatedContacts.add(compassContact);
              matchFound = true;
              break;
            }
          }
        }
      }
    }

    // Try first name + last initial
    if (!matchFound && firstName && lastName) {
      const lastInitial = lastName.charAt(0);
      const firstNameLastInitialKey = `${firstName}|${lastInitial}`;

      if (compassContactsByPartialName.has(firstNameLastInitialKey)) {
        const matchingContacts = compassContactsByPartialName.get(
          firstNameLastInitialKey
        );
        for (const compassContact of matchingContacts) {
          // Only consider this a match if the last name doesn't completely mismatch
          const compassLastName = (compassContact["Last Name"] || "")
            .toLowerCase()
            .trim();
          if (compassLastName.charAt(0) === lastInitial) {
            // Add phones to this contact
            const addedPhones = addPhonesToContact(
              compassContact,
              phoneNumbers
            );
            if (addedPhones > 0) {
              totalPhonesAdded += addedPhones;
              partialNameMatches++;
              updatedContacts.add(compassContact);
              matchFound = true;
              break;
            }
          }
        }
      }
    }
  }

  // Try email matching as a last resort
  if (!matchFound) {
    const emails = processor.getAllEmails(phoneContact);
    for (const email of emails) {
      if (!email) continue;

      const normalizedEmail = email.toLowerCase().trim();
      if (compassContactsByEmail.has(normalizedEmail)) {
        const matchingContacts = compassContactsByEmail.get(normalizedEmail);
        for (const compassContact of matchingContacts) {
          // Add phones to this contact
          const addedPhones = addPhonesToContact(compassContact, phoneNumbers);
          if (addedPhones > 0) {
            totalPhonesAdded += addedPhones;
            emailMatches++;
            updatedContacts.add(compassContact);
            matchFound = true;
            break;
          }
        }
        if (matchFound) break;
      }
    }
  }
}

// Helper function to add phone numbers to a contact
function addPhonesToContact(contact, phoneNumbers) {
  const existingPhones = processor.getAllPhoneNumbers(contact);

  // These are the phone fields we'll fill
  const phoneFields = [
    "Mobile Phone",
    "Home Phone",
    "Work Phone",
    "Phone",
    "Primary Mobile Phone",
    "Primary Home Phone",
  ];

  let phonesAdded = 0;

  // Try to add each phone number
  for (const phoneNumber of phoneNumbers) {
    // Skip if this phone already exists in the contact
    if (existingPhones.includes(phoneNumber)) continue;

    // Find an empty field
    for (const field of phoneFields) {
      if (!contact[field] || contact[field].trim() === "") {
        contact[field] = phoneNumber;
        console.log(
          `Added phone ${phoneNumber} to ${contact["First Name"]} ${contact["Last Name"]} in ${field}`
        );
        phonesAdded++;
        break;
      }
    }

    // Stop if we've filled all fields
    if (phonesAdded >= phoneFields.length) break;
  }

  return phonesAdded;
}

// 5. Write the updated data back to a new CSV file
console.log("\n=== Matching Results ===");
console.log(`Exact name matches: ${exactNameMatches}`);
console.log(`Partial name matches: ${partialNameMatches}`);
console.log(`Email matches: ${emailMatches}`);
console.log(`Total phones added: ${totalPhonesAdded}`);
console.log(
  `Updated ${updatedContacts.size} out of ${compassContactsNeedingPhones.length} contacts that needed phones`
);

// Create a new CSV file with the updated data
const outputCsv = Papa.unparse(compassData);
fs.writeFileSync("updated_compass_contacts.csv", outputCsv);
console.log("\nUpdated data written to updated_compass_contacts.csv");

// 6. Final phone status report
const updatedCompassData = compassData;
let contactsNoPhones = 0;
let contactsWithSomePhones = 0;
let contactsWithManyPhones = 0;

for (const contact of updatedCompassData) {
  const phoneCount = processor.getAllPhoneNumbers(contact).length;

  if (phoneCount === 0) {
    contactsNoPhones++;
  } else if (phoneCount >= 3) {
    contactsWithManyPhones++;
  } else {
    contactsWithSomePhones++;
  }
}

console.log("\n=== Compass Contact Phone Status ===");
console.log(`Contacts with no phones: ${contactsNoPhones}`);
console.log(`Contacts with some phones (1-2): ${contactsWithSomePhones}`);
console.log(`Contacts with 3+ phones: ${contactsWithManyPhones}`);
console.log(`Total contacts: ${updatedCompassData.length}`);
