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
        return word
          .split("'")
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join("'");
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
    "llc",
    "inc",
    "ltd",
    "corp",
    "corporation",
    "holdings",
    "enterprises",
    "group",
    "associates",
    "partners",
    "properties",
    "realty",
    "management",
    "services",
    "solutions",
    "trust",
    "investments",
    "fund",
    "capital",
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
    if (tokens.length === 1)
      return { firstName: toTitleCase(tokens[0]), lastName: "" };
    const firstName = toTitleCase(tokens[0]);
    const lastToken = tokens[tokens.length - 1];
    // If the last token is just an initial, use the second-to-last as last name
    const lastName = isInitial(lastToken)
      ? tokens.length >= 3
        ? toTitleCase(tokens[tokens.length - 2])
        : ""
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

// ─── Format rule definitions ──────────────────────────────────────────────

const FORMAT_RULES = [
  {
    id: "pipe",
    label: "Pipe splitting  |",
    desc: 'Split "Last1, First1 | Last2, First2" into separate people',
  },
  {
    id: "ampersand",
    label: "Ampersand splitting  &",
    desc: 'Split "Last, First1 & First2" into separate people sharing the last name',
  },
  {
    id: "inheritLastName",
    label: "Inherit last name across pipe",
    desc: 'When a pipe segment has no comma, inherit the last name from the first segment: "Smith, John | Jane" → Jane Smith',
  },
  {
    id: "stripInitials",
    label: "Strip middle initials",
    desc: 'Remove middle initials: "Smith, John M." → John Smith',
  },
  {
    id: "titleCase",
    label: "Apply title case",
    desc: "Proper casing including McDonald, O'Connor, MacArthur",
  },
  {
    id: "companyDetect",
    label: "Company / trust detection",
    desc: 'Keep "ABC LLC", "John Smith Trust" as a single entity instead of splitting',
  },
];

// Apply rules to produce people from a single raw name string
function applyRules(raw, rules) {
  if (!raw || !raw.trim()) return [];
  const normalized = raw.trim().replace(/\s+/g, " ");

  // Company detection shortcut
  if (rules.companyDetect && isLikelyCompany(normalized)) {
    const name = rules.titleCase ? toTitleCase(normalized) : normalized;
    return [{ firstName: name, lastName: "" }];
  }

  // Helper: apply title case only if rule enabled
  const tc = (s) => (rules.titleCase ? toTitleCase(s) : s);

  // Helper: parse one "Last, First [M.]" or "First [M.] Last" segment
  const parseSingle = (seg) => {
    const s = seg.trim();
    if (!s) return null;
    if (s.includes(",")) {
      const commaIdx = s.indexOf(",");
      const last = s.slice(0, commaIdx).trim();
      const afterComma = s.slice(commaIdx + 1).trim();
      const tokens = afterComma.split(/\s+/).filter(Boolean);
      const first = rules.stripInitials
        ? firstRealWord(tokens)
        : tokens[0] || "";
      return { firstName: tc(first), lastName: tc(last) };
    } else {
      const tokens = s.split(/\s+/).filter(Boolean);
      if (tokens.length === 1)
        return { firstName: tc(tokens[0]), lastName: "" };
      const first = tc(tokens[0]);
      const lastTok = tokens[tokens.length - 1];
      const last =
        rules.stripInitials && isInitial(lastTok)
          ? tokens.length >= 3
            ? tc(tokens[tokens.length - 2])
            : ""
          : tc(lastTok);
      return { firstName: first, lastName: last };
    }
  };

  const people = [];

  // Step 1: split by pipe
  const pipeSegments = rules.pipe ? normalized.split(/\s*\|\s*/) : [normalized];

  let inheritedLast = "";
  if (rules.pipe && pipeSegments[0].includes(",")) {
    inheritedLast = pipeSegments[0].split(",")[0].trim();
  }

  pipeSegments.forEach((segment) => {
    const seg = segment.trim();
    if (!seg) return;

    // Step 2: ampersand splitting within a segment
    if (
      rules.ampersand &&
      seg.includes("&") &&
      !(rules.companyDetect && isLikelyCompany(seg))
    ) {
      let sharedLast = "";
      let firstsPart = seg;

      if (seg.includes(",")) {
        const commaIdx = seg.indexOf(",");
        sharedLast = seg.slice(0, commaIdx).trim();
        firstsPart = seg.slice(commaIdx + 1).trim();
      } else {
        sharedLast = rules.inheritLastName ? inheritedLast : "";
        firstsPart = seg;
      }

      firstsPart.split(/\s*&\s*/).forEach((part) => {
        const tokens = part.trim().split(/\s+/).filter(Boolean);
        const first = rules.stripInitials
          ? firstRealWord(tokens)
          : tokens[0] || "";
        if (first)
          people.push({ firstName: tc(first), lastName: tc(sharedLast) });
      });
    } else {
      // Step 3: single person
      if (!seg.includes(",") && rules.pipe && rules.inheritLastName) {
        // No comma in this pipe segment → inherit last name
        const tokens = seg.split(/\s+/).filter(Boolean);
        const first = rules.stripInitials
          ? firstRealWord(tokens)
          : tokens[0] || "";
        if (first)
          people.push({ firstName: tc(first), lastName: tc(inheritedLast) });
      } else {
        const parsed = parseSingle(seg);
        if (parsed && parsed.firstName) {
          if (parsed.lastName) inheritedLast = parsed.lastName;
          people.push(parsed);
        }
      }
    }

    // Refresh inherited last name after each segment
    if (seg.includes(",")) inheritedLast = seg.split(",")[0].trim();
  });

  return people;
}

