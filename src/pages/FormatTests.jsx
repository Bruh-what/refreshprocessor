import React, { useState } from "react";
import Papa from "papaparse";

// ─── Name formatting helpers (mirrors CsvFormatter logic exactly) ──────────

function toTitleCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      // Handle special cases like "McDonald", "O'Connor"
      if (word.includes("'")) {
        return word
          .split("'")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("'");
      }
      if (word.toLowerCase().startsWith("mc") && word.length > 2) {
        return "Mc" + word.charAt(2).toUpperCase() + word.slice(3);
      }
      if (word.toLowerCase().startsWith("mac") && word.length > 3) {
        return "Mac" + word.charAt(3).toUpperCase() + word.slice(4);
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// Strips leading/trailing initials and applies title case
function cleanNameForOutput(name, isFirstName = true) {
  if (!name || typeof name !== "string") return name;

  let cleanedName;

  if (isFirstName) {
    const parts = name.trim().split(/\s+/);
    cleanedName = parts[0];
    // If first part is just an initial, try to find the next substantial part
    if (
      parts.length > 1 &&
      (parts[0].length === 1 ||
        (parts[0].length === 2 && parts[0].endsWith(".")))
    ) {
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].length > 1 && !parts[i].endsWith(".")) {
          cleanedName = parts[i];
          break;
        }
      }
    }
  } else {
    // Last name: remove leading initials
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) {
      cleanedName = name;
    } else if (
      parts[0].length === 1 ||
      (parts[0].length === 2 && parts[0].endsWith("."))
    ) {
      cleanedName = parts.slice(1).join(" ");
    } else {
      cleanedName = name;
    }
  }

  return toTitleCase(cleanedName);
}

// Parses a single name string into { firstName, lastName }
// Handles "Last, First", "First Last", "First Middle Last", initials, etc.
function parseIndividualName(name) {
  if (!name || typeof name !== "string") {
    return { firstName: "", lastName: "", isValid: false };
  }

  let firstName = "";
  let lastName = "";

  if (name.includes(",")) {
    // "Last, First Middle" format
    const [lastPart, firstPart] = name.split(",").map((p) => p.trim());
    lastName = toTitleCase(lastPart);

    if (firstPart) {
      const firstParts = firstPart.split(/\s+/);
      let cleanFirstName = firstParts[0] || "";
      // Skip leading initial
      if (
        firstParts.length > 1 &&
        (firstParts[0].length === 1 ||
          (firstParts[0].length === 2 && firstParts[0].endsWith(".")))
      ) {
        for (let i = 1; i < firstParts.length; i++) {
          if (firstParts[i].length > 1 && !firstParts[i].endsWith(".")) {
            cleanFirstName = firstParts[i];
            break;
          }
        }
      }
      firstName = toTitleCase(cleanFirstName);
    }
  } else {
    // "First Last" or "First Middle Last" format
    const parts = name.split(/\s+/).filter((p) => p.length > 0);
    if (parts.length >= 2) {
      firstName = toTitleCase(parts[0]);
      const lastPart = parts[parts.length - 1];
      // If the last part is just an initial, step back
      if (
        lastPart.length === 1 ||
        (lastPart.length === 2 && lastPart.endsWith("."))
      ) {
        lastName =
          parts.length >= 3 ? toTitleCase(parts[parts.length - 2]) : "";
      } else {
        lastName = toTitleCase(lastPart);
      }
    } else if (parts.length === 1) {
      firstName = toTitleCase(parts[0]);
      lastName = "";
    }
  }

  return {
    firstName,
    lastName,
    isValid: firstName.length >= 1,
  };
}

// Top-level formatter used per row: applies cleanNameForOutput to First/Last Name columns
function formatRowNames(row) {
  const rawFirst = row["First Name"] ?? "";
  const rawLast = row["Last Name"] ?? "";
  return {
    firstName: cleanNameForOutput(rawFirst, true),
    lastName: cleanNameForOutput(rawLast, false),
  };
}

// ─── Main component ────────────────────────────────────────────────────────

export default function FormatTests() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => setRows(data),
    });
  }

  // Apply name formatting to every row
  const formatted = rows.map((row) => {
    const { firstName, lastName } = formatRowNames(row);
    return { ...row, "First Name": firstName, "Last Name": lastName };
  });

  function downloadCSV() {
    const csv = Papa.unparse(formatted);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted_${fileName || "output.csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ marginBottom: 4 }}>Format Tests</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Upload a CSV to preview and test name formatting only.
      </p>

      <input type="file" accept=".csv" onChange={handleFile} />

      {formatted.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              margin: "1.25rem 0 0.75rem",
            }}
          >
            <p style={{ margin: 0, color: "#555" }}>
              {formatted.length} rows loaded from <strong>{fileName}</strong>
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
              }}
            >
              Download Formatted CSV
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
                  <th style={th}>First Name (raw)</th>
                  <th style={th}>Last Name (raw)</th>
                  <th style={th}>First Name (formatted)</th>
                  <th style={th}>Last Name (formatted)</th>
                </tr>
              </thead>
              <tbody>
                {formatted.slice(0, 200).map((row, i) => {
                  const rawFirst = rows[i]["First Name"] ?? "";
                  const rawLast = rows[i]["Last Name"] ?? "";
                  const fmtFirst = row["First Name"];
                  const fmtLast = row["Last Name"];
                  const changed = rawFirst !== fmtFirst || rawLast !== fmtLast;
                  return (
                    <tr
                      key={i}
                      style={{ background: changed ? "#fefce8" : "white" }}
                    >
                      <td style={td}>{i + 1}</td>
                      <td style={td}>{rawFirst}</td>
                      <td style={td}>{rawLast}</td>
                      <td style={{ ...td, fontWeight: changed ? 600 : 400 }}>
                        {fmtFirst}
                      </td>
                      <td style={{ ...td, fontWeight: changed ? 600 : 400 }}>
                        {fmtLast}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {formatted.length > 200 && (
              <p style={{ color: "#888", marginTop: 8, fontSize: "0.8rem" }}>
                Showing first 200 of {formatted.length} rows. Download to see
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
