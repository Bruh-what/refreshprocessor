import fs from "fs";

// Read the JSON file
const data = JSON.parse(
  fs.readFileSync("extracted_domains/agents_and_vendors_domains.json", "utf8")
);

// Create CSV content
let csvContent = "Category,Domain\n";

// Add all agent domains
data.agents.forEach((domain) => {
  csvContent += `Agent,${domain}\n`;
});

// Add all vendor domains
data.vendors.forEach((domain) => {
  csvContent += `Vendor,${domain}\n`;
});

// Write to CSV file
fs.writeFileSync(
  "extracted_domains/agents_and_vendors_domains.csv",
  csvContent
);

console.log("✅ CSV file created successfully!");
console.log(`📊 Total entries: ${data.agents.length + data.vendors.length}`);
console.log(`   - Agent domains: ${data.agents.length}`);
console.log(`   - Vendor domains: ${data.vendors.length}`);
console.log("💾 Saved as: extracted_domains/agents_and_vendors_domains.csv");
