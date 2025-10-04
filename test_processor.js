import fs from "fs";
import Papa from "papaparse";
import RealEstateProcessor from "./src/utils/RealEstateProcessor.js";

async function testProcessor() {
  console.log(
    "Testing RealEstateProcessor on Erica Covelle - Compass Contacts.csv..."
  );

  // Read the CSV file
  const csvContent = fs.readFileSync(
    "./src/pages/Erica Covelle - Compass Contacts.csv",
    "utf8"
  );

  // Parse CSV using Papa Parse (same as the processor does)
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    encoding: "UTF-8",
  });

  console.log(`Loaded ${parsed.data.length} records from CSV`);

  // Create processor instance
  const processor = new RealEstateProcessor();

  // Set the compass data directly
  processor.compassData = parsed.data;
  processor.phoneData = []; // No phone data for this test
  processor.mlsAddresses = []; // No MLS data for this test

  console.log("Starting processor deduplication...");

  // Run the deduplication process
  const result = await processor.mergeAndClassifyChunked(
    (progress) => {
      console.log(`Progress: ${progress.message} (${progress.progress}%)`);
    },
    (log) => {
      console.log(`Log: ${log}`);
    }
  );

  // Get final stats
  const stats = processor.getStats();

  console.log("\n=== PROCESSOR RESULTS ===");
  console.log("Total records processed:", stats.totalRecords);
  console.log("Duplicates tagged:", stats.duplicatesTagged);
  console.log("Merged records:", stats.mergedRecords);
  console.log("Changed records:", stats.changedRecords);
  console.log("Agents:", stats.agents);
  console.log("Vendors:", stats.vendors);
  console.log("Past clients:", stats.pastClients);

  console.log("\n=== COMPARISON ===");
  console.log("Expected duplicates (from our analysis):", 330);
  console.log("Actual duplicates (from processor):", stats.duplicatesTagged);
  console.log("Difference:", Math.abs(330 - stats.duplicatesTagged));

  if (stats.duplicatesTagged === 330) {
    console.log("✅ MATCH! Processor found the expected number of duplicates");
  } else if (stats.duplicatesTagged < 330) {
    console.log(
      "❌ UNDERCOUNT: Processor found fewer duplicates than expected"
    );
  } else {
    console.log("❌ OVERCOUNT: Processor found more duplicates than expected");
  }

  // Let's also check some sample duplicate-tagged records
  const processedData = processor.getProcessedData();
  const duplicateRecords = processedData.filter(
    (record) => record.Tags && record.Tags.includes("CRMDuplicate")
  );

  console.log("\n=== SAMPLE DUPLICATE RECORDS ===");
  console.log(`Found ${duplicateRecords.length} records with CRMDuplicate tag`);

  if (duplicateRecords.length > 0) {
    console.log("First 5 duplicate records:");
    duplicateRecords.slice(0, 5).forEach((record, index) => {
      const firstName = record["First Name"] || "";
      const lastName = record["Last Name"] || "";
      const email = record["Email"] || record["Personal Email"] || "No email";
      console.log(`${index + 1}. ${firstName} ${lastName} (${email})`);
    });
  }

  // Check for CRMMERGED records too
  const masterRecords = processedData.filter(
    (record) => record.Tags && record.Tags.includes("CRMMERGED")
  );

  console.log(
    `\nFound ${masterRecords.length} records with CRMMERGED tag (master records)`
  );

  console.log("\n=== FINAL VERIFICATION ===");
  console.log("Total duplicate groups should be:", masterRecords.length);
  console.log("Total duplicate records should be:", duplicateRecords.length);
  console.log("Expected duplicate records:", 330);
  console.log("Match?", duplicateRecords.length === 330 ? "✅ YES" : "❌ NO");
}

testProcessor().catch(console.error);
