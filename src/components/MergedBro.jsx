import React, { useState } from "react";
import Papa from "papaparse";

const MergedBro = () => {
  const [files, setFiles] = useState([]);
  const [mergedData, setMergedData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    status: "",
  });

  const addLog = (message) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  // Sleep function to prevent browser blocking
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Parse CSV using Papa Parse
  const parseCSV = (csvText) => {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: false,
    });
    return result;
  };

  // Handle file uploads
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

    setFiles(selectedFiles);
    setMergedData(null);
    setLogs([]);
    setProgress({ current: 0, total: 0, status: "" });
    addLog(`Selected ${selectedFiles.length} files for merging`);
    selectedFiles.forEach((file, index) => {
      addLog(
        `File ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      );
    });
  };

  // Merge all CSVs - simple row stacking
  const mergeFiles = async () => {
    if (files.length < 2) {
      alert("Please upload at least two CSV files to merge.");
      return;
    }

    setProcessing(true);
    setProgress({
      current: 0,
      total: files.length,
      status: "Starting merge process...",
    });

    try {
      addLog("Starting simple CSV merge process...");

      // Parse all files with progress tracking
      const parsedCSVs = [];
      let totalRowsEstimate = 0;

      for (let i = 0; i < files.length; i++) {
        setProgress({
          current: i + 1,
          total: files.length,
          status: `Parsing file ${i + 1} of ${files.length}: ${files[i].name}`,
        });

        addLog(`Parsing file ${i + 1}/${files.length}: ${files[i].name}`);

        const fileContent = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(files[i]);
        });

        // Parse the CSV
        const parsed = parseCSV(fileContent);
        if (parsed.errors && parsed.errors.length > 0) {
          addLog(
            `⚠️ Warnings in ${files[i].name}: ${parsed.errors.length} parsing issues`
          );
        }

        parsedCSVs.push({
          name: files[i].name,
          data: parsed.data || [],
          fields: parsed.meta?.fields || [],
        });

        totalRowsEstimate += parsed.data?.length || 0;
        addLog(
          `✅ ${files[i].name}: ${parsed.data?.length || 0} rows, ${
            parsed.meta?.fields?.length || 0
          } columns`
        );

        // Give browser time to breathe
        await sleep(10);
      }

      setProgress({
        current: files.length,
        total: files.length,
        status: `Merging ${totalRowsEstimate} total rows...`,
      });

      // Use fields from the first file as master headers
      const masterFields = parsedCSVs[0]?.fields || [];
      addLog(`Using headers from first file: ${parsedCSVs[0].name}`);
      addLog(
        `Master headers (${masterFields.length}): ${masterFields.join(", ")}`
      );

      // Check if all files have the same headers
      let allFilesCompatible = true;
      for (let i = 1; i < parsedCSVs.length; i++) {
        const currentFields = parsedCSVs[i].fields;
        if (JSON.stringify(masterFields) !== JSON.stringify(currentFields)) {
          allFilesCompatible = false;
          addLog(`⚠️ Warning: ${parsedCSVs[i].name} has different headers`);
          addLog(`  Expected: ${masterFields.join(", ")}`);
          addLog(`  Found: ${currentFields.join(", ")}`);
        }
      }

      if (allFilesCompatible) {
        addLog(`✅ All files have identical headers - perfect for merging!`);
      } else {
        addLog(
          `⚠️ Some files have different headers - rows may have missing data`
        );
      }

      // Simply concatenate all rows
      addLog("Combining all rows...");
      let allRows = [];
      let processedRows = 0;

      for (let i = 0; i < parsedCSVs.length; i++) {
        const csv = parsedCSVs[i];
        if (csv && csv.data) {
          addLog(`Adding ${csv.data.length} rows from ${csv.name}...`);
          allRows.push(...csv.data);
          processedRows += csv.data.length;

          setProgress({
            current: processedRows,
            total: totalRowsEstimate,
            status: `Processing rows: ${processedRows} of ${totalRowsEstimate}`,
          });

          // Give browser time to breathe
          await sleep(5);
        }
      }

      addLog(`\n=== MERGE COMPLETE ===`);
      addLog(`Files merged: ${parsedCSVs.length}`);
      addLog(`Total rows: ${allRows.length}`);
      addLog(`Headers used: ${masterFields.length} columns from first file`);
      addLog(`Ready for download!`);

      setMergedData({
        fields: masterFields,
        data: allRows,
      });

      setProgress({
        current: totalRowsEstimate,
        total: totalRowsEstimate,
        status: `Successfully merged ${allRows.length} rows!`,
      });
    } catch (error) {
      addLog(`❌ Merge failed: ${error.message}`);
      console.error("Merge error:", error);
      alert("Error merging CSV files. Please check the console for details.");
      setProgress({
        current: 0,
        total: 0,
        status: "Error occurred during merge",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Download merged CSV
  const exportMergedData = async () => {
    if (!mergedData) return;

    setProgress({
      current: 0,
      total: mergedData.data.length,
      status: "Preparing download...",
    });

    try {
      addLog("Creating merged CSV file...");

      // Create CSV using Papa.unparse
      const csvContent = Papa.unparse({
        fields: mergedData.fields,
        data: mergedData.data,
      });

      // Create and download blob
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `merged_rows_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addLog(`✅ Download complete: ${mergedData.data.length} rows exported`);
      setProgress({
        current: mergedData.data.length,
        total: mergedData.data.length,
        status: "Download complete!",
      });
    } catch (error) {
      addLog(`❌ Download error: ${error.message}`);
      console.error("Error downloading CSV:", error);
      alert(
        "Error creating download. File may be too large for browser memory."
      );
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setMergedData(null);
    setLogs([]);
    setProgress({ current: 0, total: 0, status: "" });
    addLog("Files cleared");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🧑‍🤝‍🧑 Merge Bro</h1>
      <p className="text-gray-600 mb-6">
        Upload multiple CSV files and merge all rows into one file. Simple row
        stacking - no metadata columns added.
      </p>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload CSV Files</h2>
        <input
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {files.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold">{files.length} file(s) selected:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
              {files.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
            <div className="mt-4 space-x-4">
              <button
                onClick={mergeFiles}
                disabled={files.length < 2 || processing}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {processing ? "🔄 Merging..." : "🔄 Merge Files"}
              </button>
              <button
                onClick={clearFiles}
                disabled={processing}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                Clear Files
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Upload 2 or more CSV files with identical column headers</li>
            <li>• All rows from all files are stacked into one large file</li>
            <li>• First file's headers are used as the master headers</li>
            <li>• Simple row concatenation - no column changes or metadata</li>
          </ul>
        </div>
      </div>

      {/* Progress indicator */}
      {processing && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Processing...</h3>
          <div className="mb-2">
            <strong>
              Progress: {progress.current} / {progress.total}
            </strong>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{
                width: `${
                  progress.total > 0
                    ? (progress.current / progress.total) * 100
                    : 0
                }%`,
              }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">{progress.status}</div>
        </div>
      )}

      {/* Results */}
      {mergedData && (
        <div className="bg-green-50 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-green-800">
            ✅ Merge Complete!
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white rounded">
              <div className="text-2xl font-bold text-blue-600">
                {files.length}
              </div>
              <div className="text-sm text-gray-600">Files Merged</div>
            </div>
            <div className="text-center p-4 bg-white rounded">
              <div className="text-2xl font-bold text-green-600">
                {mergedData.data.length}
              </div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="text-center p-4 bg-white rounded">
              <div className="text-2xl font-bold text-purple-600">
                {mergedData.fields.length}
              </div>
              <div className="text-sm text-gray-600">Columns</div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={exportMergedData}
              disabled={processing}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
            >
              📥 Download Merged File
            </button>
          </div>

          <div className="text-sm text-gray-600 text-center mt-4">
            <p>
              <strong>Simple Merge:</strong> All rows from all files combined
              into one CSV with original headers
            </p>
          </div>
        </div>
      )}

      {/* Processing Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Processing Log</h3>
          <div className="text-sm font-mono max-h-60 overflow-y-auto bg-white p-3 rounded border">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MergedBro;
