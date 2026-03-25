import React, { useState } from "react";
import Papa from "papaparse";

// ─── Name formatting helpers ───────────────────────────────────────────────

// Proper title case: handles McDonald, O'Connor, MacArthur
function toTitleCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      if (word.includes("'")) {
        return word.split("'").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("'");
      }
      if (word.toLowerCase().startsWith("mc") && word.length > 2)
        return "Mc" + word.charAt(2).toUpperCase() + word.slice(3);
      if (word.toLowerCase().startsWith("mac") && word.length > 3)
        return "Mac" + word.charAt(3).toUpperCase() + word.slice(4);
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// Returns true if a token is a middle initial (single letter or "X.")
function isInitial(token) {
  return token.length === 1 || (token.length === 2 && token.endsWith("."));
}

// Extract the first NON-initial word from an array of tokens
function firstRealWord(tokens) {
  for (const t of tokens) {
    if (!isInitial(t)) return t;
  }
  return tokens[0] || "";
}

// Detect if a name is likely a company/trust (keep as-is)
function isLikelyCompany(name) {
  const businessTerms = [
    "llc","inc","ltd","corp","corporation","holdings","enterprises",
    "group","associates","partners","properties","realty","management",
    "services","solutions","trust","investments","fund","capital",
  ];
  const lower = name.toLowerCase();
  for (const term of businessTerms) {
    if (lower.includes(term)) return true;
  }
  // 3+ words with no comma → likely a company
  if (!name.includes(",") && name.split(/\s+/).length > 2) return true;
  return false;
}

/**
 * Parse ONE individual's name string (no pipes, no ampersands at this point).
 * Supported formats:
 *   "Last, First"
 *   "Last, First M."
 *   "First Last"
 *   "First M. Last"
 *
 * Returns { firstName, lastName }
 */
function parseOnePerson(raw) {
  const name = raw.trim();
  if (!name) return { firstName: "", lastName: "" };

  if (isLikelyCompany(name)) {
    return { firstName: toTitleCase(name), lastName: "" };
  }

  if (name.includes(",")) {
    // "Last, First [M.]"
    const commaIdx = name.indexOf(",");
    const lastPart = name.slice(0, commaIdx).trim();
    const afterComma = name.slice(commaIdx + 1).trim();
    const tokens = afterComma.split(/\s+/).filter(Boolean);
    const firstName = toTitleCase(firstRealWord(tokens));
    const lastName = toTitleCase(lastPart);
    return { firstName, lastName };
  } else {
    // "First [M.] Last" — first token = first name, last token = last name (skip if initial)
    const tokens = name.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) return { firstName: toTitleCase(tokens[0]), lastName: "" };
    const firstName = toTitleCase(tokens[0]);
    const lastToken = tokens[tokens.length - 1];
    // If the last token is just an initial, use the second-to-last as last name
    const lastName = isInitial(lastToken)
      ? tokens.length >= 3 ? toTitleCase(tokens[tokens.length - 2]) : ""
      : toTitleCase(lastToken);
    return { firstName, lastName };
  }
}

/**
 * Main entry point: splits a raw buyer name field into individual people.
 *
 * Handles all formats:
 *   "Last, First"
 *   "Last, First M."
 *   "Last, First1 & First2"
 *   "Last, First1 M1. & First2"
 *   "Last, First1 & First2 M2."
 *   "Last, First1 M1. & First2 M2."
 *   "Last1, First1 | Last2, First2"
 *   "Last1, First1 | First2 M2."          ← pipe without second last name → inherit Last1
 *   "Last1, First1 M1. | Last2, First2"
 *   "Last1, First1 | Last2, First2 M2."
 *   "Last1, First1 M1. | Last2, First2 M2."
 *
 * Returns an array of { firstName, lastName }
 */
function splitBuyerName(raw) {
  if (!raw || !raw.trim()) return [];
  const normalized = raw.trim().replace(/\s+/g, " ");

  if (isLikelyCompany(normalized) && normalized.includes("&")) {
    return [{ firstName: toTitleCase(normalized), lastName: "" }];
  }

  // ── Step 1: split by pipe ──────────────────────────────────────────────
  const pipeSegments = normalized.split(/\s*\|\s*/);

  // We need to track the "inherited" last name for segments without a comma
  let inheritedLastName = "";

  // First pass: determine inherited last name from the first pipe segment
  if (pipeSegments[0].includes(",")) {
    inheritedLastName = pipeSegments[0].split(",")[0].trim();
  }

  const people = [];

  pipeSegments.forEach((segment) => {
    const seg = segment.trim();
    if (!seg) return;

    // ── Step 2: within a pipe segment, check for ampersand ──────────────
    if (seg.includes("&") && !isLikelyCompany(seg)) {
      // Determine the shared last name for this segment
      let sharedLast = "";
      let firstPart = seg;

      if (seg.includes(",")) {
        const commaIdx = seg.indexOf(",");
        sharedLast = seg.slice(0, commaIdx).trim();
        firstPart = seg.slice(commaIdx + 1).trim();
      } else {
        // No comma in this segment — use inherited last name
        sharedLast = inheritedLastName;
        firstPart = seg;
      }

      // Split by & to get individual first-name [initial] parts
      const ampParts = firstPart.split(/\s*&\s*/);
      ampParts.forEach((part) => {
        const tokens = part.trim().split(/\s+/).filter(Boolean);
        const firstName = toTitleCase(firstRealWord(tokens));
        if (firstName) {
          people.push({ firstName, lastName: toTitleCase(sharedLast) });
        }
      });
    } else {
      // ── Step 3: single person in this segment ───────────────────────
      if (!seg.includes(",")) {
        // No comma — could be "First2 M2." sharing the last name from the first segment
        const tokens = seg.split(/\s+/).filter(Boolean);
        const firstName = toTitleCase(firstRealWord(tokens));
        if (firstName) {
          people.push({ firstName, lastName: toTitleCase(inheritedLastName) });
        }
      } else {
        const parsed = parseOnePerson(seg);
        if (parsed.firstName) {
          // Update inherited last name for subsequent pipe segments without a comma
          if (parsed.lastName) inheritedLastName = parsed.lastName;
          people.push(parsed);
        }
      }
    }

    // Update inheritedLastName after processing this segment (in case it had a comma)
    if (seg.includes(",")) {
      inheritedLastName = seg.split(",")[0].trim();
    }
  });

  return people;
}

