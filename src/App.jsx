import React, { useState, useRef } from "react";
import FileUpload from "./components/FileUpload";
import ProcessingStatus from "./components/ProcessingStatus";
import ResultsDisplay from "./components/ResultsDisplay";
import RealEstateProcessor from "./utils/RealEstateProcessor";
import Splitter from "./components/Splitter";
import EmailVerifier from "./components/EmailVerifier";
import DuplicateRemover from "./components/DuplicateRemover";

function App() {
  const [files, setFiles] = useState({
    compass: null,
    phone: null,
    mls: [],
  });

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [chatGptApiKey, setChatGptApiKey] = useState("");

  const processorRef = useRef(new RealEstateProcessor());

  const handleFileSelect = (type, selectedFiles) => {
    setFiles((prev) => ({
      ...prev,
      [type]: selectedFiles,
    }));

    // Clear previous results when files change
    if (results) {
      setResults(null);
      setStats(null);
    }

    // Reset the processor when files change
    processorRef.current.resetProcessor();
    console.log("Processor reset due to file change");
  };

  const processFiles = async () => {
    if (!files.compass && !files.phone) {
      setError(
        "Please select at least one contact file (Compass or Phone export)"
      );
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCurrentStep(0);
    setTotalSteps(0);
    setError("");
    setStatusMessage("Starting file processing...");

    // Reset processor to ensure clean stats
    processorRef.current.resetProcessor();

    // Set the ChatGPT API key if provided
    if (chatGptApiKey) {
      processorRef.current.setChatGptApiKey(chatGptApiKey);
      console.log("ChatGPT API key set for processing");
    }

    console.log("Stats before processing:", processorRef.current.getStats());

    try {
      // Progress callback
      const onProgress = (progressInfo) => {
        setProgress(progressInfo.progress);
        setCurrentStep(progressInfo.step);
        setTotalSteps(progressInfo.totalSteps);
        setStatusMessage(progressInfo.message);
      };

      // Log callback for debugging
      const onLog = (message) => {
        console.log(message);
        setLogs((prev) => [
          ...prev,
          `${new Date().toLocaleTimeString()}: ${message}`,
        ]);
      };

      const processedData = await processorRef.current.processFiles(
        files.compass,
        files.phone,
        files.mls,
        onProgress,
        onLog
      );

      const processingStats = processorRef.current.getStats();
      console.log("Stats after processing:", processingStats);

      setResults(processedData);
      setStats(processingStats);

      setStatusMessage(
        `Successfully processed ${processingStats.totalRecords} contacts with ${processingStats.changedRecords} updates`
      );
      setProcessing(false);
    } catch (error) {
      console.error("Processing error:", error);
      setError(`Error processing files: ${error.message}`);
      setProcessing(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  const exportChangedRecords = () => {
    console.log("Export changed records only clicked");

    // Use the new function for exporting only changed records
    processorRef.current.exportOnlyChangedRecords(
      "compass_import_changed_records_only.csv"
    );
  };

  const exportChangedWithAnniversary = () => {
    console.log("Export changed records with anniversary records clicked");

    try {
      // Helper function to check if a record has anniversary or closed date tags
      const hasAnniversaryOrClosedDateTag = (record) => {
        if (!record.Tags) return false;
        const tagsLower = record.Tags.toLowerCase();
        return (
          tagsLower.includes("home anniversary") ||
          tagsLower.includes("closed date")
        );
      };

      // Helper function to check if a record has CRM: Merged tag
      const hasMergeTag = (record) => {
        if (!record.Tags) return false;
        const tagsLower = record.Tags.toLowerCase();
        return tagsLower.includes("crm: merged");
      };

      // Helper function to check if a record has CRM: Duplicate tag
      const hasDuplicateTag = (record) => {
        if (!record.Tags) return false;
        return record.Tags.includes("CRM: Duplicate");
      };

      // Get all processed data
      const allProcessedData = processorRef.current.getProcessedData();
      if (!allProcessedData || allProcessedData.length === 0) {
        setError("No processed data found to export.");
        return;
      }

      // Get changed records
      const changedRecords = processorRef.current.getChangedRecords();
      console.log(`Found ${changedRecords.length} changed records`);

      // Find all data sources (similar to the exportOnlyHomeAnniversaryRecords function)
      // We'll first look in the processor's raw data if available
      let compassData = [];
      let phoneData = [];

      try {
        // Try to access raw data from the processor
        compassData = processorRef.current.compassData || [];
        phoneData = processorRef.current.phoneData || [];
      } catch (e) {
        console.log("Could not access raw data sources:", e);
      }

      // Find anniversary records from processed data
      const processedAnniversaryRecords = allProcessedData.filter(
        (record) =>
          hasAnniversaryOrClosedDateTag(record) && !hasDuplicateTag(record)
      );
      console.log(
        `Found ${processedAnniversaryRecords.length} anniversary records in processed data`
      );

      // Find anniversary records from compass data
      const compassAnniversaryRecords = compassData
        .filter(
          (record) =>
            record.Tags &&
            hasAnniversaryOrClosedDateTag(record) &&
            !hasDuplicateTag(record)
        )
        .map((record) => {
          // Look for a matching processed record to get any updated tags
          const firstName = (record["First Name"] || "").toLowerCase().trim();
          const lastName = (record["Last Name"] || "").toLowerCase().trim();

          // Create a copy to modify
          const updatedRecord = { ...record };

          if (firstName && lastName) {
            // Try to find a processed version of this record
            const processedRecord = allProcessedData.find(
              (pr) =>
                (pr["First Name"] || "").toLowerCase().trim() === firstName &&
                (pr["Last Name"] || "").toLowerCase().trim() === lastName
            );

            if (processedRecord) {
              // Use the processed record's tags if they exist
              if (processedRecord["Tags"]) {
                updatedRecord["Tags"] = processedRecord["Tags"];
              }
            }
          }

          // Ensure we have a Changes Made field
          updatedRecord["Changes Made"] =
            "Included for Home Anniversary/Closed Date tag";

          return updatedRecord;
        });
      console.log(
        `Found ${compassAnniversaryRecords.length} anniversary records in Compass data`
      );

      // Find anniversary records from phone data
      const phoneAnniversaryRecords = phoneData
        .filter(
          (record) =>
            record.Tags &&
            hasAnniversaryOrClosedDateTag(record) &&
            !hasDuplicateTag(record)
        )
        .map((record) => {
          // Look for a matching processed record to get any updated tags
          const firstName = (record["First Name"] || "").toLowerCase().trim();
          const lastName = (record["Last Name"] || "").toLowerCase().trim();

          // Create a copy to modify
          const updatedRecord = { ...record };

          if (firstName && lastName) {
            // Try to find a processed version of this record
            const processedRecord = allProcessedData.find(
              (pr) =>
                (pr["First Name"] || "").toLowerCase().trim() === firstName &&
                (pr["Last Name"] || "").toLowerCase().trim() === lastName
            );

            if (processedRecord) {
              // Use the processed record's tags if they exist
              if (processedRecord["Tags"]) {
                updatedRecord["Tags"] = processedRecord["Tags"];
              }
            }
          }

          // Ensure we have a Changes Made field
          updatedRecord["Changes Made"] =
            "Included for Home Anniversary/Closed Date tag";

          return updatedRecord;
        });
      console.log(
        `Found ${phoneAnniversaryRecords.length} anniversary records in Phone data`
      );

      // Find records with CRM: Merged tag from all processed data
      const mergedRecords = allProcessedData.filter((record) =>
        hasMergeTag(record)
      );
      console.log(`Found ${mergedRecords.length} records with CRM: Merged tag`);

      // Create a map to deduplicate based on name
      const uniqueRecordsMap = new Map();

      // First add CRM: Merged records (highest priority)
      let mergeTagsAdded = 0;
      for (const record of mergedRecords) {
        const firstName = (record["First Name"] || "").toLowerCase().trim();
        const lastName = (record["Last Name"] || "").toLowerCase().trim();

        if (firstName && lastName) {
          const key = `${firstName}|${lastName}`;

          // Add a Changes Made field if it doesn't exist
          if (
            !record["Changes Made"] ||
            record["Changes Made"] === "No changes made"
          ) {
            record["Changes Made"] = "Included for CRM: Merged tag";
          }

          uniqueRecordsMap.set(key, record);
          mergeTagsAdded++;
        }
      }
      console.log(`Added ${mergeTagsAdded} merge-tagged records to map`);

      // Next add changed records if not already in the map
      let changedRecordsAdded = 0;
      for (const record of changedRecords) {
        const firstName = (record["First Name"] || "").toLowerCase().trim();
        const lastName = (record["Last Name"] || "").toLowerCase().trim();

        if (firstName && lastName) {
          const key = `${firstName}|${lastName}`;
          if (!uniqueRecordsMap.has(key)) {
            uniqueRecordsMap.set(key, record);
            changedRecordsAdded++;
          }
        }
      }
      console.log(`Added ${changedRecordsAdded} additional changed records`);

      // Add processed anniversary records if not already in the map
      let processedAnniversaryAdded = 0;
      for (const record of processedAnniversaryRecords) {
        const firstName = (record["First Name"] || "").toLowerCase().trim();
        const lastName = (record["Last Name"] || "").toLowerCase().trim();

        if (firstName && lastName) {
          const key = `${firstName}|${lastName}`;
          if (!uniqueRecordsMap.has(key)) {
            uniqueRecordsMap.set(key, record);
            processedAnniversaryAdded++;
          }
        }
      }
      console.log(
        `Added ${processedAnniversaryAdded} processed anniversary records`
      );

      // Add Compass anniversary records if not already in the map
      let compassAnniversaryAdded = 0;
      for (const record of compassAnniversaryRecords) {
        const firstName = (record["First Name"] || "").toLowerCase().trim();
        const lastName = (record["Last Name"] || "").toLowerCase().trim();

        if (firstName && lastName) {
          const key = `${firstName}|${lastName}`;
          if (!uniqueRecordsMap.has(key)) {
            uniqueRecordsMap.set(key, record);
            compassAnniversaryAdded++;
          }
        }
      }
      console.log(
        `Added ${compassAnniversaryAdded} Compass anniversary records`
      );

      // Add Phone anniversary records if not already in the map
      let phoneAnniversaryAdded = 0;
      for (const record of phoneAnniversaryRecords) {
        const firstName = (record["First Name"] || "").toLowerCase().trim();
        const lastName = (record["Last Name"] || "").toLowerCase().trim();

        if (firstName && lastName) {
          const key = `${firstName}|${lastName}`;
          if (!uniqueRecordsMap.has(key)) {
            uniqueRecordsMap.set(key, record);
            phoneAnniversaryAdded++;
          }
        }
      }
      console.log(`Added ${phoneAnniversaryAdded} Phone anniversary records`);

      // Convert to array
      const recordsToExport = Array.from(uniqueRecordsMap.values());
      console.log(
        `Exporting ${uniqueRecordsMap.size} total records ` +
          `(${mergeTagsAdded} merge-tagged + ${changedRecordsAdded} changed + ` +
          `${
            processedAnniversaryAdded +
            compassAnniversaryAdded +
            phoneAnniversaryAdded
          } anniversary)`
      );

      // Add a debug log to verify CRM: Merged tags are present
      const mergedTagsInExport = recordsToExport.filter(
        (r) => r["Tags"] && r["Tags"].includes("CRM: Merged")
      ).length;
      console.log(
        `Number of records with CRM: Merged tag in export: ${mergedTagsInExport}`
      );

      // Fields to exclude for import
      const importExclusions = [
        "Created At",
        "Last Contacted",
        "Changes Made",
        "Category",
        "Agent Classification",
        "Client Classification",
        "Vendor Classification",
      ];

      // Export directly using exportToCSV
      processorRef.current.exportToCSV(
        recordsToExport,
        "compass_import_with_anniversary.csv",
        importExclusions
      );

      // Update logs
      setLogs((prev) => [
        ...prev,
        `${new Date().toLocaleTimeString()}: Exported ${
          recordsToExport.length
        } records ` +
          `(${mergeTagsAdded} merge-tagged + ${changedRecordsAdded} changed + ` +
          `${
            processedAnniversaryAdded +
            compassAnniversaryAdded +
            phoneAnniversaryAdded
          } anniversary)`,
      ]);
    } catch (error) {
      console.error("Error exporting changed with anniversary records:", error);
      setError(`Export failed: ${error.message}`);
    }
  };

  const exportOnlyAnniversary = () => {
    console.log("Export only anniversary records clicked");

    // Use the new function for exporting only anniversary records
    processorRef.current.exportOnlyHomeAnniversaryRecords(
      "compass_import_anniversary_only.csv"
    );
  };

  const exportAllRecords = () => {
    console.log("Export all records clicked");
    const allRecords = processorRef.current.getProcessedData();
    console.log("All records:", allRecords);
    console.log("All records length:", allRecords.length);

    if (!allRecords || allRecords.length === 0) {
      setError("No processed data found to export.");
      return;
    }

    processorRef.current.exportToCSV(allRecords, "all_processed_contacts.csv");
  };

  const resetApp = () => {
    setFiles({ compass: null, phone: null, mls: [] });
    setResults(null);
    setStats(null);
    setError("");
    setStatusMessage("");
    setProgress(0);
    setCurrentStep(0);
    setTotalSteps(0);
    setProcessing(false);
    setLogs([]);
    // Reset the processor to a fresh instance
    processorRef.current = new RealEstateProcessor();
  };

  return (
    <div className="App">
      <header style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1>Real Estate Contact Processor</h1>
        <p>
          Merge, deduplicate, and classify your real estate contacts for CRM
          import
        </p>
      </header>

      <main>
        {/* File Upload Section */}
        <section className="upload-section">
          <h2>Upload Files</h2>

          {/* ChatGPT API Key Input */}
          <div className="file-upload-card">
            <div className="card-header">
              <h3>ChatGPT API Key (Optional)</h3>
            </div>
            <div className="card-body">
              <p>
                Enter your ChatGPT API key to help classify ungrouped contacts.
                The key is used only for classification and is never stored.
              </p>
              <div className="input-container" style={{ marginTop: "10px" }}>
                <input
                  type="password"
                  value={chatGptApiKey}
                  onChange={(e) => setChatGptApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="form-control"
                  style={{ width: "100%", padding: "8px", fontSize: "16px" }}
                />
              </div>
            </div>
          </div>

          <FileUpload
            title="Compass Export"
            description="Your main contact database export from Compass CRM (CSV format)"
            accept=".csv"
            onFileSelect={(file) => handleFileSelect("compass", file)}
            files={files.compass}
            required={!files.phone}
          />

          <FileUpload
            title="Phone Export"
            description="Additional contact data with phone numbers (CSV format)"
            accept=".csv"
            onFileSelect={(file) => handleFileSelect("phone", file)}
            files={files.phone}
            required={!files.compass}
          />

          <FileUpload
            title="MLS Files (Optional)"
            description="MLS property data for past client identification (CSV or Excel)"
            accept=".csv,.xlsx,.xls"
            multiple={true}
            onFileSelect={(files) => handleFileSelect("mls", files)}
            files={files.mls}
          />
        </section>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Processing Controls */}
        <section
          className="control-section"
          style={{ textAlign: "center", margin: "2rem 0" }}
        >
          <button
            onClick={processFiles}
            disabled={processing || (!files.compass && !files.phone)}
            style={{
              fontSize: "1.2em",
              padding: "1rem 2rem",
              marginRight: "1rem",
            }}
          >
            {processing ? "Processing..." : "Process Files"}
          </button>

          {(results || error) && (
            <button
              onClick={resetApp}
              style={{ fontSize: "1.2em", padding: "1rem 2rem" }}
            >
              Start Over
            </button>
          )}
        </section>

        {/* Processing Status */}
        <ProcessingStatus
          isProcessing={processing}
          progress={progress}
          currentStep={currentStep}
          totalSteps={totalSteps}
          statusMessage={statusMessage}
        />

        {/* Results */}
        {stats && (
          <ResultsDisplay
            stats={stats}
            onExportChanged={exportChangedRecords}
            onExportWithAnniversary={exportChangedWithAnniversary}
            onExportOnlyAnniversary={exportOnlyAnniversary}
            onExportAll={exportAllRecords}
          />
        )}

        {/* Duplicate Remover */}
        {stats && results && (
          <DuplicateRemover
            processor={processorRef.current}
            onComplete={(cleanedData, cleaningStats) => {
              console.log("Duplicate removal complete:", cleaningStats);
              setLogs((prev) => [
                ...prev,
                `${new Date().toLocaleTimeString()}: Removed ${
                  cleaningStats.duplicatesRemoved
                } duplicates, kept ${
                  cleaningStats.mergedRecords
                } merged records`,
              ]);
            }}
          />
        )}

        {/* Debug Logs */}
        {logs.length > 0 && (
          <section className="logs-section" style={{ marginTop: "2rem" }}>
            <h3>Processing Logs</h3>
            <div
              style={{
                background: "#f5f5f5",
                padding: "1rem",
                maxHeight: "300px",
                overflow: "auto",
                fontSize: "0.9em",
                fontFamily: "monospace",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              {logs.map((log, index) => (
                <div key={index} style={{ color: "#1e3a8a" }}>
                  {log}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer
        style={{
          textAlign: "center",
          marginTop: "3rem",
          padding: "2rem",
          borderTop: "1px solid #ccc",
        }}
      >
        <h3>How it works:</h3>
        <div style={{ textAlign: "left", maxWidth: "800px", margin: "0 auto" }}>
          <ol>
            <li>
              <strong>Deduplication:</strong> Uses fuzzy name matching to merge
              duplicate contacts from different sources
            </li>
            <li>
              <strong>Data Merging:</strong> Combines phone numbers, emails, and
              addresses without overwriting existing data
            </li>
            <li>
              <strong>Agent Classification:</strong> Identifies real estate
              agents based on email domains from major brokerages
            </li>
            <li>
              <strong>Vendor Classification:</strong> Detects vendors (title
              companies, lenders, etc.) through email domain keywords
            </li>
            <li>
              <strong>Past Client Detection:</strong> Matches contact addresses
              with MLS data to identify previous clients
            </li>
            <li>
              <strong>Group Assignment:</strong> Automatically assigns contacts
              to appropriate groups for CRM organization
            </li>
          </ol>
        </div>
      </footer>

      {/* CSV File Splitter Section */}
      <Splitter />

      {/* Email Verification Section */}
      <EmailVerifier />

      {/* Duplicate Remover Section */}
      <DuplicateRemover />
    </div>
  );
}

export default App;
