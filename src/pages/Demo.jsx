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

  const handleUpload = (fieldName) => {
    if (!files[fieldName]) {
      alert("Please select a file first");
      return;
    }
    
    // Simulate upload
    setUploadStatus((prev) => ({
      ...prev,
      [fieldName]: "uploading",
    }));

    setTimeout(() => {
      setUploadStatus((prev) => ({
        ...prev,
        [fieldName]: "success",
      }));
    }, 1500);
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
      <div className="upload-field">
        <div className="field-header">
          <h3>{label}</h3>
          <p className="field-description">Upload your {label.toLowerCase()} file</p>
        </div>

        <div
          className={`upload-area ${file ? "has-file" : ""}`}
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
            <label htmlFor={`file-${fieldName}`} className="upload-label">
              <div className="upload-icon">
                <svg
                  width="24"
                  height="24"
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
              <span className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </span>
              <span className="upload-hint">CSV or Excel files</span>
            </label>
          ) : (
            <div className="file-info">
              <div className="file-icon">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
              </div>
              <div className="file-details">
                <p className="file-name">{file.name}</p>
                <p className="file-size">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {status === "success" && (
                <div className="status-icon success">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              )}
              {status === "uploading" && (
                <div className="status-icon uploading">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className={`upload-button ${status === "success" ? "success" : ""} ${
            status === "uploading" ? "uploading" : ""
          }`}
          onClick={() => handleUpload(fieldName)}
          disabled={!file || status === "uploading"}
        >
          {status === "uploading"
            ? "Uploading..."
            : status === "success"
            ? "Uploaded"
            : "Upload File"}
        </button>
      </div>
    );
  };

  return (
    <div className="demo-page">
      <div className="demo-container">
        {/* Header */}
        <div className="demo-header">
          <h1>Data Import</h1>
          <p>Upload your contact and lead data files to get started</p>
        </div>

        {/* Upload Fields */}
        <div className="upload-grid">
          <UploadField fieldName="followupboss" label="FollowUpBoss" />
          <UploadField fieldName="compassContacts" label="Compass Contacts" />
          <UploadField fieldName="phoneContacts" label="Phone Contacts" />
        </div>

        {/* Info Section */}
        <div className="info-section">
          <div className="info-box">
            <h3>Supported File Formats</h3>
            <ul>
              <li>CSV (.csv)</li>
              <li>Excel (.xlsx, .xls)</li>
            </ul>
          </div>
          <div className="info-box">
            <h3>File Requirements</h3>
            <ul>
              <li>Maximum file size: 50 MB</li>
              <li>First row must contain column headers</li>
              <li>UTF-8 encoding recommended</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo;
