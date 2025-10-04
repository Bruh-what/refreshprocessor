// Script to count duplicates in Compass contacts based on first and last name matches
import fs from "fs";
import Papa from "papaparse";

const filePath = "./src/pages/Erica Covelle - Compass Contacts.csv";

function normalizeName(firstName, lastName) {
  const first = (firstName || "").toLowerCase().trim();
  const last = (lastName || "").toLowerCase().trim();
  return `${first}|${last}`;
}

function analyzeDuplicates() {
  console.log("=== DUPLICATE ANALYSIS ===");

  try {
    const csvData = fs.readFileSync(filePath, "utf8");
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      console.log("Parse errors:", parsed.errors);
    }

    const records = parsed.data;
    console.log(`Total records in file: ${records.length}`);

    // Track names and their occurrences
    const nameMap = new Map();

    let recordsWithNames = 0;
    let recordsWithoutNames = 0;

    // First pass - count all name occurrences
    records.forEach((record, index) => {
      const firstName = (record["First Name"] || "").trim();
      const lastName = (record["Last Name"] || "").trim();

      if (!firstName && !lastName) {
        recordsWithoutNames++;
        return;
      }

      recordsWithNames++;
      const normalizedName = normalizeName(firstName, lastName);

      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, []);
      }

      nameMap.get(normalizedName).push({
        index: index + 1, // CSV line number (1-based)
        firstName,
        lastName,
        createdAt: record["Created At"],
        email:
          record["Primary Work Email"] ||
          record["Primary Email"] ||
          record["Primary Personal Email"],
        tags: record["Tags"],
      });
    });

    console.log(`Records with names: ${recordsWithNames}`);
    console.log(`Records without names: ${recordsWithoutNames}`);

    // Find duplicates (names that appear more than once)
    let totalDuplicates = 0;
    let duplicateGroups = 0;
    let masterRecords = 0;

    console.log("\n=== DUPLICATE GROUPS ===");

    nameMap.forEach((contacts, normalizedName) => {
      if (contacts.length > 1) {
        duplicateGroups++;
        masterRecords++; // One master per group
        totalDuplicates += contacts.length - 1; // All others are duplicates

        console.log(
          `\nGroup ${duplicateGroups}: "${contacts[0].firstName} ${contacts[0].lastName}" (${contacts.length} records)`
        );
        contacts.forEach((contact, idx) => {
          const role = idx === 0 ? "[MASTER]" : "[DUPLICATE]";
          console.log(
            `  ${role} Line ${contact.index}: Created ${contact.createdAt} | ${
              contact.email || "No email"
            } | Tags: ${contact.tags || "None"}`
          );
        });
      }
    });

    console.log("\n=== SUMMARY ===");
    console.log(`Total duplicate groups found: ${duplicateGroups}`);
    console.log(`Master records (1 per group): ${masterRecords}`);
    console.log(`Pure duplicate records: ${totalDuplicates}`);
    console.log(
      `Total records that will have duplicate tags: ${totalDuplicates}`
    );

    // Show some statistics
    const singletonNames = Array.from(nameMap.values()).filter(
      (contacts) => contacts.length === 1
    ).length;
    console.log(`Unique names (no duplicates): ${singletonNames}`);
    console.log(`Names with duplicates: ${duplicateGroups}`);

    // Show largest duplicate groups
    const sortedGroups = Array.from(nameMap.entries())
      .filter(([name, contacts]) => contacts.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    console.log("\n=== TOP 10 LARGEST DUPLICATE GROUPS ===");
    sortedGroups.forEach(([normalizedName, contacts], idx) => {
      const [first, last] = normalizedName.split("|");
      console.log(
        `${idx + 1}. "${first} ${last}": ${contacts.length} records (${
          contacts.length - 1
        } duplicates)`
      );
    });

    return {
      totalRecords: records.length,
      recordsWithNames,
      duplicateGroups,
      masterRecords,
      totalDuplicates,
      expectedDashboardCount: totalDuplicates,
    };
  } catch (error) {
    console.error("Error reading or parsing file:", error);
    return null;
  }
}

// Run the analysis
const result = analyzeDuplicates();

if (result) {
  console.log("\n=== EXPECTED DASHBOARD RESULT ===");
  console.log(
    `The dashboard should show: ${result.expectedDashboardCount} "Duplicates Tagged"`
  );
  console.log(
    `(This represents the pure duplicate records, not counting the master records)`
  );
}
