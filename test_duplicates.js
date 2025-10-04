// Simple test to verify duplicate detection works
import { RealEstateProcessor } from "./src/utils/RealEstateProcessor.js";

// Create test data with obvious duplicates
const testData = [
  {
    "First Name": "John",
    "Last Name": "Smith",
    Email: "john@email.com",
    Tags: "ALL CONTACTS",
  },
  {
    "First Name": "John",
    "Last Name": "Smith",
    Email: "johnsmith@gmail.com",
    Tags: "ALL CONTACTS",
  },
  {
    "First Name": "Jane",
    "Last Name": "Doe",
    Email: "jane@email.com",
    Tags: "ALL CONTACTS",
  },
  {
    "First Name": "jane",
    "Last Name": "doe",
    Email: "jane.doe@company.com",
    Tags: "ALL CONTACTS",
  },
];

async function testDuplicateDetection() {
  console.log("=== DUPLICATE DETECTION TEST ===");
  console.log("Input data:", testData.length, "records");

  const processor = new RealEstateProcessor();

  // Process the test data
  const result = await processor.deduplicateContacts(testData, "test");

  console.log("\n=== RESULTS ===");
  console.log("Output records:", result.length);

  // Show stats
  const stats = processor.getStats();
  console.log("Stats:", stats);

  // Show records with their tags
  console.log("\n=== PROCESSED RECORDS ===");
  result.forEach((record, index) => {
    console.log(
      `${index + 1}. ${record["First Name"]} ${record["Last Name"]} - Tags: ${
        record["Tags"]
      }`
    );
    if (record.changes) {
      console.log(`   Changes: ${record.changes.join("; ")}`);
    }
  });

  // Count duplicates
  const duplicateCount = result.filter(
    (r) => r["Tags"] && r["Tags"].includes("CRMDuplicate")
  ).length;
  const masterCount = result.filter(
    (r) => r["Tags"] && r["Tags"].includes("CRMMERGED")
  ).length;

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total records: ${result.length}`);
  console.log(`Master records (CRMMERGED): ${masterCount}`);
  console.log(`Duplicate records (CRMDuplicate): ${duplicateCount}`);
  console.log(`Stats duplicatesTagged: ${stats.duplicatesTagged}`);
}

testDuplicateDetection().catch(console.error);
