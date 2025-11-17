import fs from "fs";
import Papa from "papaparse";

// Files to process
const FILES = [
  "src/components/Ben Faber - Manually Grouped - Ben Faber - Merged FINAL IMPORT.csv",
  "src/components/Beth Drewett - Manually Grouped - Copy of Beth Drewett - Merged FINAL IMPORT.csv",
  "src/components/Ellen Silverman - Manually Grouped - Ungrouped _ Grouped.csv",
  "src/components/Jessica Evans - Manually Grouped - Ungrouped _ Grouped.csv",
  "src/components/Michelle Ozanne - Manually Grouped - Ungrouped _ Grouped.csv",
];

// Store domains by category
const domainsByCategory = {
  Agents: new Set(),
  Vendors: new Set(),
  Leads: new Set(),
  "Active clients": new Set(),
  "Past clients": new Set(),
  Other: new Set(),
};

// Email field names to check
const EMAIL_FIELDS = [
  "Email",
  "Primary Email",
  "Work Email",
  "Work Email 2",
  "Work Email 3",
  "Work Email 4",
  "Personal Email",
  "Personal Email 2",
  "Personal Email 3",
  "Primary Personal Email",
  "Primary Work Email",
  "Primary Home Email",
  "Primary Other Email",
  "Custom Email",
  "Custom Email 2",
  "Custom Email 3",
  "Other Email",
  "other Email",
  "other Email 2",
  "other Email 3",
  "work Email",
  "home Email",
  "personal Email",
  "Email 2",
  "Email 3",
  "Email 4",
  "Email 5",
  "Email 6",
  "Email 7",
  "Email 8",
  "Email 9",
  "Email 10",
  "Email 11",
  "Email 12",
  "Email 13",
  "Email 14",
  "Email 15",
  "Email 16",
  "Email 17",
  "Email 18",
  "Email 19",
  "Email 20",
  "Email 21",
  "Obsolete Email",
];

// Personal email domains to exclude
const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "live.com",
  "msn.com",
  "ymail.com",
  "rocketmail.com",
  "att.net",
  "verizon.net",
  "comcast.net",
  "sbcglobal.net",
  "earthlink.net",
  "optonline.net",
  "bellsouth.net",
]);

// Extract domain from email
function getDomain(email) {
  if (!email || typeof email !== "string") return null;

  email = email.trim().toLowerCase();

  // Skip invalid emails
  if (!email.includes("@")) return null;
  if (email.includes(" ")) return null;

  const parts = email.split("@");
  if (parts.length !== 2) return null;

  const domain = parts[1];

  // Skip obviously invalid domains
  if (domain.length < 3) return null;
  if (!domain.includes(".")) return null;

  // Skip craigslist reply addresses
  if (domain.includes("craigslist.org")) return null;

  // Skip system-generated domains
  if (domain.includes("honeybook.com")) return null;
  if (domain.includes("skyslope.com")) return null;
  if (domain.includes("rezenfilecabinet.com")) return null;
  if (domain.includes("iconengine.net")) return null;

  return domain;
}

// Get all emails from a contact
function getAllEmails(contact) {
  const emails = [];

  for (const field of EMAIL_FIELDS) {
    if (contact[field]) {
      const email = contact[field].trim();
      if (email && email.includes("@")) {
        emails.push(email);
      }
    }
  }

  return emails;
}

// Determine category from Groups field
function getCategory(contact) {
  const groups = (contact["Groups"] || contact["Group"] || "").trim();

  if (groups.includes("Agents")) return "Agents";
  if (groups.includes("Vendors")) return "Vendors";
  if (groups.includes("Leads")) return "Leads";
  if (groups.includes("Active clients")) return "Active clients";
  if (groups.includes("Past clients")) return "Past clients";

  return "Other";
}

// Process a single file
function processFile(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  try {
    const csvContent = fs.readFileSync(filePath, "utf8");
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    let processedCount = 0;
    let agentDomainsFound = 0;
    let vendorDomainsFound = 0;

    for (const contact of parsed.data) {
      const category = getCategory(contact);
      const emails = getAllEmails(contact);

      if (emails.length === 0) continue;

      processedCount++;

      for (const email of emails) {
        const domain = getDomain(email);

        if (!domain) continue;

        // Skip personal domains
        if (PERSONAL_DOMAINS.has(domain)) continue;

        // Add to appropriate category
        const beforeSize = domainsByCategory[category].size;
        domainsByCategory[category].add(domain);

        if (domainsByCategory[category].size > beforeSize) {
          if (category === "Agents") agentDomainsFound++;
          if (category === "Vendors") vendorDomainsFound++;
        }
      }
    }

    console.log(`   ✓ Processed ${processedCount} contacts`);
    console.log(`   ✓ Found ${agentDomainsFound} new agent domains`);
    console.log(`   ✓ Found ${vendorDomainsFound} new vendor domains`);
  } catch (error) {
    console.error(`   ✗ Error processing file: ${error.message}`);
  }
}

// Main execution
console.log("🔍 Extracting domains from manually categorized contacts...\n");
console.log("=".repeat(60));

// Process all files
for (const file of FILES) {
  processFile(file);
}

console.log("\n" + "=".repeat(60));
console.log("\n📊 RESULTS:\n");

// Sort and display results
for (const [category, domains] of Object.entries(domainsByCategory)) {
  if (domains.size === 0) continue;

  const sortedDomains = Array.from(domains).sort();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${category.toUpperCase()} (${sortedDomains.length} domains)`);
  console.log("=".repeat(60));

  sortedDomains.forEach((domain) => {
    console.log(`  ${domain}`);
  });
}

// Save to JSON files for easy import
const outputDir = "extracted_domains";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (const [category, domains] of Object.entries(domainsByCategory)) {
  if (domains.size === 0) continue;

  const sortedDomains = Array.from(domains).sort();
  const fileName = `${outputDir}/${category
    .toLowerCase()
    .replace(" ", "_")}_domains.json`;

  fs.writeFileSync(fileName, JSON.stringify(sortedDomains, null, 2));
  console.log(`\n💾 Saved ${fileName}`);
}

// Also create a combined file for agents and vendors only
const agentDomains = Array.from(domainsByCategory.Agents).sort();
const vendorDomains = Array.from(domainsByCategory.Vendors).sort();

const combinedOutput = {
  agents: agentDomains,
  vendors: vendorDomains,
  stats: {
    totalAgentDomains: agentDomains.length,
    totalVendorDomains: vendorDomains.length,
    extractedFrom: FILES,
    extractedAt: new Date().toISOString(),
  },
};

fs.writeFileSync(
  `${outputDir}/agents_and_vendors_domains.json`,
  JSON.stringify(combinedOutput, null, 2)
);

console.log(`\n💾 Saved ${outputDir}/agents_and_vendors_domains.json`);
console.log("\n✅ Domain extraction complete!\n");

// Summary
console.log("\n" + "=".repeat(60));
console.log("SUMMARY");
console.log("=".repeat(60));
console.log(`Agent domains: ${agentDomains.length}`);
console.log(`Vendor domains: ${vendorDomains.length}`);
console.log(
  `Total business domains: ${agentDomains.length + vendorDomains.length}`
);
console.log("=".repeat(60) + "\n");
