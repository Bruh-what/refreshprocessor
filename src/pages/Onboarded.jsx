import React, { useState } from "react";
import "./Onboarded.css";
import {
  autoProcessCompassData,
  downloadProcessedCSV,
} from "../utils/AutoProcessor";
import Papa from "papaparse";

// FUB-specific field patterns (directly from ImportMapper)
const FUB_FIELD_PATTERNS = {
  firstName: ["first name", "first_name", "fname"],
  lastName: ["last name", "last_name", "lname"],
  personalEmail: [
    "email 1",
    "email1",
    "personal email",
    "primary email",
    "email",
  ],
  workEmail: ["email 2", "email2", "work email", "business email"],
  personalPhone: [
    "phone 1",
    "phone1",
    "personal phone",
    "primary phone",
    "phone",
    "mobile phone",
    "cell",
  ],
  workPhone: ["phone 2", "phone2", "work phone", "business phone"],
  title: ["job title", "title", "position", "job"],
  company: ["company name", "company", "organization"],
  website: ["website", "work website", "web"],
  homeAddress: [
    "property address",
    "address 1",
    "address1",
    "home address",
    "street address",
  ],
  homeCity: ["property city", "city", "home city"],
  homeState: ["property state", "state", "home state"],
  homeZip: [
    "property postal code",
    "property zip",
    "zip",
    "zip code",
    "postal code",
  ],
  homeCountry: ["country", "home country"],
  workAddress: ["address 2", "address2", "work address"],
  workCity: ["work city"],
  workState: ["work state"],
  workZip: ["work zip"],
  workCountry: ["work country"],
  groups: ["stage", "groups", "group", "category"],
  tags: ["tags", "tag"],
  birthdate: ["birthday", "birth date", "date of birth", "dob"],
  homeAnniversary: ["home anniversary", "anniversary", "transaction date"],
  notes: ["notes", "note", "comments", "comment"],
};

// Compass output field names
const COMPASS_FIELD_NAMES = {
  firstName: "First Name",
  lastName: "Last Name",
  personalEmail: "Personal Email",
  workEmail: "Work Email",
  personalPhone: "Personal Phone",
  workPhone: "Work Phone",
  title: "Title",
  company: "Company",
  website: "Work Website",
  homeAddress: "Home Address Line 1",
  homeCity: "Home City",
  homeState: "Home State",
  homeZip: "Home Zip",
  homeCountry: "Home Country",
  workAddress: "Work Address Line 1",
  workCity: "Work City",
  workState: "Work State",
  workZip: "Work Zip",
  workCountry: "Work Country",
  groups: "Groups",
  tags: "Tags",
  birthdate: "Birthdate",
  homeAnniversary: "Home Anniversary",
  notes: "Notes",
};

// Flexible column matcher - finds the best matching column name
const findMatchingColumn = (headers, patterns) => {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const pattern of patterns) {
    // Try exact match first
    const exactMatch = normalizedHeaders.findIndex((h) => h === pattern);
    if (exactMatch !== -1) return headers[exactMatch];

    // Try regex pattern match
    try {
      const regex = new RegExp(pattern, "i");
      const regexMatch = normalizedHeaders.findIndex((h) => regex.test(h));
      if (regexMatch !== -1) return headers[regexMatch];
    } catch (e) {
      // Skip invalid regex patterns
    }

    // Try includes match
    const includesMatch = normalizedHeaders.findIndex((h) =>
      h.includes(pattern),
    );
    if (includesMatch !== -1) return headers[includesMatch];
  }

  return null;
};

// Convert FUB CSV to Compass format
const convertFUBToCompass = (data, headers) => {
  // Find all matching columns for each Compass field
  const columnMappings = {};

  Object.entries(FUB_FIELD_PATTERNS).forEach(
    ([compassField, fieldPatterns]) => {
      const matchedColumn = findMatchingColumn(headers, fieldPatterns);
      if (matchedColumn) {
        columnMappings[compassField] = matchedColumn;
      }
    },
  );

  console.log("Column mappings found:", columnMappings);

  return data.map((row) => {
    const compassRow = {};

    // Map each Compass field from the source data
    Object.entries(columnMappings).forEach(([compassField, sourceColumn]) => {
      if (row[sourceColumn]) {
        const outputFieldName = COMPASS_FIELD_NAMES[compassField];
        if (outputFieldName) {
          compassRow[outputFieldName] = row[sourceColumn];
        }
      }
    });

    return compassRow;
  });
};