// ─── Main component ────────────────────────────────────────────────────────

export default function FormatTests() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        setRows(data);
        setHeaders(meta.fields || []);
      },
    });
  }

  // Detect which mode we're in based on CSV columns
  // Mode A: has a "Buyer Name" (or similar) raw combined field → split + parse
  // Mode B: has "First Name" / "Last Name" columns → format in place
  const buyerNameCol = headers.find(
    (h) => h.toLowerCase().includes("buyer") && h.toLowerCase().includes("name")
  );
  const hasFirstLast =
    headers.includes("First Name") && headers.includes("Last Name");

  // Build result rows
  const resultRows = [];
  rows.forEach((row, rowIdx) => {
    if (buyerNameCol) {
      // Mode A — split raw buyer name into individual people
      const raw = row[buyerNameCol] ?? "";
      const people = splitBuyerName(raw);
      if (people.length === 0) {
        resultRows.push({ _srcRow: rowIdx, _raw: raw, firstName: "", lastName: "", _empty: true });
      } else {
        people.forEach((p) => {
          resultRows.push({ _srcRow: rowIdx, _raw: raw, firstName: p.firstName, lastName: p.lastName });
        });
      }
    } else if (hasFirstLast) {
      // Mode B — format existing First/Last Name columns
      const rawFirst = row["First Name"] ?? "";
      const rawLast = row["Last Name"] ?? "";
      const parsed = parseOnePerson(`${rawLast}, ${rawFirst}`);
      resultRows.push({
        _srcRow: rowIdx,
        _raw: `${rawFirst} ${rawLast}`.trim(),
        firstName: parsed.firstName,
        lastName: parsed.lastName,
      });
    }
  });

  function downloadCSV() {
    const data = resultRows.map((r) => ({
      "Source Row": r._srcRow + 1,
      "Raw Input": r._raw,
      "First Name": r.firstName,
      "Last Name": r.lastName,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted_${fileName || "output.csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mode = buyerNameCol ? "buyer" : hasFirstLast ? "firstlast" : "unknown";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ marginBottom: 4 }}>Format Tests</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Upload a CSV to test name parsing. If the file has a <strong>Buyer Name</strong> column,
        it will split and parse all name formats. If it has <strong>First Name / Last Name</strong>{" "}
        columns, it will format them in place.
      </p>

      <input type="file" accept=".csv" onChange={handleFile} />

      {rows.length > 0 && mode === "unknown" && (
        <p style={{ color: "#dc2626", marginTop: "1rem" }}>
          ⚠️ Could not detect a "Buyer Name" or "First Name"/"Last Name" column. Columns found:{" "}
          <em>{headers.join(", ")}</em>
        </p>
      )}

      {resultRows.length > 0 && mode !== "unknown" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.25rem 0 0.75rem" }}>
            <p style={{ margin: 0, color: "#555" }}>
              <strong>{rows.length}</strong> input rows →{" "}
              <strong>{resultRows.length}</strong> people from{" "}
              <strong>{fileName}</strong>
              {" "}
              <span style={{ fontSize: "0.8rem", background: "#e0f2fe", padding: "2px 8px", borderRadius: 4 }}>
                Mode: {mode === "buyer" ? `Buyer Name column ("${buyerNameCol}")` : "First Name / Last Name columns"}
              </span>
            </p>
            <button
              onClick={downloadCSV}
              style={{
                padding: "0.4rem 1rem",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
              }}
            >
              Download CSV
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={th}>#</th>
                  <th style={th}>Src Row</th>
                  <th style={th}>Raw Input</th>
                  <th style={th}>First Name</th>
                  <th style={th}>Last Name</th>
                </tr>
              </thead>
              <tbody>
                {resultRows.slice(0, 300).map((r, i) => {
                  const isEmpty = r._empty;
                  return (
                    <tr
                      key={i}
                      style={{ background: isEmpty ? "#fee2e2" : i % 2 === 0 ? "white" : "#f9fafb" }}
                    >
                      <td style={td}>{i + 1}</td>
                      <td style={{ ...td, color: "#9ca3af" }}>{r._srcRow + 1}</td>
                      <td style={{ ...td, color: "#6b7280", fontStyle: "italic" }}>{r._raw}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.firstName}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{r.lastName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {resultRows.length > 300 && (
              <p style={{ color: "#888", marginTop: 8, fontSize: "0.8rem" }}>
                Showing first 300 of {resultRows.length} rows. Download to see all.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const th = {
  border: "1px solid #e5e7eb",
  padding: "0.5rem 0.75rem",
  textAlign: "left",
  fontWeight: 600,
};

const td = {
  border: "1px solid #e5e7eb",
  padding: "0.4rem 0.75rem",
};
