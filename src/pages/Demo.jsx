import React, { useState, useRef } from "react";
import "./Demo.css";
import {
  ProcessingPipeline,
  convertToCSV,
  downloadCSV,
} from "../utils/ProcessingPipeline";

const Demo = () => {
  const [files, setFiles] = useState({
    followupboss: null,
    compassContacts: null,
    phoneContacts: null,
  });

  const [uploadStatus, setUploadStatus] = useState({
    followupboss: null,
    compassContacts: null,
    phoneContacts: null,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [logs, setLogs] = useState([]);
  const [processedData, setProcessedData] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const logsEndRef = useRef(null);

  // Auto-scroll logs to bottom
  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message) => {
    setLogs((prev) => [...prev, message]);
  };

  const handleFileChange = (fieldName, file) => {
    if (file && file.size > 50 * 1024 * 1024) {
      alert("File is too large. Maximum size is 50MB.");
      return;
    }
    setFiles((prev) => ({
      ...prev,
      [fieldName]: file,
    }));
    setUploadStatus((prev) => ({
      ...prev,
      [fieldName]: null,
    }));
    // Clear previous processing when new files are uploaded
    setProcessedData(null);
    setProcessingError(null);
    setLogs([]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, fieldName) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileChange(fieldName, droppedFiles[0]);
    }
  };

  const handleProcess = async () => {
    // Check if all files are uploaded
    if (!files.followupboss || !files.compassContacts || !files.phoneContacts) {
      alert("Please upload all three files before processing");
      return;
    }

    setIsProcessing(true);
    setCurrentStage(1);
    setLogs([]);
    setProcessingError(null);
    setProcessedData(null);

    try {
      // Create pipeline with progress callback
      const pipeline = new ProcessingPipeline((progress) => {
        if (progress.type === "log") {
          addLog(progress.message);
        } else if (progress.type === "stage") {
          setCurrentStage(progress.stage);
        } else if (progress.type === "complete") {
          setProcessedData(progress.data);
          addLog("🎉 Processing pipeline completed successfully!");
        } else if (progress.type === "error") {
          setProcessingError(progress.error);
          addLog(`❌ Pipeline error: ${progress.error}`);
        }
      });

      // Execute the pipeline
      const result = await pipeline.execute(
        files.followupboss,
        files.phoneContacts,
        files.compassContacts,
      );

      setProcessedData(result);
      setProcessingError(null);
    } catch (error) {
      console.error("Pipeline execution error:", error);
      setProcessingError(error.message);
      addLog(`❌ Fatal error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedData) return;
    const csv = convertToCSV(processedData);
    downloadCSV(
      csv,
      `processed_contacts_${new Date().toISOString().split("T")[0]}.csv`,
    );
    addLog("📥 Downloaded processed contacts file");
  };

  const getFieldLabel = (fieldName) => {
    const labels = {
      followupboss: "FollowUpBoss",
      compassContacts: "Compass Contacts",
      phoneContacts: "Phone Contacts",
    };
    return labels[fieldName];
  };

  const UploadField = ({ fieldName, label }) => {
    const file = files[fieldName];
    const status = uploadStatus[fieldName];

    return (
      <div className="upload-field-compact">
        <div className="field-label">
          <label htmlFor={`file-${fieldName}`}>{label}</label>
        </div>

        <div
          className={`upload-area-compact ${file ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, fieldName)}
        >
          <input
            type="file"
            id={`file-${fieldName}`}
            className="file-input"
            onChange={(e) =>
              handleFileChange(fieldName, e.target.files?.[0] || null)
            }
            accept=".csv,.xlsx,.xls"
          />

          {!file ? (
            <label
              htmlFor={`file-${fieldName}`}
              className="upload-label-compact"
            >
              <div className="upload-icon-small">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <span className="upload-text-compact">Click or drag file</span>
            </label>
          ) : (
            <div className="file-info-compact">
              <div className="file-icon-small">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
              </div>
              <div className="file-details-compact">
                <p className="file-name-compact">{file.name}</p>
                <p className="file-size-compact">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {status === "success" && (
                <div className="status-icon-compact success">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const allFilesUploaded =
    files.followupboss && files.compassContacts && files.phoneContacts;

  return (
    <div className="demo-page-fullscreen">
      <div className="demo-container-fullscreen">
        {/* Header */}
        <div className="demo-header-compact">
          <h1>Import Contact Data</h1>
          <p>Upload your files and process them together</p>
        </div>

        {/* Upload Fields - Inline */}
        <div className="upload-grid-inline">
          <UploadField fieldName="followupboss" label="FollowUpBoss" />
          <UploadField fieldName="compassContacts" label="Compass Contacts" />
          <UploadField fieldName="phoneContacts" label="Phone Contacts" />
        </div>

        {/* Process Button */}
        <div className="process-section">
          <button
            className={`process-button ${allFilesUploaded ? "ready" : ""} ${
              isProcessing ? "processing" : ""
            }`}
            onClick={handleProcess}
            disabled={!allFilesUploaded || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="spinner-small"></span>
                Processing... (Stage {currentStage}/5)
              </>
            ) : (
              "Process Files"
            )}
          </button>
          {!allFilesUploaded && (
            <p className="helper-text">
              Upload all three files to enable processing
            </p>
          )}
        </div>

        {/* Processing Status & Logs */}
        {(isProcessing || logs.length > 0) && (
          <div className="processing-section">
            <div className="logs-container">
              <h3>Processing Logs</h3>
              <div className="logs-output">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {processedData && (
          <div className="results-section">
            <div className="results-header">
              <h3>Processing Complete</h3>
              <p>{processedData.length} contacts processed successfully</p>
            </div>
            <button className="download-button" onClick={handleDownload}>
              📥 Download Processed File
            </button>
          </div>
        )}

        {/* Error Section */}
        {processingError && (
          <div className="error-section">
            <h3>⚠️ Processing Error</h3>
            <p>{processingError}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Demo;
