import React, { useState } from "react";
import Papa from "papaparse";

// Field mappings from the provided CSV
const FIELD_MAPPINGS = {
  FUB: {
    "First Name": "First Name",
    "Last Name": "Last Name",
    "Email 2 - Type": "Work Email",
    "Email 1": "Personal Email",
    "Phone 2": "Work Phone",
    "Phone 1": "Personal Phone",
    "Job title": "Title",
    "Company Name": "Company",
    Website: "Work Website",
    "Address 2 - Street": "Work Address Line 1",
    "Address 2 - City": "Work City",
    "Address 2 - State": "Work State",
    "Address 2 - Zip": "Work Zip",
    "Address 2 - Country": "Work Country",
    "Address 1 - Street": "Home Address Line 1",
    "Address 1 - City": "Home City",
    "Address 1 - State": "Home State",
    "Address 1 - Zip": "Home Zip",
    "Address 1 - Country": "Home Country",
    Stage: "Groups",
    Tags: "Tags",
    Birthday: "Birthdate",
    "Home Anniversary": "Home Anniversary",
    Notes: "Notes",
    "Spouse Name": "Tag",
  },
  LOFTY: {
    "First Name": "First Name",
    "Last Name": "Last Name",
    "Other Email": "Work Email",
    "Primary Email": "Personal Email",
    "Other Phone": "Work Phone",
    "Primary Phone": "Personal Phone",
    "Custom-Field-Title": "Title",
    "Custom-Field-Company": "Company",
    "Custom-Field-Work Address": "Work Address Line 1",
    "Custom-Field-Work Address City": "Work City",
    // Add missing Work Address fields
    "Custom Field-Work Address State": "Work State",
    "Custom Field-Work Address Zip": "Work Zip",
    // Add Home Address fields
    "Street Address(Mailing  Address)": "Home Address Line 1",
    "City(Mailing Address)": "Home City",
    "Province(Mailing Address)": "Home State",
    "Postal Code(Mailing Address)": "Home Zip",
    // Other fields
    "Birthday(Detail)": "Birthdate",
    "Note 1": "Notes",
    Tag: "Tags",
    "Lead Type": "Tag",
    Pipeline: "Tag",
  },
};

