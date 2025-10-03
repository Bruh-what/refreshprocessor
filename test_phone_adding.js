// Test script for phone number extraction from phone export files
import RealEstateProcessor from "./src/utils/RealEstateProcessor.js";

// Create a test contact that simulates a phone export format
const testPhoneContact = {
  "First Name": "John",
  "Last Name": "Doe",
  "Phone :": "555-123-4567",
  "Phone : mobile": "555-234-5678",
  "Phone : home": "555-345-6789",
  Email: "john.doe@example.com",
};

// Create a test contact that simulates a Compass contact without phones
const testCompassContact = {
  "First Name": "John",
  "Last Name": "Doe",
  Email: "john.doe@example.com",
  Company: "Acme Inc",
  Title: "Manager",
};

// Initialize the processor
const processor = new RealEstateProcessor();

// Test phone number extraction
console.log("Testing phone number extraction from phone export contact:");
const phoneNumbers = processor.getAllPhoneNumbers(testPhoneContact);
console.log("Extracted phone numbers:", phoneNumbers);

// Test name-based matching logic (simplified)
console.log("\nTesting name-based phone matching:");
console.log(
  "Compass contact before:",
  JSON.stringify(testCompassContact, null, 2)
);

// Simulate name matching logic
const nameKey = `${testCompassContact[
  "First Name"
].toLowerCase()}|${testCompassContact["Last Name"].toLowerCase()}`;
console.log("Name key for matching:", nameKey);

// Manually add phone number to Compass contact
if (phoneNumbers.length > 0) {
  const phoneNumber = phoneNumbers[0];
  console.log(`Found phone number ${phoneNumber} for name ${nameKey}`);

  // Check if contact already has a phone number
  const existingPhones = processor.getAllPhoneNumbers(testCompassContact);
  if (existingPhones.length > 0) {
    console.log(`Contact already has phone: ${existingPhones[0]}`);
  } else {
    // Find first empty phone field
    const phoneFields = [
      "Mobile Phone",
      "Home Phone",
      "Work Phone",
      "Phone",
      "Primary Mobile Phone",
      "Primary Home Phone",
    ];

    let phoneAdded = false;
    for (const field of phoneFields) {
      if (!testCompassContact[field]) {
        testCompassContact[field] = phoneNumber;
        console.log(`Added phone ${phoneNumber} to contact in field ${field}`);
        phoneAdded = true;
        break;
      }
    }

    if (!phoneAdded) {
      console.log(`Could not find empty phone field for contact`);
    }
  }
}

console.log(
  "Compass contact after:",
  JSON.stringify(testCompassContact, null, 2)
);

// Create a real test with actual file data
console.log("\n\nTesting with real data format from your files:");

// Create a contact that matches the format in your phone export file
const realPhoneExportContact = {
  "Last name": "Abbott",
  "First name": "Jake",
  "Phone :": "+1 (202) 431-4971",
  "Phone : mobile": "(484) 571-0022",
  "Phone : home": "(610) 355-0165",
  "Email :": "example@email.com",
};

console.log(
  "Real phone export contact before extraction:",
  realPhoneExportContact
);
const realPhoneNumbers = processor.getAllPhoneNumbers(realPhoneExportContact);
console.log("Extracted phone numbers:", realPhoneNumbers);

// Now let's test with a real Compass format contact that needs a phone
const realCompassContact = {
  "First Name": "John",
  "Last Name": "Stillwagon",
  Email: "jrs215@verizon.net",
  Phone: "", // Empty phone field
};

console.log("\nReal Compass contact before adding phone:", realCompassContact);

// Manually add phone number to Compass contact
if (realPhoneNumbers.length > 0) {
  const phoneNumber = realPhoneNumbers[0];

  // Check if contact already has a phone number
  const existingPhones = processor.getAllPhoneNumbers(realCompassContact);
  if (existingPhones.length > 0) {
    console.log(`Contact already has phone: ${existingPhones[0]}`);
  } else {
    // Find first empty phone field
    const phoneFields = [
      "Mobile Phone",
      "Home Phone",
      "Work Phone",
      "Phone",
      "Primary Mobile Phone",
      "Primary Home Phone",
    ];

    let phoneAdded = false;
    for (const field of phoneFields) {
      if (!realCompassContact[field] || realCompassContact[field] === "") {
        realCompassContact[field] = phoneNumber;
        console.log(`Added phone ${phoneNumber} to contact in field ${field}`);
        phoneAdded = true;
        break;
      }
    }

    if (!phoneAdded) {
      console.log(`Could not find empty phone field for contact`);
    }
  }
}

console.log("Real Compass contact after adding phone:", realCompassContact);
