import fs from "fs";
import Papa from "papaparse";

async function analyzeDuplicateTags() {
  console.log("=== ANALYZING SIMPLE DUPLICATE TAGGED CSV ===\n");

  // Read the CSV file
  const csvContent = fs.readFileSync("simple_duplicate_tagged.csv", "utf8");

  // Parse CSV
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    encoding: "UTF-8",
  });

  console.log(`Total records in CSV: ${parsed.data.length}`);

  // Count different tag types
  let crmMergedCount = 0;
  let crmDuplicateCount = 0;
  let recordsWithTags = 0;
  let recordsWithoutTags = 0;

  const crmMergedRecords = [];
  const crmDuplicateRecords = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const record = parsed.data[i];
    const tags = record["Tags"] || "";

    if (tags) {
      recordsWithTags++;

      if (tags.includes("CRMMERGED")) {
        crmMergedCount++;
        crmMergedRecords.push({
          line: i + 2, // +2 for 1-indexed + header
          firstName: record["First Name"] || "",
          lastName: record["Last Name"] || "",
          email: record["Email"] || record["Personal Email"] || "No email",
          tags: tags,
        });
      }

      if (tags.includes("CRMDuplicate")) {
        crmDuplicateCount++;
        crmDuplicateRecords.push({
          line: i + 2, // +2 for 1-indexed + header
          firstName: record["First Name"] || "",
          lastName: record["Last Name"] || "",
          email: record["Email"] || record["Personal Email"] || "No email",
          tags: tags,
        });
      }
    } else {
      recordsWithoutTags++;
    }
  }

  console.log("\n=== TAG COUNTS ===");
  console.log(`Records with CRMMERGED tag: ${crmMergedCount}`);
  console.log(`Records with CRMDuplicate tag: ${crmDuplicateCount}`);
  console.log(`Records with any tags: ${recordsWithTags}`);
  console.log(`Records without tags: ${recordsWithoutTags}`);

  console.log("\n=== DUPLICATE CALCULATION ===");
  console.log(
    `Total duplicate groups: ${crmMergedCount} (each master represents one group)`
  );
  console.log(
    `Total duplicate records: ${crmDuplicateCount} (these should show in dashboard)`
  );
  console.log(
    `Total records affected by duplicates: ${
      crmMergedCount + crmDuplicateCount
    }`
  );

  console.log("\n=== COMPARISON WITH PREVIOUS RESULTS ===");
  console.log(`Simple Duplicate Tagger found: ${crmDuplicateCount} duplicates`);
  console.log(`Our debug script found: 73 duplicates`);
  console.log(`Full Processor reported: 100 duplicates`);
  console.log(`Full Processor actually tagged: 173 duplicates`);

  if (crmDuplicateCount === 73) {
    console.log("✅ Simple tagger matches our debug script!");
  } else {
    console.log("❌ Mismatch with debug script");
  }

  console.log("\n=== SAMPLE CRMMERGED RECORDS ===");
  crmMergedRecords.slice(0, 5).forEach((record, index) => {
    console.log(
      `${index + 1}. Line ${record.line}: ${record.firstName} ${
        record.lastName
      } (${record.email})`
    );
  });

  console.log("\n=== SAMPLE CRMDUPLICATE RECORDS ===");
  crmDuplicateRecords.slice(0, 5).forEach((record, index) => {
    console.log(
      `${index + 1}. Line ${record.line}: ${record.firstName} ${
        record.lastName
      } (${record.email})`
    );
  });

  // Check for any records that have both tags (should not happen)
  const recordsWithBothTags = parsed.data.filter((record) => {
    const tags = record["Tags"] || "";
    return tags.includes("CRMMERGED") && tags.includes("CRMDuplicate");
  });

  if (recordsWithBothTags.length > 0) {
    console.log(
      `\n⚠️  WARNING: ${recordsWithBothTags.length} records have BOTH CRMMERGED and CRMDuplicate tags!`
    );
  } else {
    console.log("\n✅ No records have both tags - tagging logic is clean");
  }
}

analyzeDuplicateTags().catch(console.error);
