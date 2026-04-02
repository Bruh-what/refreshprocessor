const fs = require("fs");
const path = require("path");

// Read the CSV manually (no external deps needed for this test)
const filePath = path.join(
  __dirname,
  "src/components/Sarah Hake - Compass Contacts COMPLETE - Sarah Hake - Compass Contacts COMPLETE.csv"
);

const raw = fs.readFileSync(filePath, "utf8");
const lines = raw.split("\n");

// Parse header
const header = lines[0].split(",");
const firstNameIdx = header.indexOf("First Name");
const lastNameIdx = header.indexOf("Last Name");

console.log(`Header found "First Name" at index: ${firstNameIdx}`);
console.log(`Header found "Last Name" at index: ${lastNameIdx}`);
console.log(`Total lines in file (including header): ${lines.length}`);
console.log(`Total data rows: ${lines.length - 1}\n`);

let totalRows = 0;
let hasFirstOnly = 0;
let hasLastOnly = 0;
let hasBoth = 0;
let hasNeither = 0;

// Sample rows with neither name (up to 5 examples)
const neitherExamples = [];
// Sample rows with only first name
const firstOnlyExamples = [];
// Sample rows with only last name
const lastOnlyExamples = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue; // skip blank lines
  totalRows++;

  // Simple CSV split (handles basic cases — no quoted commas needed for name fields)
  const cols = line.split(",");
  const firstName = (cols[firstNameIdx] || "").trim();
  const lastName = (cols[lastNameIdx] || "").trim();

  if (firstName && lastName) {
    hasBoth++;
  } else if (firstName && !lastName) {
    hasFirstOnly++;
    if (firstOnlyExamples.length < 5) firstOnlyExamples.push({ firstName, lastName, row: i + 1 });
  } else if (!firstName && lastName) {
    hasLastOnly++;
    if (lastOnlyExamples.length < 5) lastOnlyExamples.push({ firstName, lastName, row: i + 1 });
  } else {
    hasNeither++;
    if (neitherExamples.length < 5) neitherExamples.push({ row: i + 1, preview: line.slice(0, 80) });
  }
}

console.log("=== NAME ANALYSIS RESULTS ===");
console.log(`Total non-blank data rows parsed:  ${totalRows}`);
console.log(`Has BOTH first + last name:        ${hasBoth}  (these pass the filter)`);
console.log(`Has FIRST name only:               ${hasFirstOnly}  (these pass the filter)`);
console.log(`Has LAST name only:                ${hasLastOnly}  (these pass the filter)`);
console.log(`Has NEITHER (both empty):          ${hasNeither}  (these get DROPPED)`);
console.log(`\nTotal kept by current filter:      ${hasBoth + hasFirstOnly + hasLastOnly}`);
console.log(`Total dropped by current filter:   ${hasNeither}`);

if (neitherExamples.length > 0) {
  console.log("\n--- Sample rows with NO names (dropped) ---");
  neitherExamples.forEach((e) => console.log(`  Row ${e.row}: ${e.preview}`));
}

if (firstOnlyExamples.length > 0) {
  console.log("\n--- Sample rows with FIRST name only ---");
  firstOnlyExamples.forEach((e) => console.log(`  Row ${e.row}: First="${e.firstName}"`));
}

if (lastOnlyExamples.length > 0) {
  console.log("\n--- Sample rows with LAST name only ---");
  lastOnlyExamples.forEach((e) => console.log(`  Row ${e.row}: Last="${e.lastName}"`));
}
