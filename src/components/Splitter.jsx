import React, { useState, useEffect } from "react";
import Papa from "papaparse";

function Splitter() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [chunkSize, setChunkSize] = useState(2000); // Default chunk size is 2000
  const [processingStats, setProcessingStats] = useState({
    rowsProcessed: 0,
    filesCreated: 0,
  });

  // Clean up any progress display when component unmounts
  useEffect(() => {
    return () => {
      const progressElement = document.getElementById(
        "splitter-progress-modal"
      );
      if (progressElement) {
        document.body.removeChild(progressElement);
      }
    };
  }, []);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
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
      <h3>Processing Large CSV File</h3>
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
      // For larger files, use streaming approach instead of loading entire file at once
      const maxRowsPerFile = chunkSize; // Use the selected chunk size
      const files = [];
      let headers = [];
      let totalRows = 0;
      let currentChunk = [];
      let currentFileIndex = 0;
      let isHeaderProcessed = false;

      // Stream parsing for memory efficiency
      Papa.parse(file, {
        header: false, // We'll handle headers manually for better control
        skipEmptyLines: true,
        chunk: async (results, parser) => {
          // Pause the parser to prevent overwhelming the browser
          parser.pause();

          let rows = results.data;

          // Extract headers from first chunk
          if (!isHeaderProcessed && rows.length > 0) {
            headers = rows[0].map((h) => h.trim());
            isHeaderProcessed = true;
            rows = rows.slice(1); // Remove header row
            updateProgressModal(5, "Processing file headers...");
          }

          // Convert rows to objects with proper headers
          const processedRows = rows.map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });

          // Add processed rows to current chunk
          currentChunk.push(...processedRows);
          totalRows += processedRows.length;

          // If current chunk has reached the max rows per file, create a CSV file
          while (currentChunk.length >= maxRowsPerFile) {
            const chunkToSave = currentChunk.slice(0, maxRowsPerFile);
            currentChunk = currentChunk.slice(maxRowsPerFile);

            // Create CSV content
            const csvContent = Papa.unparse({
              fields: headers,
              data: chunkToSave,
            });

            // Incremental file naming since we don't know total number yet
            currentFileIndex++;
            const fileName = `${file.name.replace(
              ".csv",
              ""
            )}_part_${currentFileIndex}.csv`;

            files.push({
              name: fileName,
              content: csvContent,
              rows: chunkToSave.length,
              startRow:
                totalRows -
                processedRows.length -
                currentChunk.length -
                chunkToSave.length +
                1,
              endRow: totalRows - processedRows.length - currentChunk.length,
            });

            // Update progress
            setProcessingStats((prev) => ({
              rowsProcessed: totalRows,
              filesCreated: currentFileIndex,
            }));

            updateProgressModal(
              Math.min(90, (totalRows / (file.size / 100)) * 30), // Estimate progress based on file size
              `Processing large file in chunks... (${totalRows.toLocaleString()} rows)`,
              { rowsProcessed: totalRows, filesCreated: currentFileIndex }
            );

            // Yield control back to browser UI for responsiveness
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          // Resume parsing
          parser.resume();
        },
        complete: async () => {
          // Process any remaining rows
          if (currentChunk.length > 0) {
            const csvContent = Papa.unparse({
              fields: headers,
              data: currentChunk,
            });

            currentFileIndex++;
            const fileName = `${file.name.replace(
              ".csv",
              ""
            )}_part_${currentFileIndex}.csv`;

            files.push({
              name: fileName,
              content: csvContent,
              rows: currentChunk.length,
              startRow: totalRows - currentChunk.length + 1,
              endRow: totalRows,
            });
          }

          // Update final file names with total count
          files.forEach((file, index) => {
            file.name = `${file.name.replace(/part_\d+\.csv$/, "")}part_${
              index + 1
            }_of_${files.length}.csv`;
          });

          updateProgressModal(100, "Processing complete!", {
            rowsProcessed: totalRows,
            filesCreated: files.length,
          });

          // Remove progress modal after a short delay
          setTimeout(() => {
            const progressElement = document.getElementById(
              "splitter-progress-modal"
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
            "splitter-progress-modal"
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
        "splitter-progress-modal"
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
    setChunkSize(2000); // Reset to default chunk size
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
        <p>
          Split large CSV files into smaller files with customizable chunk sizes
        </p>
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

        {/* Chunk Size Selection */}
        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold",
            }}
          >
            Select Chunk Size:
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setChunkSize(2000)}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: chunkSize === 2000 ? "#4CAF50" : "#e0e0e0",
                color: chunkSize === 2000 ? "white" : "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: chunkSize === 2000 ? "bold" : "normal",
              }}
            >
              2,000 Rows
            </button>
            <button
              onClick={() => setChunkSize(10000)}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: chunkSize === 10000 ? "#4CAF50" : "#e0e0e0",
                color: chunkSize === 10000 ? "white" : "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: chunkSize === 10000 ? "bold" : "normal",
              }}
            >
              10,000 Rows
            </button>
            <button
              onClick={() => setChunkSize(50000)}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: chunkSize === 50000 ? "#4CAF50" : "#e0e0e0",
                color: chunkSize === 50000 ? "white" : "black",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: chunkSize === 50000 ? "bold" : "normal",
              }}
            >
              50,000 Rows
            </button>
          </div>
          <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9em" }}>
            Each output file will contain a maximum of{" "}
            {chunkSize.toLocaleString()} rows.
          </p>
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
            <li>Upload a CSV file of any size - even gigabytes!</li>
            <li>
              The file will be processed in chunks to handle very large files
              efficiently
            </li>
            <li>
              Choose your preferred chunk size: 2,000, 10,000, or 50,000 rows
              per file
            </li>
            <li>Each file will contain the original column headers</li>
            <li>Download individual files or all files at once</li>
            <li>File names include part numbers for easy organization</li>
          </ul>
          <p>
            <strong>Tip:</strong> Smaller chunk sizes (2,000 rows) are better
            for email attachments and easier processing. Larger sizes (50,000
            rows) create fewer files but may be harder to work with.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Splitter;
