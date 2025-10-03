import React, { useState, useCallback } from "react";

const FileUpload = ({
  title,
  description,
  accept,
  multiple = false,
  onFileSelect,
  required = false,
  files = null,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        if (multiple) {
          onFileSelect(droppedFiles);
        } else {
          onFileSelect(droppedFiles[0]);
        }
      }
    },
    [multiple, onFileSelect]
  );

  const handleFileChange = useCallback(
    (e) => {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 0) {
        if (multiple) {
          onFileSelect(selectedFiles);
        } else {
          onFileSelect(selectedFiles[0]);
        }
      }
    },
    [multiple, onFileSelect]
  );

  const removeFile = useCallback(
    (indexToRemove) => {
      if (multiple && Array.isArray(files)) {
        const updatedFiles = files.filter(
          (_, index) => index !== indexToRemove
        );
        onFileSelect(updatedFiles);
      } else {
        onFileSelect(null);
      }
    },
    [files, multiple, onFileSelect]
  );

  const getFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProcessingTimeEstimate = (size) => {
    // Rough estimates based on file size
    if (size < 1024 * 1024) return "Few seconds"; // < 1MB
    if (size < 5 * 1024 * 1024) return "10-30 seconds"; // 1-5MB
    if (size < 10 * 1024 * 1024) return "30-60 seconds"; // 5-10MB
    return "1-3 minutes"; // > 10MB
  };

  return (
    <div className="file-upload-container">
      <label className="file-upload-label">
        <strong>{title}</strong>{" "}
        {required && <span style={{ color: "red" }}>*</span>}
      </label>
      <p className="file-upload-description">{description}</p>

      <div
        className={`file-upload ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() =>
          document
            .getElementById(`file-input-${title.replace(/\s+/g, "-")}`)
            .click()
        }
      >
        <input
          id={`file-input-${title.replace(/\s+/g, "-")}`}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div className="file-upload-content">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
          <p>
            <strong>Click to upload</strong> or drag and drop files here
          </p>
          <p style={{ fontSize: "0.9em", opacity: 0.7 }}>
            Accepted formats: {accept}
          </p>
        </div>
      </div>

      {/* Display selected files */}
      {files && (
        <div className="selected-files">
          {multiple && Array.isArray(files) ? (
            files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-info">
                  <strong>{file.name}</strong>
                  <div style={{ fontSize: "0.9em", opacity: 0.7 }}>
                    {getFileSize(file.size)} • Est. processing:{" "}
                    {getProcessingTimeEstimate(file.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ff6b6b",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                >
                  ×
                </button>
              </div>
            ))
          ) : !multiple && files ? (
            <div className="file-item">
              <div className="file-info">
                <strong>{files.name}</strong>
                <div style={{ fontSize: "0.9em", opacity: 0.7 }}>
                  {getFileSize(files.size)} • Est. processing:{" "}
                  {getProcessingTimeEstimate(files.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ff6b6b",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