const Onboarded = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [compassData, setCompassData] = useState(null);
  const [finalProcessedData, setFinalProcessedData] = useState(null);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProcessStatus, setAutoProcessStatus] = useState(null);
  const [showImportMapper, setShowImportMapper] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast helper function
  const addToast = (type, title, description) => {
    const toastMessages = {
      processing: { icon: "📊", class: "processing" },
      duplicates: { icon: "🔍", class: "duplicates" },
      categorizing: { icon: "📂", class: "categorizing" },
      complete: { icon: "✅", class: "complete" },
    };

    const id = Date.now();
    const toast = {
      id,
      type,
      title,
      description,
      ...toastMessages[type],
    };

    setToasts((prev) => [toast, ...prev]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);

    return id;
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Process FUB file to Compass format
  const handleProcessFile = () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setShowImportMapper(true);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const processedRows = convertFUBToCompass(
            results.data,
            results.meta.fields,
          );

          setCompassData(processedRows);
          setIsProcessing(false);
        } catch (error) {
          console.error("Error processing file:", error);
          alert(`Error processing file: ${error.message}`);
          setIsProcessing(false);
        }
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        alert(`Error parsing file: ${err.message}`);
        setIsProcessing(false);
      },
    });
  };

  // Auto-process through duplicate tagger and categorizer
  const handleAutoProcess = async () => {
    if (!compassData) {
      alert("No data to process. Please convert a file first.");
      return;
    }

    setIsAutoProcessing(true);
    setFinalProcessedData(null);

    try {
      // Show processing toasts in sequence
      addToast(
        "processing",
        "Processing rows",
        `Processing ${compassData.length} rows...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      addToast(
        "duplicates",
        "Tagging duplicates",
        "Identifying and tagging duplicates...",
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      addToast(
        "categorizing",
        "Categorizing contacts",
        "Categorizing contacts via repository...",
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Run auto-processing pipeline
      const processed = autoProcessCompassData(compassData);

      addToast("complete", "Processing complete", "Download ready.");

      setFinalProcessedData(processed);
    } catch (error) {
      addToast("error", "Error", error.message);
    } finally {
      setIsAutoProcessing(false);
    }
  };

  return (
    <div className="container">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.class}`}>
            <div className="toast-icon">{toast.icon}</div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-description">{toast.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <img
            src="https://res.cloudinary.com/dqsqmurm6/image/upload/v1772996302/onboardedlogo_n6pxpi.svg"
            alt="Onboarded logo"
          />
        </div>
        <div className="btn-wrapper">
          <button
            className="btn-primary"
            onClick={() =>
              (window.location.href = "mailto:stephen@crmrefresh.org")
            }
          >
            Contact us
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-text">
        <div className="review">
          POWERED BY CRM REFRESH. TRUSTED BY 500+ AGENTS
          <span className="stars">★★★★★</span>
        </div>

        <h1>
          Start client onboarding <br />
          With onboarded by refresh
        </h1>

        <p className="description">
          To get started, upload your Follow Up Boss (FUB) export. Press the
          process button and you will automatically receive a compass formatted
          file with all your duplicates tagged and contacts categorized into
          relevant categories.
        </p>
      </div>

      {/* Upload Controls Section */}
      <div className="upload-controls">
        {!compassData ? (
          <div className="upload-row">
            <div className="upload-area">
              <label htmlFor="crm-upload" className="upload-label">
                <span>{selectedFile ? selectedFile.name : "Upload here"}</span>
                <input
                  type="file"
                  id="crm-upload"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <button
              className="btn-primary process-btn"
              onClick={handleProcessFile}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? "Processing..." : "Process file"}
            </button>
          </div>
        ) : (
          <div className="processing-area">
            <div className="conversion-status">
              <div className="status-badge">
                <span className="check-mark">✓</span>
                <div>
                  <p className="status-title">FUB File Converted</p>
                  <p className="status-detail">
                    {compassData.length} records ready
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleAutoProcess}
              disabled={isAutoProcessing}
              className="btn-primary process-btn full-width"
            >
              {isAutoProcessing ? "Processing..." : "Auto-Process"}
            </button>

            {finalProcessedData && (
              <div className="download-section">
                <button
                  onClick={() =>
                    downloadProcessedCSV(
                      finalProcessedData,
                      `final_processed_contacts_${new Date().toISOString().split("T")[0]}.csv`,
                      true,
                    )
                  }
                  className="btn-primary download-btn"
                >
                  Download Final File
                </button>

                <button
                  onClick={() =>
                    downloadProcessedCSV(
                      compassData,
                      `compass_format_${new Date().toISOString().split("T")[0]}.csv`,
                      false,
                    )
                  }
                  className="btn-secondary download-btn"
                >
                  Download Compass Only
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="visual-grid">
        {/* Left Card - Visual Only */}
        <div className="card large-card">
          <img
            src="https://res.cloudinary.com/dqsqmurm6/image/upload/v1773007804/leftsidevisual2_uojdz7.svg"
            className="card-visual"
            alt="upload illustration"
          />
        </div>

        {/* Right Card - Visual Only */}
        <div className="card large-card">
          <img
            src="https://res.cloudinary.com/dqsqmurm6/image/upload/v1773008903/rightsidevisual2_vxj5wl.svg"
            alt="CRM integrations illustration"
            className="card-visual"
          />
        </div>
      </div>
    </div>
  );
};

export default Onboarded;
