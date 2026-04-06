import React, { useState, useEffect } from "react";
import Papa from "papaparse";

function Splitter() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const chunkSize = 2000;
  const [processingStats, setProcessingStats] = useState({
    rowsProcessed: 0,
    filesCreated: 0,
  });

  // Clean up any progress display when component unmounts
  useEffect(() => {
    return () => {
      const progressElement = document.getElementById(
        "splitter-progress-modal",
      );
      if (progressElement) {
        document.body.removeChild(progressElement);
      }
    };
  }, []);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(selectedFile);
      setError("");
      setResults(null);
      setProgress(0);
      setProcessingStats({ rowsProcessed: 0, filesCreated: 0 });
    } else {
      setError("Please select a valid CSV file.");
      setFile(null);
    }
  };

  // Create a progress modal to show during processing
  const createProgressModal = () => {
    // Remove any existing progress modal
    const existingModal = document.getElementById("splitter-progress-modal");
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    // Create new progress modal
    const progressModal = document.createElement("div");
    progressModal.id = "splitter-progress-modal";
    progressModal.style.position = "fixed";
    progressModal.style.top = "50%";
    progressModal.style.left = "50%";
    progressModal.style.transform = "translate(-50%, -50%)";
    progressModal.style.padding = "20px";
    progressModal.style.background = "white";
    progressModal.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    progressModal.style.borderRadius = "5px";
    progressModal.style.zIndex = "9999";
    progressModal.style.minWidth = "300px";
    progressModal.style.textAlign = "center";

    progressModal.innerHTML = `
      <h3>Processing CSV File</h3>
      <div style="margin-bottom: 10px;">
        <div id="splitter-progress-text">Starting...</div>
        <div id="splitter-stats-text" style="font-size: 0.9em; color: #666; margin-top: 5px;"></div>
      </div>
      <div style="width: 100%; height: 20px; background: #eee; border-radius: 10px; overflow: hidden; margin-bottom: 15px;">
        <div id="splitter-progress-bar" style="width: 0%; height: 100%; background: #4CAF50;"></div>
      </div>
      <div style="font-size: 0.8em; color: #666;">
        Please don't close this window until processing is complete
      </div>
    `;

    document.body.appendChild(progressModal);
  };

  // Update the progress modal
  const updateProgressModal = (percent, message, stats = null) => {
    const progressBar = document.getElementById("splitter-progress-bar");
    const progressText = document.getElementById("splitter-progress-text");
    const statsText = document.getElementById("splitter-stats-text");

    if (progressBar && progressText) {
      progressBar.style.width = `${percent}%`;
      progressText.textContent = message;

      if (stats && statsText) {
        statsText.textContent = `Processed: ${stats.rowsProcessed.toLocaleString()} rows • Created: ${
          stats.filesCreated
        } files`;
      }
    }
  };

  // Process the file in chunks to handle very large files
  const splitFile = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setProcessing(true);
    setError("");
    setProgress(0);
    setProcessingStats({ rowsProcessed: 0, filesCreated: 0 });

    // Create progress modal for large files
    createProgressModal();
    updateProgressModal(0, "Preparing to process file...");

    try {
      const files = [];
      let headers = null;
      let totalRows = 0;
      let currentChunk = [];
      let currentFileIndex = 0;

      // Stream parsing for memory efficiency.
      // header:false keeps rows as raw arrays so no field values are
      // transformed, renamed, or dropped (e.g. duplicate column names).
      // We capture the first row manually as the header row.
      Papa.parse(file, {
        header: false,
        skipEmptyLines: false,
        chunk: (results, parser) => {
          const rows = results.data;

          for (const row of rows) {
            // The very first row of the file is the header row
            if (!headers) {
              headers = row;
              updateProgressModal(5, "Processing file headers...");
              continue; // don't count the header row as a data row
            }

            currentChunk.push(row);
            totalRows++;

            // Flush a complete 2000-row file as soon as we have enough rows
            if (currentChunk.length >= chunkSize) {
              const chunkToSave = currentChunk.splice(0, chunkSize);

              // Re-use the exact original header row so nothing is renamed
              const csvContent = Papa.unparse([headers, ...chunkToSave], {
                quoteChar: '"',
                escapeChar: '"',
                newline: "\n",
              });

              currentFileIndex++;
              const baseName = file.name.replace(/\.csv$/i, "");
              const fileName = `${baseName}_part_${currentFileIndex}.csv`;
              const fileEndRow = totalRows;
              const fileStartRow = fileEndRow - chunkToSave.length + 1;

              files.push({
                name: fileName,
                content: csvContent,
                rows: chunkToSave.length,
                startRow: fileStartRow,
                endRow: fileEndRow,
              });

              setProcessingStats({
                rowsProcessed: totalRows,
                filesCreated: currentFileIndex,
              });

              updateProgressModal(
                Math.min(90, (totalRows / (file.size / 100)) * 30),
                `Processing... (${totalRows.toLocaleString()} rows)`,
                { rowsProcessed: totalRows, filesCreated: currentFileIndex },
              );
            }
          }
        },
        complete: () => {
          // Guard: if headers is still null the file was empty
          if (!headers) {
            setError(
              "The uploaded file appears to be empty or has no header row.",
            );
            setProcessing(false);
            const progressElement = document.getElementById(
              "splitter-progress-modal",
            );
            if (progressElement) document.body.removeChild(progressElement);
            return;
          }

          // Flush any remaining rows into the last file
          if (currentChunk.length > 0) {
            const csvContent = Papa.unparse([headers, ...currentChunk], {
              quoteChar: '"',
              escapeChar: '"',
              newline: "\n",
            });

            currentFileIndex++;
            const baseName = file.name.replace(/\.csv$/i, "");
            const fileName = `${baseName}_part_${currentFileIndex}.csv`;

            files.push({
              name: fileName,
              content: csvContent,
              rows: currentChunk.length,
              startRow: totalRows - currentChunk.length + 1,
              endRow: totalRows,
            });
          }

          // Rename all files now that we know the final total
          const totalFiles = files.length;
          const baseName = file.name.replace(/\.csv$/i, "");
          files.forEach((f, index) => {
            f.name = `${baseName}_part_${index + 1}_of_${totalFiles}.csv`;
          });

          updateProgressModal(100, "Processing complete!", {
            rowsProcessed: totalRows,
            filesCreated: files.length,
          });

          // Remove progress modal after a short delay
          setTimeout(() => {
            const progressElement = document.getElementById(
              "splitter-progress-modal",
            );
            if (progressElement) {
              document.body.removeChild(progressElement);
            }
          }, 1000);

          setResults({
            originalRows: totalRows,
            numberOfFiles: files.length,
            files: files,
          });
          setProcessing(false);
          setProgress(100);
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          setProcessing(false);

          // Remove progress modal
          const progressElement = document.getElementById(
            "splitter-progress-modal",
          );
          if (progressElement) {
            document.body.removeChild(progressElement);
          }
        },
      });
    } catch (error) {
      setError(`Error reading file: ${error.message}`);
      setProcessing(false);

      // Remove progress modal on error
      const progressElement = document.getElementById(
        "splitter-progress-modal",
      );
      if (progressElement) {
        document.body.removeChild(progressElement);
      }
    }
  };

  const downloadFile = (fileData) => {
    const blob = new Blob([fileData.content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadAllFiles = () => {
    if (results && results.files) {
      results.files.forEach((fileData, index) => {
        // Add a small delay between downloads to avoid overwhelming the browser
        setTimeout(() => downloadFile(fileData), index * 300);
      });
    }
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setError("");
    setProcessing(false);
    setProgress(0);
    setProcessingStats({ rowsProcessed: 0, filesCreated: 0 });
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
        <h2>CSV File Splitter</h2>
        <p>Split large CSV files into smaller files of 2,000 rows each</p>
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
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div
          style={{ marginBottom: "1.5rem", color: "#555", fontSize: "0.95em" }}
        >
          Each output file will contain a maximum of{" "}
          {chunkSize.toLocaleString()} rows.
        </div>

        {/* Error Display */}
        {error && (
          <div
            className="error-message"
            style={{
              color: "#d32f2f",
              backgroundColor: "#ffebee",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Controls */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={splitFile}
            disabled={!file || processing}
            style={{
              fontSize: "1.2em",
              padding: "1rem 2rem",
              marginRight: "1rem",
              backgroundColor: processing ? "#ccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: processing ? "not-allowed" : "pointer",
            }}
          >
            {processing ? "Processing..." : "Split File"}
          </button>

          {(results || error) && (
            <button
              onClick={reset}
              style={{
                fontSize: "1.2em",
                padding: "1rem 2rem",
                backgroundColor: "#f44336",
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

        {/* Progress Bar (only shown when not using modal) */}
        {processing && progress > 0 && progress < 100 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              Processing: {progress.toFixed(0)}%
            </div>
            <div
              style={{
                width: "100%",
                height: "20px",
                backgroundColor: "#e0e0e0",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#4CAF50",
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
            <div
              style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}
            >
              Processed {processingStats.rowsProcessed.toLocaleString()} rows •
              Created {processingStats.filesCreated} files
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "1.5rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Split Results</h3>
            <div style={{ marginBottom: "1rem" }}>
              <p>
                <strong>Original file:</strong>{" "}
                {results.originalRows.toLocaleString()} rows
              </p>
              <p>
                <strong>Split into:</strong> {results.numberOfFiles} files
              </p>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <button
                onClick={downloadAllFiles}
                style={{
                  fontSize: "1em",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Download All Files
              </button>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <h4>Individual Files:</h4>
              <div style={{ maxHeight: "300px", overflow: "auto" }}>
                {results.files.map((fileData, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem",
                      border: "1px solid #eee",
                      borderRadius: "4px",
                      marginBottom: "0.5rem",
                      backgroundColor: "#f8f9fa",
                    }}
                  >
                    <div>
                      <strong>{fileData.name}</strong>
                      <br />
                      <small>
                        {fileData.rows.toLocaleString()} rows (rows{" "}
                        {fileData.startRow.toLocaleString()}-
                        {fileData.endRow.toLocaleString()})
                      </small>
                    </div>
                    <button
                      onClick={() => downloadFile(fileData)}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.9em",
                        backgroundColor: "#2196F3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div style={{ marginTop: "2rem", fontSize: "0.9em", color: "#666" }}>
          <h4>How it works:</h4>
          <ul>
            <li>Upload a CSV file of any size</li>
            <li>The file is streamed in chunks for memory efficiency</li>
            <li>Each output file will contain up to 2,000 rows</li>
            <li>Each file will contain the original column headers</li>
            <li>
              Email addresses and special characters are preserved correctly
            </li>
            <li>Download individual files or all files at once</li>
            <li>File names include part numbers for easy organization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Splitter;