const ImportMapper = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceType, setSourceType] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setProcessedData(null);
      setError(null);
      setProgress(0);
    }
  };

  const handleSourceTypeChange = (e) => {
    setSourceType(e.target.value);
    setProcessedData(null);
    setError(null);
    setProgress(0);
  };

  const processFile = () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    if (!sourceType) {
      setError("Please select a source type (FUB or Lofty)");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Reading file...");
    setProgress(10);
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          setProcessingStatus("Converting data...");
          setProgress(50);

          const mapping =
            sourceType === "FUB" ? FIELD_MAPPINGS.FUB : FIELD_MAPPINGS.LOFTY;
          const processedRows = convertToCompassFormat(
            results.data,
            mapping,
            sourceType
          );

          setProcessingStatus("Conversion complete");
          setProgress(100);
          setProcessedData(processedRows);
          setIsProcessing(false);
        } catch (err) {
          setError(`Error processing data: ${err.message}`);
          setIsProcessing(false);
        }
      },
      error: (err) => {
        setError(`Error parsing file: ${err.message}`);
        setIsProcessing(false);
      },
    });
  };

  const convertToCompassFormat = (data, mapping, sourceType) => {
    return data.map((row) => {
      const compassRow = {};

      // Map fields based on the mapping configuration
      Object.entries(mapping).forEach(([sourceField, compassField]) => {
        if (row[sourceField]) {
          compassRow[compassField] = row[sourceField];
        }
      });

      // Special handling for FUB files (email fields)
      if (sourceType === "FUB") {
        // Handle Email fields properly (they're split into address and type columns)
        if (row["Email 2"] && !compassRow["Work Email"]) {
          compassRow["Work Email"] = row["Email 2"];
        }

        // Consolidate Tags fields
        if (row["Tags"] && !compassRow["Tags"]) {
          compassRow["Tags"] = row["Tags"];
        }
      }

      return compassRow;
    });
  };

  const downloadCSV = () => {
    if (!processedData || processedData.length === 0) return;

    // Get all unique headers from the processed data
    const headers = Array.from(
      new Set(processedData.flatMap((row) => Object.keys(row)))
    );

    // Convert data to CSV
    const csv = Papa.unparse({
      fields: headers,
      data: processedData,
    });

    // Create and trigger download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `compass_format_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="import-mapper-container"
      style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}
    >
      <section className="mapper-section">
        <h2>Import Mapper</h2>
        <p>Convert FUB or Lofty CSV files to Compass format</p>

        <div className="source-selector" style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold",
            }}
          >
            Select Source Type
          </label>
          <select
            value={sourceType}
            onChange={handleSourceTypeChange}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="">Select Source</option>
            <option value="FUB">FUB</option>
            <option value="LOFTY">Lofty</option>
          </select>
        </div>

        <div className="file-upload" style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold",
            }}
          >
            Upload {sourceType || "CSV"} File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={!sourceType}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #ccc",
              background: !sourceType ? "#f5f5f5" : "white",
            }}
          />
          <div
            style={{ fontSize: "0.8em", color: "#666", marginTop: "0.3rem" }}
          >
            Select a CSV file from {sourceType || "the selected source"} to
            convert to Compass format
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              background: "#f8d7da",
              color: "#721c24",
              borderRadius: "4px",
              marginBottom: "1rem",
              border: "1px solid #f5c6cb",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {isProcessing && (
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                height: "20px",
                background: "#e9ecef",
                borderRadius: "4px",
                overflow: "hidden",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "#007bff",
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
            <p style={{ textAlign: "center", margin: "0.5rem 0" }}>
              {processingStatus} ({progress}%)
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "1.5rem",
          }}
        >
          <button
            onClick={processFile}
            disabled={!selectedFile || !sourceType || isProcessing}
            style={{
              padding: "0.75rem 1.5rem",
              background:
                !selectedFile || !sourceType || isProcessing
                  ? "#cccccc"
                  : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                !selectedFile || !sourceType || isProcessing
                  ? "not-allowed"
                  : "pointer",
              fontSize: "1rem",
            }}
          >
            {isProcessing ? "Processing..." : "Process File"}
          </button>

          {processedData && (
            <button
              onClick={downloadCSV}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Download Compass CSV
            </button>
          )}
        </div>
      </section>

      {processedData && processedData.length > 0 && (
        <section className="preview-section" style={{ marginTop: "2rem" }}>
          <h3>Preview (First 5 records)</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "1rem",
                fontSize: "0.9em",
              }}
            >
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  {Object.keys(processedData[0])
                    .slice(0, 5)
                    .map((header, idx) => (
                      <th
                        key={idx}
                        style={{
                          padding: "0.75rem",
                          borderBottom: "2px solid #ddd",
                          textAlign: "left",
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  {Object.keys(processedData[0]).length > 5 && (
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #ddd",
                        textAlign: "left",
                      }}
                    >
                      ...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {processedData.slice(0, 5).map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    style={{
                      background: rowIdx % 2 === 0 ? "white" : "#f9f9f9",
                    }}
                  >
                    {Object.entries(row)
                      .slice(0, 5)
                      .map(([key, value], colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #ddd",
                          }}
                        >
                          {value}
                        </td>
                      ))}
                    {Object.keys(row).length > 5 && (
                      <td
                        style={{
                          padding: "0.75rem",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        ...
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "#666", fontSize: "0.9em", marginTop: "0.5rem" }}>
            Showing {Math.min(5, processedData.length)} of{" "}
            {processedData.length} records. Download the CSV for complete data.
          </p>
        </section>
      )}
    </div>
  );
};

export default ImportMapper;
