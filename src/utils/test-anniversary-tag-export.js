// Test script to verify that records with "CRM Refresh: Home Anniversary" tag are included in exports

class TestProcessor {
  constructor() {
    this.processedData = [
      {
        "First Name": "John",
        "Last Name": "Smith",
        Email: "john@example.com",
        "Changes Made": "Changed email",
        Tags: "Tag1, Tag2",
      },
      {
        "First Name": "Jane",
        "Last Name": "Doe",
        Email: "jane@example.com",
        "Changes Made": "No changes made",
        Tags: "CRM Refresh: Home Anniversary, Client",
      },
      {
        "First Name": "Bob",
        "Last Name": "Jones",
        Email: "bob@example.com",
        "Changes Made": "No changes made",
        Tags: "Tag3, Client",
      },
      {
        "First Name": "Jennifer",
        "Last Name": "Spencer",
        Email: "jenspenx@gmail.com",
        "Changes Made": "No changes made",
        Tags: "crmrefresh, CRM Refresh: Home Anniversary, Buyer, 2023",
      },
    ];

    this.compassData = [
      {
        "First Name": "Alice",
        "Last Name": "Brown",
        Email: "alice@example.com",
        Tags: "CRM Refresh: Home Anniversary, Sphere",
      },
    ];

    this.phoneData = [
      {
        "First Name": "Charlie",
        "Last Name": "White",
        Email: "charlie@example.com",
        Tags: "CRM Refresh: Home Anniversary, Past Client",
      },
    ];
  }

  getChangedRecords() {
    return this.processedData.filter(
      (record) =>
        record["Changes Made"] && record["Changes Made"] !== "No changes made"
    );
  }

  exportChangedRecordsOnly() {
    // Get changed records
    const changedRecords = this.getChangedRecords();

    // Get records with Home Anniversary tag from processed data that aren't already changed
    const processedHomeAnniversaryRecords = this.processedData.filter(
      (record) =>
        record["Tags"] &&
        (record["Tags"].includes("CRM Refresh: Home Anniversary") ||
          record["Tags"].includes("CRM Refresh : Home Anniversary")) &&
        !(
          record["Changes Made"] && record["Changes Made"] !== "No changes made"
        )
    );

    // Also find records with Home Anniversary tag from original Compass data
    const compassHomeAnniversaryRecords = this.compassData
      .filter(
        (record) =>
          record["Tags"] &&
          (record["Tags"].includes("CRM Refresh: Home Anniversary") ||
            record["Tags"].includes("CRM Refresh : Home Anniversary"))
      )
      .map((record) => {
        // Ensure we have a Changes Made field
        return {
          ...record,
          "Changes Made": "Included for Home Anniversary tag",
        };
      });

    // Also find records with Home Anniversary tag from original Phone data
    const phoneHomeAnniversaryRecords = this.phoneData
      .filter(
        (record) =>
          record["Tags"] &&
          (record["Tags"].includes("CRM Refresh: Home Anniversary") ||
            record["Tags"].includes("CRM Refresh : Home Anniversary"))
      )
      .map((record) => {
        // Ensure we have a Changes Made field
        return {
          ...record,
          "Changes Made": "Included for Home Anniversary tag",
        };
      });

    // Create a Set of email addresses to avoid duplicates
    const emailSet = new Set();

    // Add emails from changed records to the set
    changedRecords.forEach((record) => {
      if (record["Email"]) emailSet.add(record["Email"].toLowerCase());
    });

    // Add emails from processed anniversary records to the set
    processedHomeAnniversaryRecords.forEach((record) => {
      if (record["Email"]) emailSet.add(record["Email"].toLowerCase());
    });

    // Filter compass and phone anniversary records to avoid duplicates
    const uniqueCompassRecords = compassHomeAnniversaryRecords.filter(
      (record) => {
        if (!record["Email"]) return true;
        const email = record["Email"].toLowerCase();
        if (emailSet.has(email)) return false;
        emailSet.add(email);
        return true;
      }
    );

    const uniquePhoneRecords = phoneHomeAnniversaryRecords.filter((record) => {
      if (!record["Email"]) return true;
      const email = record["Email"].toLowerCase();
      if (emailSet.has(email)) return false;
      emailSet.add(email);
      return true;
    });

    // Combine all records
    const recordsToExport = [
      ...changedRecords,
      ...processedHomeAnniversaryRecords,
      ...uniqueCompassRecords,
      ...uniquePhoneRecords,
    ];

    return recordsToExport;
  }
}

// Run test
const processor = new TestProcessor();
const changedRecords = processor.getChangedRecords();
const exportedRecords = processor.exportChangedRecordsOnly();

console.log("Total records:", processor.processedData.length);
console.log("Changed records only:", changedRecords.length);
console.log(
  "Exported records (including anniversary tags):",
  exportedRecords.length
);

console.log("\nExported records details:");
exportedRecords.forEach((record, index) => {
  console.log(`\nRecord ${index + 1}:`);
  console.log(`Name: ${record["First Name"]} ${record["Last Name"]}`);
  console.log(`Email: ${record["Email"]}`);
  console.log(`Changes Made: ${record["Changes Made"]}`);
  console.log(`Tags: ${record["Tags"]}`);
});

console.log("\nVerification:");
console.log(
  "- Should include record with changes: " +
    exportedRecords.some((r) => r["First Name"] === "John")
);
console.log(
  "- Should include record with anniversary tag but no changes: " +
    exportedRecords.some((r) => r["First Name"] === "Jane")
);
console.log(
  "- Should include Jennifer Spencer (with anniversary tag): " +
    exportedRecords.some(
      (r) => r["First Name"] === "Jennifer" && r["Last Name"] === "Spencer"
    )
);
console.log(
  "- Should include Alice from Compass data (with anniversary tag): " +
    exportedRecords.some((r) => r["First Name"] === "Alice")
);
console.log(
  "- Should include Charlie from Phone data (with anniversary tag): " +
    exportedRecords.some((r) => r["First Name"] === "Charlie")
);
console.log(
  "- Should NOT include record with no changes and no anniversary tag: " +
    !exportedRecords.some((r) => r["First Name"] === "Bob")
);