// ─── Main component ────────────────────────────────────────────────────────

export default function FormatTests() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [selectedCol, setSelectedCol] = useState("");
  const [mode, setMode] = useState("combined"); // "combined" | "firstlast"
  const [rules, setRules] = useState({
    pipe: true,
    ampersand: true,
    inheritLastName: true,
    stripInitials: true,
    titleCase: true,
    companyDetect: true,
  });
  const [resultRows, setResultRows] = useState([]);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResultRows([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        setRows(data);
        const fields = meta.fields || [];
        setHeaders(fields);
        // Auto-select best column
        const buyerCol = fields.find(
          (h) =>
            h.toLowerCase().includes("buyer") &&
            h.toLowerCase().includes("name"),
        );
        if (buyerCol) {
          setSelectedCol(buyerCol);
          setMode("combined");
        } else if (
          fields.includes("First Name") &&
          fields.includes("Last Name")
        ) {
          setSelectedCol("First Name");
          setMode("firstlast");
        } else {
          setSelectedCol(fields[0] || "");
          setMode("combined");
        }
      },
    });
  }

  function toggleRule(id) {
    setRules((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function runProcessing() {
    if (!rows.length || !selectedCol) return;
    const out = [];
    rows.forEach((row, rowIdx) => {
      if (mode === "combined") {
        const raw = row[selectedCol] ?? "";
        const people = applyRules(raw, rules);
        if (people.length === 0) {
          out.push({
            _srcRow: rowIdx,
            _raw: raw,
            firstName: "",
            lastName: "",
            _empty: true,
          });
        } else {
          people.forEach((p) =>
            out.push({
              _srcRow: rowIdx,
              _raw: raw,
              firstName: p.firstName,
              lastName: p.lastName,
            }),
          );
        }
      } else {
        // firstlast mode: format First Name + Last Name columns separately
        const rawFirst = row["First Name"] ?? "";
        const rawLast = row["Last Name"] ?? "";
        const combined = rawLast.trim()
          ? `${rawLast.trim()}, ${rawFirst.trim()}`
          : rawFirst.trim();
        const people = applyRules(combined, rules);
        const p = people[0] || { firstName: "", lastName: "" };
        out.push({
          _srcRow: rowIdx,
          _raw: `${rawFirst} ${rawLast}`.trim(),
          firstName: p.firstName,
          lastName: p.lastName,
        });
      }
    });
    setResultRows(out);
  }

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

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ marginBottom: 4 }}>Format Tests</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Upload a CSV, select the name column, toggle which format rules apply,
        then click <strong>Run</strong>.
      </p>

      {/* ── Upload ── */}
      <input type="file" accept=".csv" onChange={handleFile} />

      {/* ── Column selector + mode ── */}
      {headers.length > 0 && (
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            alignItems: "flex-start",
          }}
        >
          {/* Column picker */}
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 6,
                fontSize: "0.875rem",
              }}
            >
              Name column to parse
            </label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: 4,
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
              }}
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Mode picker */}
          <div>
            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 6,
                fontSize: "0.875rem",
              }}
            >
              Column format
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              {[
                { val: "combined", label: "Combined  (e.g. Buyer Name)" },
                { val: "firstlast", label: "First Name + Last Name" },
              ].map(({ val, label }) => (
                <label
                  key={val}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    value={val}
                    checked={mode === val}
                    onChange={() => setMode(val)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Format rules checkboxes ── */}
      {headers.length > 0 && (
        <div
          style={{
            marginTop: "1.25rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            padding: "1rem 1.25rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.75rem",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Format rules
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "0.5rem 1.5rem",
            }}
          >
            {FORMAT_RULES.map((rule) => (
              <label
                key={rule.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={rules[rule.id]}
                  onChange={() => toggleRule(rule.id)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span>
                  <strong>{rule.label}</strong>
                  <span style={{ color: "#6b7280", marginLeft: 4 }}>
                    — {rule.desc}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={runProcessing}
            disabled={!selectedCol || !rows.length}
            style={{
              marginTop: "1rem",
              padding: "0.45rem 1.25rem",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            ▶ Run
          </button>
        </div>
      )}

      {/* ── Results table ── */}
      {resultRows.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              margin: "1.25rem 0 0.75rem",
            }}
          >
            <p style={{ margin: 0, color: "#555", fontSize: "0.875rem" }}>
              <strong>{rows.length}</strong> input rows →{" "}
              <strong>{resultRows.length}</strong> people
            </p>
            <button
              onClick={downloadCSV}
              style={{
                padding: "0.4rem 1rem",
                background: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Download CSV
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
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
                {resultRows.slice(0, 300).map((r, i) => (
                  <tr
                    key={i}
                    style={{
                      background: r._empty
                        ? "#fee2e2"
                        : i % 2 === 0
                          ? "white"
                          : "#f9fafb",
                    }}
                  >
                    <td style={td}>{i + 1}</td>
                    <td style={{ ...td, color: "#9ca3af" }}>{r._srcRow + 1}</td>
                    <td
                      style={{ ...td, color: "#6b7280", fontStyle: "italic" }}
                    >
                      {r._raw}
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.firstName}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.lastName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resultRows.length > 300 && (
              <p style={{ color: "#888", marginTop: 8, fontSize: "0.8rem" }}>
                Showing first 300 of {resultRows.length} rows. Download to see
                all.
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
