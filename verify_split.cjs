/**
 * verify_split.js
 *
 * Verifies that splitting a CSV into parts produced zero data changes.
 *
 * Usage:
 *   node verify_split.js "path/to/original.csv" "path/to/parts/dir"
 *
 * The parts directory should contain only the split part files
 * (e.g. original_part_1_of_14.csv ... original_part_14_of_14.csv).
 * It will auto-detect and sort them by part number.
 *
 * What is checked:
 *   1. Every part has the exact same header line as the original
 *   2. The total data rows across all parts equals the original data rows
 *   3. Every data row, in order, matches the original exactly (byte-for-byte)
 *   4. No part exceeds 1999 data rows
 *   5. No row from the original is missing
 *   6. No extra rows exist in the parts that aren't in the original
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Same quote-aware line splitter used in the Splitter component.
 * Handles embedded newlines inside quoted fields correctly.
 */
function splitLines(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if (ch === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/**
 * Read a CSV file and return { header, dataLines[] } using the same
 * normalisation (CRLF → LF) that the splitter applies.
 */
function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const normalized = raw.replace(/\r\n/g, "\n");
  const lines = splitLines(normalized);
  if (lines.length === 0) return { header: "", dataLines: [] };
  return {
    header: lines[0],
    dataLines: lines.slice(1),
  };
}

// ---------------------------------------------------------------------------
// ANSI colour helpers for readable output
// ---------------------------------------------------------------------------
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const [, , originalArg, partsDirArg] = process.argv;

if (!originalArg || !partsDirArg) {
  console.error(
    'Usage: node verify_split.js "original.csv" "path/to/parts/dir"'
  );
  process.exit(1);
}

const originalPath = path.resolve(originalArg);
const partsDir = path.resolve(partsDirArg);

if (!fs.existsSync(originalPath)) {
  console.error(RED(`Original file not found: ${originalPath}`));
  process.exit(1);
}
if (!fs.existsSync(partsDir)) {
  console.error(RED(`Parts directory not found: ${partsDir}`));
  process.exit(1);
}

// Find all part files in the directory, sorted by part number
const allFiles = fs.readdirSync(partsDir).filter((f) => f.endsWith(".csv"));

// Sort by the _part_N_ number embedded in the filename
const partFiles = allFiles
  .filter((f) => /_part_\d+/.test(f))
  .sort((a, b) => {
    const numA = parseInt(a.match(/_part_(\d+)/)[1], 10);
    const numB = parseInt(b.match(/_part_(\d+)/)[1], 10);
    return numA - numB;
  })
  .map((f) => path.join(partsDir, f));

if (partFiles.length === 0) {
  console.error(RED(`No part files found in: ${partsDir}`));
  process.exit(1);
}

console.log(BOLD("\n=== CSV Split Verification ===\n"));
console.log(`Original : ${originalPath}`);
console.log(`Parts dir: ${partsDir}`);
console.log(`Parts found: ${partFiles.length}\n`);

// ---------------------------------------------------------------------------
// Read original
// ---------------------------------------------------------------------------
console.log("Reading original file...");
const original = readCsv(originalPath);
console.log(
  `  Header columns : ${original.header.split(",").length}`
);
console.log(`  Data rows       : ${original.dataLines.length}\n`);

// ---------------------------------------------------------------------------
// Read all parts and run checks
// ---------------------------------------------------------------------------
let allPassed = true;
const errors = [];
const warnings = [];

let combinedDataLines = [];

for (const partPath of partFiles) {
  const partName = path.basename(partPath);
  const part = readCsv(partPath);

  // Check 1: header must be byte-for-byte identical
  if (part.header !== original.header) {
    allPassed = false;
    errors.push(
      `${partName}: HEADER MISMATCH\n` +
        `  Original : ${original.header.slice(0, 120)}...\n` +
        `  Part     : ${part.header.slice(0, 120)}...`
    );
  }

  // Check 2: no part should exceed 1999 data rows
  if (part.dataLines.length > 1999) {
    allPassed = false;
    errors.push(
      `${partName}: EXCEEDS 1999 rows — has ${part.dataLines.length} data rows`
    );
  }

  // Check 3: no part should be empty (0 data rows)
  if (part.dataLines.length === 0) {
    warnings.push(`${partName}: WARNING — part has 0 data rows`);
  }

  combinedDataLines.push(...part.dataLines);

  console.log(
    `  ${partName.padEnd(55)} ${part.dataLines.length} rows  header=${
      part.header === original.header ? GREEN("OK") : RED("MISMATCH")
    }`
  );
}

// ---------------------------------------------------------------------------
// Check 4: total row count must match
// ---------------------------------------------------------------------------
console.log("");
if (combinedDataLines.length !== original.dataLines.length) {
  allPassed = false;
  errors.push(
    `ROW COUNT MISMATCH: original has ${original.dataLines.length} rows, ` +
      `parts total ${combinedDataLines.length} rows ` +
      `(difference: ${combinedDataLines.length - original.dataLines.length})`
  );
} else {
  console.log(
    GREEN(`✓ Row count matches: ${original.dataLines.length} rows in both original and parts`)
  );
}

// ---------------------------------------------------------------------------
// Check 5: every row, in order, must be byte-for-byte identical
// ---------------------------------------------------------------------------
console.log("Comparing rows byte-for-byte...");
let firstMismatch = -1;
const mismatches = [];

const limit = Math.min(original.dataLines.length, combinedDataLines.length);
for (let i = 0; i < limit; i++) {
  if (original.dataLines[i] !== combinedDataLines[i]) {
    if (firstMismatch === -1) firstMismatch = i + 1; // 1-based row number
    mismatches.push(i + 1);
    if (mismatches.length <= 5) {
      // Show detail for first 5 mismatches only
      errors.push(
        `Row ${i + 1} MISMATCH:\n` +
          `  Original: ${original.dataLines[i].slice(0, 200)}\n` +
          `  Parts   : ${combinedDataLines[i].slice(0, 200)}`
      );
    }
  }
}

if (mismatches.length > 5) {
  errors.push(`...and ${mismatches.length - 5} more mismatched rows`);
}

if (mismatches.length === 0 && combinedDataLines.length === original.dataLines.length) {
  console.log(GREEN("✓ All rows match byte-for-byte\n"));
} else if (mismatches.length > 0) {
  allPassed = false;
  console.log(RED(`✗ ${mismatches.length} row(s) do not match\n`));
}

// ---------------------------------------------------------------------------
// Print warnings
// ---------------------------------------------------------------------------
if (warnings.length > 0) {
  console.log(YELLOW("Warnings:"));
  warnings.forEach((w) => console.log(YELLOW(`  ⚠ ${w}`)));
  console.log("");
}

// ---------------------------------------------------------------------------
// Print errors
// ---------------------------------------------------------------------------
if (errors.length > 0) {
  console.log(RED("Errors:"));
  errors.forEach((e) => console.log(RED(`  ✗ ${e}\n`)));
}

// ---------------------------------------------------------------------------
// Final verdict
// ---------------------------------------------------------------------------
console.log("─".repeat(60));
if (allPassed) {
  console.log(GREEN(BOLD("✓ PASSED — Split is a perfect, data-intact copy of the original")));
} else {
  console.log(RED(BOLD("✗ FAILED — Data integrity issues found (see errors above)")));
  process.exit(1);
}
console.log("");
