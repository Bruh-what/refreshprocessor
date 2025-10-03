// Test script to verify phone number additions during contact merging
import RealEstateProcessor from "./src/utils/RealEstateProcessor.js";

// Initialize the processor
const processor = new RealEstateProcessor();
console.log("Initial stats:", processor.getStats());

// Create a contact that will receive merged data (existing contact)
const existingContact = {
  "First Name": "John",
  "Last Name": "Doe",
  Email: "john.doe@example.com",
  Company: "Acme Inc",
  Title: "Manager",
  changes: [],
};

// Create a duplicate contact with phone numbers that will be merged into the existing contact
const duplicateContact = {
  "First Name": "John",
  "Last Name": "Doe",
  Email: "john.doe@gmail.com", // Different email
  "Phone :": "555-123-4567",
  "Phone : mobile": "555-234-5678",
  "Mobile Phone": "555-345-6789",
};

console.log(
  "Existing contact before merge:",
  JSON.stringify(existingContact, null, 2)
);
console.log("Duplicate contact:", JSON.stringify(duplicateContact, null, 2));

// Get phone numbers before merging
console.log("\nPhone numbers in duplicate contact:");
const duplicatePhones = processor.getAllPhoneNumbers(duplicateContact);
console.log(duplicatePhones);

// Perform the merge
console.log("\nMerging contacts...");
processor.mergeContactData(existingContact, duplicateContact);

// Check the result
console.log(
  "\nExisting contact after merge:",
  JSON.stringify(existingContact, null, 2)
);
console.log("Changes made:", existingContact.changes);

// Verify phone numbers after merging
console.log("\nPhone numbers in merged contact:");
const mergedPhones = processor.getAllPhoneNumbers(existingContact);
console.log(mergedPhones);

// Check stats to verify phone counter was incremented
console.log("\nFinal stats:", processor.getStats());
console.log(`Phones added: ${processor.phonesAddedCount}`);
