import React, { useState } from "react";
import "./Demo.css";

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

  const handleFileChange = (fieldName, file) => {
    setFiles((prev) => ({
      ...prev,
      [fieldName]: file,
    }));
    setUploadStatus((prev) => ({
      ...prev,
      [fieldName]: null,
    }));
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

  const handleProcess = () => {
    // Check if all files are uploaded
    if (!files.followupboss || !files.compassContacts || !files.phoneContacts) {
      alert("Please upload all three files before processing");
      return;
    }

    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      alert("Files processed successfully!");
      // Reset files after processing
      setFiles({
        followupboss: null,
        compassContacts: null,
        phoneContacts: null,
      });
      setUploadStatus({
        followupboss: null,
        compassContacts: null,
        phoneContacts: null,
      });
    }, 2000);
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
            <label htmlFor={`file-${fieldName}`} className="upload-label-compact">
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
                Processing...
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

      </div>
    </div>
  );
};

export default Demo;
