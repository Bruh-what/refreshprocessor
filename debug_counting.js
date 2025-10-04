import fs from "fs";
import Papa from "papaparse";

// Simple test to verify our baseline duplicate count
async function countExactDuplicates() {
  console.log("=== VERIFYING DUPLICATE COUNT LOGIC ===\n");

  // Read the CSV file
  const csvContent = fs.readFileSync(
    "./src/pages/Erica Covelle - Compass Contacts.csv",
    "utf8"
  );

  // Parse CSV using Papa Parse
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    encoding: "UTF-8",
  });

  console.log(`Loaded ${parsed.data.length} records from CSV`);

  // Normalize name function (matching the processor logic)
  function normalizeName(firstName, lastName) {
    const first = (firstName || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");
    const last = (lastName || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");

    // Only return normalized name if BOTH first and last names exist
    if (!first || !last) {
      return ""; // Return empty string if either name is missing
    }

    return `${first} ${last}`.trim();
  }

  // Group records by normalized name
  const nameGroups = new Map();
  let recordsWithNames = 0;
  let recordsWithoutNames = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const record = parsed.data[i];
    const normalizedName = normalizeName(
      record["First Name"],
      record["Last Name"]
    );

    if (!normalizedName) {
      recordsWithoutNames++;
      continue;
    }

    recordsWithNames++;

    if (!nameGroups.has(normalizedName)) {
      nameGroups.set(normalizedName, []);
    }
    nameGroups.get(normalizedName).push({
      index: i + 2, // +2 because CSV is 1-indexed and we skip header
      firstName: record["First Name"] || "",
      lastName: record["Last Name"] || "",
      email: record["Email"] || record["Personal Email"] || "No email",
    });
  }

  console.log(`Records with valid names: ${recordsWithNames}`);
  console.log(`Records without valid names: ${recordsWithoutNames}`);
  console.log(`Unique name groups: ${nameGroups.size}`);

  // Count duplicates using processor logic
  let duplicateGroups = 0;
  let totalDuplicateRecords = 0;
  let masterRecords = 0;

  const duplicateGroupDetails = [];

  for (const [name, records] of nameGroups.entries()) {
    if (records.length > 1) {
      // This is a duplicate group
      duplicateGroups++;
      masterRecords += 1; // First record becomes master
      totalDuplicateRecords += records.length - 1; // Rest are duplicates

      duplicateGroupDetails.push({
        name: name,
        count: records.length,
        records: records,
      });
    }
  }

  // Sort duplicate groups by count (largest first)
  duplicateGroupDetails.sort((a, b) => b.count - a.count);

  console.log("\n=== DUPLICATE COUNTING RESULTS ===");
  console.log(`Duplicate groups found: ${duplicateGroups}`);
  console.log(`Master records (CRMMERGED): ${masterRecords}`);
  console.log(`Duplicate records (CRMDuplicate): ${totalDuplicateRecords}`);

  console.log("\n=== TOP 10 DUPLICATE GROUPS ===");
  duplicateGroupDetails.slice(0, 10).forEach((group, index) => {
    console.log(`${index + 1}. "${group.name}": ${group.count} records`);
    group.records.forEach((record, i) => {
      const type = i === 0 ? "[MASTER]" : "[DUPLICATE]";
      console.log(
        `   ${type} Line ${record.index}: ${record.firstName} ${record.lastName} (${record.email})`
      );
    });
    console.log();
  });

  console.log("=== FINAL COMPARISON ===");
  console.log(
    `Expected duplicate records for dashboard: ${totalDuplicateRecords}`
  );
  console.log(`Processor reported: 100`);
  console.log(`Actual CRMDuplicate tags found: 173`);

  if (totalDuplicateRecords === 330) {
    console.log("✅ Our baseline count matches!");
  } else {
    console.log(`❌ Mismatch: Expected 330, got ${totalDuplicateRecords}`);
  }

  // Now let's simulate the processor counting logic
  console.log("\n=== SIMULATING PROCESSOR COUNTING ===");
  let processorCount = 0;

  for (const [name, records] of nameGroups.entries()) {
    if (records.length > 1) {
      // Processor logic: increment for each duplicate (not master)
      const duplicatesInGroup = records.length - 1;
      processorCount += duplicatesInGroup;

      console.log(
        `Group "${name}": +${duplicatesInGroup} duplicates (total now: ${processorCount})`
      );

      // If we hit 100, note it
      if (processorCount >= 100 && processorCount - duplicatesInGroup < 100) {
        console.log(`🔥 REACHED 100 DUPLICATES! Continuing...`);
      }
    }
  }

  console.log(`\nFinal processor simulation count: ${processorCount}`);
  console.log(`Expected: 330, Got: ${processorCount}`);

  if (processorCount !== 330) {
    console.log(
      "❌ Something is wrong with our counting logic or data processing"
    );
  } else {
    console.log(
      "✅ Counting logic is correct - the issue is in the actual processor"
    );
  }
}

countExactDuplicates().catch(console.error);
