import React, { useState } from "react";
import Papa from "papaparse";

function DuplicateRemover() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [tagField, setTagField] = useState("Tags");
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setError("");
      setResults(null);
    } else {
      setError("Please select a valid CSV file.");
      setFile(null);
    }
  };

  const detectTagField = async () => {
    if (!file) return null;

    return new Promise((resolve, reject) => {
      // Read just the first chunk to detect headers
      Papa.parse(file, {
        header: true,
        preview: 1, // Just one row for header detection
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${result.errors[0].message}`));
            return;
          }

          const headers = result.meta.fields;
          // Look for likely tag column names
          const tagFieldOptions = headers.filter((header) =>
            /tags|tag|category|type|label/i.test(header)
          );

          if (tagFieldOptions.length > 0) {
            resolve(tagFieldOptions[0]); // Use the first match
          } else {
            resolve(null); // No tag field detected
          }
        },
        error: (error) => reject(error),
      });
    });
  };

  const removeDuplicates = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    if (!tagField) {
      setError(
        "Please specify the tag field containing duplicate information."
      );
      return;
    }

    setProcessing(true);
    setError("");
    setProgress(0);

    try {
      // Auto-detect tag field if not already set
      let fieldToUse = tagField;
      if (!fieldToUse) {
        fieldToUse = await detectTagField();
        if (!fieldToUse) {
          setError("Could not automatically detect a tag field.");
          setProcessing(false);
          return;
        }
        setTagField(fieldToUse);
      }

      // Initialize result arrays
      const keptRecords = [];
      const duplicateRecords = [];
      const mergedRecords = [];

      // Use Papa.parse with streaming for better memory efficiency
      let totalRows = 0;
      let processedRows = 0;

      // Create a parser with chunk processing to avoid memory issues
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        worker: true, // Use a worker thread if available
        chunk: (results, parser) => {
          // Process this chunk of data
          if (results.errors.length > 0) {
            console.warn("CSV parsing warnings:", results.errors);
          }

          // Update total rows count on first chunk
          if (totalRows === 0) {
            // Estimate total rows from file size for progress calculation
            const averageRowSize = JSON.stringify(results.data[0]).length * 1.1; // Add 10% buffer
            const estimatedRows = Math.ceil(file.size / averageRowSize);
            totalRows = Math.max(estimatedRows, 1000); // Set a minimum to avoid progress jumps
          }

          // Process each row in the chunk
          results.data.forEach((row) => {
            processedRows++;

            // Update progress every 100 rows to avoid too many renders
            if (processedRows % 100 === 0 || processedRows === totalRows) {
              const calculatedProgress = Math.min(
                Math.floor((processedRows / totalRows) * 100),
                99
              );
              setProgress(calculatedProgress);
            }

            // Check for duplicate or merged tags
            const tags = row[fieldToUse] || "";
            const isDuplicate = tags
              .toLowerCase()
              .includes("crmrefreshduplicate");
            const isMerged = tags.toLowerCase().includes("crmrefreshmerged");

            // Sort records based on tags - PRIORITY ON CRMREFRESHMERGED
            // If a record has the "CRMREFRESHMERGED" tag, we want to keep it regardless of whether it also has "CRMREFRESHDUPLICATE" tag
            if (isMerged) {
              // Keep merged records even if they also have CRMREFRESHDUPLICATE tag
              // Filter out the duplicate tag for clarity in the output
              if (isDuplicate) {
                // Create a copy of the row with the duplicate tag removed
                const cleanedRow = { ...row };
                // Save the original tags for statistics
                cleanedRow._originalTags = cleanedRow[fieldToUse];
                // Clean up the Tags field to remove the duplicate tag
                const tagArray = cleanedRow[fieldToUse]
                  .split(",")
                  .map((t) => t.trim());
                const filteredTags = tagArray.filter(
                  (tag) =>
                    !tag.toLowerCase().includes("duplicate") &&
                    !tag.toLowerCase().includes("crmrefreshduplicate")
                );
                cleanedRow[fieldToUse] = filteredTags.join(",");
                keptRecords.push(cleanedRow);
                mergedRecords.push(cleanedRow);
              } else {
                keptRecords.push(row);
                mergedRecords.push(row);
              }
            } else if (isDuplicate) {
              // Only remove as duplicate if it doesn't have the CRMREFRESHMERGED tag
              duplicateRecords.push(row);
            } else {
              // Normal record with no special tags
              keptRecords.push(row);
            }
          });
        },
        complete: () => {
          // Finalize progress
          setProgress(100);

          // Set results
          setResults({
            kept: keptRecords,
            duplicates: duplicateRecords,
            merged: mergedRecords,
            totalRows: processedRows,
            // Count how many records had both tags
            bothTags: mergedRecords.filter(
              (r) =>
                (r[fieldToUse] || "")
                  .toLowerCase()
                  .includes("crmrefreshmerged") &&
                (r._originalTags || "")
                  .toLowerCase()
                  .includes("crmrefreshduplicate")
            ).length,
          });
          setProcessing(false);
        },
        error: (error) => {
          console.error("CSV parsing error:", error);
          setError(`Error parsing CSV: ${error.message}`);
          setProcessing(false);
        },
      });
    } catch (error) {
      console.error("Error processing file:", error);
      setError(`Error: ${error.message}`);
      setProcessing(false);
    }
  };

  const downloadCleanedData = () => {
    if (results && results.kept.length > 0) {
      try {
        // Use a streaming approach for large files
        const processInChunks = (data, chunkSize = 5000) => {
          const chunks = [];
          for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
          }
          return chunks;
        };

        // Process the data in chunks to avoid memory issues
        const chunks = processInChunks(results.kept);

        // Convert first chunk to CSV with headers
        const firstChunk = Papa.unparse(chunks[0]);

        // Get headers from the first chunk
        const headers = firstChunk.split("\n")[0];

        // Create blob parts array
        const blobParts = [firstChunk];

        // Add remaining chunks without headers
        for (let i = 1; i < chunks.length; i++) {
          const chunk = Papa.unparse(chunks[i], { header: false });
          // Skip the header row for subsequent chunks
          const rows = chunk.split("\n").slice(1).join("\n");
          blobParts.push("\n" + rows);
        }

        // Create blob from parts
        const blob = new Blob(blobParts, { type: "text/csv;charset=utf-8;" });

        // Download using safe method
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "cleaned_data.csv");
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error("Error downloading cleaned data:", error);
        alert(
          "There was an error creating the download. Try with a smaller file or contact support."
        );
      }
    }
  };

  const downloadDuplicates = () => {
    if (results && results.duplicates.length > 0) {
      try {
        // Use a streaming approach for large files
        const processInChunks = (data, chunkSize = 5000) => {
          const chunks = [];
          for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.slice(i, i + chunkSize));
          }
          return chunks;
        };

        // Process the data in chunks to avoid memory issues
        const chunks = processInChunks(results.duplicates);

        // Convert first chunk to CSV with headers
        const firstChunk = Papa.unparse(chunks[0]);

        // Create blob parts array
        const blobParts = [firstChunk];

        // Add remaining chunks without headers
        for (let i = 1; i < chunks.length; i++) {
          const chunk = Papa.unparse(chunks[i], { header: false });
          // Skip the header row for subsequent chunks
          const rows = chunk.split("\n").slice(1).join("\n");
          blobParts.push("\n" + rows);
        }

        // Create blob from parts
        const blob = new Blob(blobParts, { type: "text/csv;charset=utf-8;" });

        // Download using safe method
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "duplicate_records.csv");
        document.body.appendChild(link);
        link.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      } catch (error) {
        console.error("Error downloading duplicates:", error);
        alert(
          "There was an error creating the download. Try with a smaller file or contact support."
        );
      }
    }
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setError("");
    setProcessing(false);
    setTagField("Tags");
    setProgress(0);
  };

  return (
    <div
      style={{
        marginTop: "3rem",
        padding: "0 2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        borderTop: "1px solid #ccc",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h2>Duplicate Remover</h2>
        <p>Clean up your contact list by removing duplicate records</p>
      </header>

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* File Upload */}
        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold",
            }}
          >
            Select CSV File:
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          {file && (
            <p style={{ marginTop: "0.5rem", color: "#666" }}>
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Tag Field Selection */}
        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold",
            }}
          >
            Tag Column Name:
          </label>
          <input
            type="text"
            placeholder="Tag field name (default: 'Tags')"
            value={tagField}
            onChange={(e) => setTagField(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9em" }}>
            Enter the exact column name from your CSV that contains tags
            indicating duplicates. This field should contain values like
            "CRMREFRESHDUPLICATE" or "CRMREFRESHMERGED".
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1.5rem",
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              borderRadius: "4px",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Progress Bar */}
        {processing && (
          <div style={{ marginBottom: "2rem" }}>
            <p>Processing... {progress}%</p>
            <div
              style={{
                width: "100%",
                height: "20px",
                backgroundColor: "#e5e7eb",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#3b82f6",
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={removeDuplicates}
            disabled={!file || processing}
            style={{
              fontSize: "1.2em",
              padding: "1rem 2rem",
              marginRight: "1rem",
              backgroundColor: !file || processing ? "#e5e7eb" : "#3b82f6",
              color: !file || processing ? "#9ca3af" : "white",
              border: "none",
              borderRadius: "4px",
              cursor: !file || processing ? "default" : "pointer",
            }}
          >
            {processing ? "Processing..." : "Remove Duplicates"}
          </button>

          {(results || error) && (
            <button
              onClick={reset}
              style={{
                fontSize: "1.2em",
                padding: "1rem 2rem",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Results */}
        {results && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Cleaning Results</h3>
            <div style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <p style={{ margin: "0.5rem 0" }}>
                    <strong>Total records:</strong> {results.totalRows}
                  </p>
                  <p style={{ margin: "0.5rem 0" }}>
                    <strong>Duplicate records removed:</strong>{" "}
                    {results.duplicates.length} (
                    {Math.round(
                      (results.duplicates.length / results.totalRows) * 100
                    )}
                    %)
                  </p>
                  <p style={{ margin: "0.5rem 0" }}>
                    <strong>Merged records kept:</strong>{" "}
                    {results.merged.length} (
                    {Math.round(
                      (results.merged.length / results.totalRows) * 100
                    )}
                    %)
                  </p>
                  {results.bothTags > 0 && (
                    <p style={{ margin: "0.5rem 0", color: "#0066cc" }}>
                      <strong>Records with both tags (fixed):</strong>{" "}
                      {results.bothTags} (
                      {Math.round((results.bothTags / results.totalRows) * 100)}
                      %)
                    </p>
                  )}
                  <p style={{ margin: "0.5rem 0" }}>
                    <strong>Clean records remaining:</strong>{" "}
                    {results.kept.length} (
                    {Math.round(
                      (results.kept.length / results.totalRows) * 100
                    )}
                    %)
                  </p>
                </div>
                <div
                  style={{
                    minWidth: "200px",
                    height: "200px",
                    position: "relative",
                  }}
                >
                  {/* Simple DIY chart */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      width: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "100%",
                        height: "100%",
                        alignItems: "flex-end",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: "#10b981",
                          height: `${
                            (results.kept.length / results.totalRows) * 100
                          }%`,
                          margin: "0 2px",
                          borderTopLeftRadius: "4px",
                          borderTopRightRadius: "4px",
                        }}
                      ></div>
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: "#ef4444",
                          height: `${
                            (results.duplicates.length / results.totalRows) *
                            100
                          }%`,
                          margin: "0 2px",
                          borderTopLeftRadius: "4px",
                          borderTopRightRadius: "4px",
                        }}
                      ></div>
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: "#9ca3af",
                          height: `${
                            (results.merged.length / results.totalRows) * 100
                          }%`,
                          margin: "0 2px",
                          borderTopLeftRadius: "4px",
                          borderTopRightRadius: "4px",
                        }}
                      ></div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "8px",
                      width: "100%",
                    }}
                  >
                    <div style={{ textAlign: "center", fontSize: "0.8em" }}>
                      Kept
                    </div>
                    <div style={{ textAlign: "center", fontSize: "0.8em" }}>
                      Duplicates
                    </div>
                    <div style={{ textAlign: "center", fontSize: "0.8em" }}>
                      Merged
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4>Download Options:</h4>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <button
                  onClick={downloadCleanedData}
                  disabled={results.kept.length === 0}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor:
                      results.kept.length === 0 ? "#e5e7eb" : "#10b981",
                    color: results.kept.length === 0 ? "#9ca3af" : "white",
                    border: "none",
                    borderRadius: "4px",
                    flex: "1 0 45%",
                    cursor: results.kept.length === 0 ? "default" : "pointer",
                  }}
                >
                  Download Cleaned Data ({results.kept.length})
                </button>
                <button
                  onClick={downloadDuplicates}
                  disabled={results.duplicates.length === 0}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor:
                      results.duplicates.length === 0 ? "#e5e7eb" : "#ef4444",
                    color:
                      results.duplicates.length === 0 ? "#9ca3af" : "white",
                    border: "none",
                    borderRadius: "4px",
                    flex: "1 0 45%",
                    cursor:
                      results.duplicates.length === 0 ? "default" : "pointer",
                  }}
                >
                  Download Duplicates ({results.duplicates.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div style={{ marginTop: "2rem", fontSize: "0.9em", color: "#666" }}>
          <h4>How it works:</h4>
          <ul style={{ paddingLeft: "1.5rem" }}>
            <li>
              Upload a CSV file containing contact records with a tag column
            </li>
            <li>
              Records with "CRMREFRESHDUPLICATE" in the tag field are removed
              (these are duplicate records)
            </li>
            <li>
              Records with "CRMREFRESHMERGED" in the tag field are kept (these
              are master records)
            </li>
            <li>
              If a record has both "CRMREFRESHMERGED" and "CRMREFRESHDUPLICATE"
              tags, it is kept and the "CRMREFRESHDUPLICATE" tag is removed
            </li>
            <li>
              The cleaned dataset contains only unique, non-duplicate records
            </li>
            <li>Download your cleaned data ready for import into your CRM</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DuplicateRemover;
