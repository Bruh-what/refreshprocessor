import React, { useState } from "react";
import Papa from "papaparse";

const MergedBro = () => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [mergedData, setMergedData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);

  const addLog = (message) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const handleFileUpload = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    // Validate all files are CSV
    const nonCsvFiles = selectedFiles.filter(
      (file) => !file.name.toLowerCase().endsWith(".csv")
    );

    if (nonCsvFiles.length > 0) {
      alert(
        `Please upload only CSV files. Found non-CSV files: ${nonCsvFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      return;
    }

    // Check file sizes (max 50MB per file)
    const largeFiles = selectedFiles.filter(
      (file) => file.size > 50 * 1024 * 1024
    );
    if (largeFiles.length > 0) {
      alert(
        `Files too large (max 50MB each): ${largeFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      return;
    }

    setFiles(selectedFiles);
    setMergedData(null);
    setLogs([]);
    setStats(null);
    addLog(`Selected ${selectedFiles.length} CSV files for merging`);
    selectedFiles.forEach((file, index) => {
      addLog(
        `File ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      );
    });
  };

  const parseCSV = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            encoding: "UTF-8",
          });

          if (result.errors && result.errors.length > 0) {
            console.warn(`Parsing warnings for ${file.name}:`, result.errors);
          }

          resolve({
            fileName: file.name,
            headers: result.meta.fields || [],
            data: result.data || [],
            errors: result.errors || [],
          });
        } catch (error) {
          reject(new Error(`Failed to parse ${file.name}: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read ${file.name}`));
      };

      reader.readAsText(file);
    });
  };

  const mergeFiles = async () => {
    if (files.length === 0) {
      alert("Please select CSV files first!");
      return;
    }

    setProcessing(true);
    setLogs([]);
    addLog("Starting CSV merge process...");

    try {
      // Parse all CSV files
      addLog(`Parsing ${files.length} CSV files...`);
      const parsedFiles = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addLog(`Parsing file ${i + 1}/${files.length}: ${file.name}`);

        try {
          const parsed = await parseCSV(file);
          parsedFiles.push(parsed);
          addLog(
            `✅ ${file.name}: ${parsed.data.length} rows, ${parsed.headers.length} columns`
          );
        } catch (error) {
          addLog(`❌ Error parsing ${file.name}: ${error.message}`);
          throw error;
        }
      }

      // Analyze headers for compatibility
      addLog("Analyzing column compatibility...");
      const allHeaders = new Set();
      const headersByFile = {};

      parsedFiles.forEach((parsed, index) => {
        headersByFile[parsed.fileName] = parsed.headers;
        parsed.headers.forEach((header) => allHeaders.add(header));
      });

      const uniqueHeaders = Array.from(allHeaders).sort();
      addLog(`Found ${uniqueHeaders.length} unique columns across all files`);

      // Check for header mismatches
      let hasHeaderMismatches = false;
      const firstFileHeaders = parsedFiles[0].headers;

      for (let i = 1; i < parsedFiles.length; i++) {
        const currentHeaders = parsedFiles[i].headers;
        if (
          JSON.stringify([...firstFileHeaders].sort()) !==
          JSON.stringify([...currentHeaders].sort())
        ) {
          hasHeaderMismatches = true;
          const missing = firstFileHeaders.filter(
            (h) => !currentHeaders.includes(h)
          );
          const extra = currentHeaders.filter(
            (h) => !firstFileHeaders.includes(h)
          );

          if (missing.length > 0) {
            addLog(
              `⚠️ ${parsedFiles[i].fileName} missing columns: ${missing.join(
                ", "
              )}`
            );
          }
          if (extra.length > 0) {
            addLog(
              `⚠️ ${parsedFiles[i].fileName} has extra columns: ${extra.join(
                ", "
              )}`
            );
          }
        }
      }

      if (hasHeaderMismatches) {
        addLog(`ℹ️ Using union of all columns (${uniqueHeaders.length} total)`);
      } else {
        addLog(`✅ All files have identical column structure`);
      }

      // Merge data
      addLog("Merging rows from all files...");
      const mergedRows = [];
      let totalRows = 0;

      parsedFiles.forEach((parsed, fileIndex) => {
        addLog(`Adding ${parsed.data.length} rows from ${parsed.fileName}...`);

        parsed.data.forEach((row, rowIndex) => {
          // Create a normalized row with all possible columns
          const normalizedRow = {};

          // Initialize all columns with empty strings
          uniqueHeaders.forEach((header) => {
            normalizedRow[header] = "";
          });

          // Fill in the data from this row
          Object.keys(row).forEach((key) => {
            if (uniqueHeaders.includes(key)) {
              normalizedRow[key] = row[key] || "";
            }
          });

          // Add metadata columns to track source
          normalizedRow["_source_file"] = parsed.fileName;
          normalizedRow["_source_row"] = rowIndex + 1;
          normalizedRow["_merged_order"] = totalRows + 1;

          mergedRows.push(normalizedRow);
          totalRows++;
        });
      });

      // Update headers to include metadata columns
      const finalHeaders = [
        ...uniqueHeaders,
        "_source_file",
        "_source_row",
        "_merged_order",
      ];

      // Generate statistics
      const fileStats = parsedFiles.map((parsed) => ({
        fileName: parsed.fileName,
        rows: parsed.data.length,
        columns: parsed.headers.length,
        uniqueColumns: parsed.headers,
      }));

      const finalStats = {
        totalFiles: parsedFiles.length,
        totalRows: totalRows,
        totalColumns: uniqueHeaders.length,
        finalColumns: finalHeaders.length,
        fileBreakdown: fileStats,
        headerMismatches: hasHeaderMismatches,
      };

      addLog(`\n=== MERGE COMPLETE ===`);
      addLog(`Files merged: ${finalStats.totalFiles}`);
      addLog(`Total rows: ${finalStats.totalRows}`);
      addLog(
        `Final columns: ${finalStats.finalColumns} (includes 3 metadata columns)`
      );
      addLog(`Ready for download!`);

      setMergedData({
        headers: finalHeaders,
        rows: mergedRows,
      });
      setStats(finalStats);
    } catch (error) {
      addLog(`❌ Merge failed: ${error.message}`);
      console.error("Merge error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const exportMergedData = () => {
    if (!mergedData) return;

    const csv = Papa.unparse({
      fields: mergedData.headers,
      data: mergedData.rows,
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `merged_csvs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportWithoutMetadata = () => {
    if (!mergedData) return;

    // Remove metadata columns
    const cleanHeaders = mergedData.headers.filter(
      (h) => !h.startsWith("_source_") && !h.startsWith("_merged_")
    );

    const cleanRows = mergedData.rows.map((row) => {
      const cleanRow = {};
      cleanHeaders.forEach((header) => {
        cleanRow[header] = row[header];
      });
      return cleanRow;
    });

    const csv = Papa.unparse({
      fields: cleanHeaders,
      data: cleanRows,
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `merged_csvs_clean_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  const clearFiles = () => {
    setFiles([]);
    setMergedData(null);
    setLogs([]);
    setStats(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">🤝 Merged Bro</h1>
        <p className="text-gray-600 text-lg">
          Upload multiple CSV files and merge all their rows together into one
          unified file.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Upload 2 or more CSV files with similar column structures</li>
            <li>
              • All rows from all files are combined into one large dataset
            </li>
            <li>
              • Handles column mismatches by using the union of all columns
            </li>
            <li>• Adds metadata to track which file each row came from</li>
          </ul>
        </div>
      </header>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📁 Upload CSV Files</h2>

        <div className="mb-4">
          <input
            type="file"
            multiple
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-2">
            Select multiple CSV files (max 50MB each). Files should have similar
            column structures for best results.
          </p>
        </div>

        {files.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">
              Selected Files ({files.length}):
            </h3>
            <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="text-sm py-1">
                  <span className="font-medium">{index + 1}.</span> {file.name}
                  <span className="text-gray-500 ml-2">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={mergeFiles}
            disabled={files.length < 2 || processing}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
          >
            {processing ? "Merging..." : "🤝 Merge Files"}
          </button>

          {files.length > 0 && (
            <button
              onClick={clearFiles}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Clear Files
            </button>
          )}
        </div>

        {files.length < 2 && files.length > 0 && (
          <p className="text-orange-600 text-sm mt-2">
            Please select at least 2 CSV files to merge.
          </p>
        )}
      </div>

      {/* Processing Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Processing Log</h3>
          <div className="text-sm font-mono max-h-60 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap py-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {stats && mergedData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Merge Summary</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalFiles}
                </div>
                <div className="text-sm text-gray-600">Files Merged</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalRows}
                </div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalColumns}
                </div>
                <div className="text-sm text-gray-600">Data Columns</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.finalColumns}
                </div>
                <div className="text-sm text-gray-600">Final Columns</div>
              </div>
            </div>

            {/* File Breakdown */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">File Breakdown:</h3>
              <div className="space-y-2">
                {stats.fileBreakdown.map((file, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded"
                  >
                    <span className="font-medium">{file.fileName}</span>
                    <div className="text-sm text-gray-600">
                      {file.rows} rows × {file.columns} columns
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {stats.headerMismatches && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ <strong>Column Mismatch Detected:</strong> Files had
                  different column structures. Missing columns were filled with
                  empty values. Check the processing log for details.
                </p>
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              📥 Download Merged File
            </h2>
            <div className="space-y-4">
              <div className="text-center">
                <button
                  onClick={exportMergedData}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg mr-4"
                >
                  📥 Download with Metadata
                </button>
                <button
                  onClick={exportWithoutMetadata}
                  className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
                >
                  📥 Download Clean Version
                </button>
              </div>

              <div className="text-sm text-gray-600 text-center space-y-1">
                <p>
                  <strong>With Metadata:</strong> Includes source file tracking
                  columns (_source_file, _source_row, _merged_order)
                </p>
                <p>
                  <strong>Clean Version:</strong> Only your original data
                  columns, no metadata
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tips */}
      <div className="bg-yellow-50 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">💡 Tips for Best Results</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>✅ Ideal:</strong> Files with identical column headers and
            similar data formats
          </p>
          <p>
            <strong>⚠️ Acceptable:</strong> Files with mostly similar columns
            (missing columns will be filled with empty values)
          </p>
          <p>
            <strong>📝 Metadata Columns:</strong> The tool adds tracking columns
            to show which file each row came from
          </p>
          <p>
            <strong>🔍 Column Matching:</strong> Column names must match exactly
            (case-sensitive) to be merged properly
          </p>
          <p>
            <strong>📊 Large Files:</strong> Can handle large datasets, but
            processing time increases with file size
          </p>
        </div>
      </div>
    </div>
  );
};

export default MergedBro;
