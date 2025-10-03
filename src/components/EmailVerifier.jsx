import React, { useState, useCallback } from "react";
import FileUpload from "./FileUpload";
import ProcessingStatus from "./ProcessingStatus";
import Papa from "papaparse";

const EmailVerifier = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [costEstimate, setCostEstimate] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [emailColumns, setEmailColumns] = useState([]);
  const [verificationResults, setVerificationResults] = useState([]);

  // Bouncer API integration
  const verifyEmailWithBouncer = async (email, apiKey) => {
    if (!email || !email.includes("@")) {
      return {
        email,
        status: "invalid",
        reason: "Invalid email format",
        deliverable: false,
        risk: "high",
      };
    }

    try {
      const response = await fetch(
        `https://api.usebouncer.com/v1.1/email/verify?email=${encodeURIComponent(
          email
        )}&timeout=10`,
        {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `API Error: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        email,
        status: data.status || "unknown",
        reason: data.reason || "No reason provided",
        deliverable: data.status === "deliverable",
        risk: data.risk || "unknown",
        suggestion: data.suggestion || null,
      };
    } catch (error) {
      console.error(`Error verifying ${email}:`, error);
      return {
        email,
        status: "error",
        reason: error.message,
        deliverable: null,
        risk: "unknown",
      };
    }
  };

  // Parse CSV and detect email columns
  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn("CSV parsing warnings:", results.errors);
          }

          // Detect email columns
          const headers = Object.keys(results.data[0] || {});
          const emailCols = headers.filter(
            (header) =>
              header.toLowerCase().includes("email") ||
              header.toLowerCase().includes("e-mail") ||
              header.toLowerCase().includes("mail")
          );

          resolve({
            data: results.data,
            headers: headers,
            emailColumns: emailCols,
          });
        },
        error: (error) => reject(error),
      });
    });
  };

  // Extract unique emails from parsed data
  const extractUniqueEmails = (data, emailColumns) => {
    const emailSet = new Set();

    data.forEach((row) => {
      emailColumns.forEach((col) => {
        const email = row[col];
        if (email && email.trim() && email.includes("@")) {
          emailSet.add(email.toLowerCase().trim());
        }
      });
    });

    return Array.from(emailSet);
  };

  // Sleep function for rate limiting
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleFileSelect = useCallback(async (file) => {
    setCsvFile(file);
    setResults(null);
    setError("");
    setCostEstimate(null);
    setParsedData(null);
    setEmailColumns([]);
    setVerificationResults([]);

    if (file) {
      try {
        // Parse CSV to get accurate email count
        const parsed = await parseCSVFile(file);
        setParsedData(parsed);
        setEmailColumns(parsed.emailColumns);

        // Extract unique emails for cost estimation
        const uniqueEmails = extractUniqueEmails(
          parsed.data,
          parsed.emailColumns
        );

        setCostEstimate({
          emails: uniqueEmails.length,
          cost: (uniqueEmails.length * 0.008).toFixed(2),
          emailColumns: parsed.emailColumns,
        });
      } catch (error) {
        setError(`Error parsing CSV: ${error.message}`);
      }
    }
  }, []);

  const processEmailVerification = async () => {
    if (!csvFile) {
      setError("Please select a CSV file to process");
      return;
    }

    if (!apiKey.trim()) {
      setError("Please enter your Bouncer API key");
      return;
    }

    // Confirm cost
    if (costEstimate && costEstimate.cost > 0) {
      const confirmed = window.confirm(
        `This will verify approximately ${costEstimate.emails} emails.\n` +
          `Estimated cost: $${costEstimate.cost}\n\n` +
          `Continue with verification?`
      );

      if (!confirmed) return;
    }

    setProcessing(true);
    setProgress(0);
    setCurrentStep(0);
    setTotalSteps(4);
    setError("");
    setStatusMessage("Starting email verification...");

    try {
      // Step 1: Parse CSV
      setCurrentStep(1);
      setProgress(25);
      setStatusMessage("Parsing CSV file...");

      // Use already parsed data or parse if not available
      let dataToProcess = parsedData;
      if (!dataToProcess) {
        dataToProcess = await parseCSVFile(csvFile);
        setParsedData(dataToProcess);
        setEmailColumns(dataToProcess.emailColumns);
      }

      // Step 2: Extract emails
      setCurrentStep(2);
      setProgress(50);
      setStatusMessage("Extracting email addresses...");

      const uniqueEmails = extractUniqueEmails(
        dataToProcess.data,
        dataToProcess.emailColumns
      );

      if (uniqueEmails.length === 0) {
        setError("No valid email addresses found in the CSV file");
        return;
      }

      // Step 3: Verify emails with Bouncer API
      setCurrentStep(3);
      setProgress(75);
      setStatusMessage(
        `Verifying ${uniqueEmails.length} email addresses with Bouncer API...`
      );

      // Process emails in batches to avoid rate limiting
      const batchSize = 50;
      const verificationResults = [];

      for (let i = 0; i < uniqueEmails.length; i += batchSize) {
        const batch = uniqueEmails.slice(i, i + batchSize);

        // Process batch with delay between requests
        for (const email of batch) {
          try {
            setStatusMessage(
              `Verifying email ${verificationResults.length + 1} of ${
                uniqueEmails.length
              }: ${email}`
            );

            const result = await verifyEmailWithBouncer(email, apiKey);
            verificationResults.push({
              email,
              ...result,
            });

            // Update progress within step 3 (75% to 95%)
            const emailProgress =
              (verificationResults.length / uniqueEmails.length) * 20;
            setProgress(75 + emailProgress);

            // Small delay between requests to be respectful to the API
            await sleep(100);
          } catch (error) {
            console.error(`Error verifying ${email}:`, error);
            verificationResults.push({
              email,
              status: "error",
              result: "unknown",
              reason: error.message,
            });
          }
        }

        // Longer delay between batches
        if (i + batchSize < uniqueEmails.length) {
          await sleep(1000);
        }
      }

      // Step 4: Generate results
      setCurrentStep(4);
      setProgress(100);
      setStatusMessage("Generating cleaned CSV...");

      // Calculate results summary
      const summary = verificationResults.reduce((acc, result) => {
        const status = result.result || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      setResults({
        totalEmails: verificationResults.length,
        validEmails: summary.deliverable || 0,
        invalidEmails: (summary.undeliverable || 0) + (summary.unknown || 0),
        riskyEmails: summary.risky || 0,
        processed: true,
        filename: `verified_${csvFile.name}`,
        verificationData: verificationResults,
      });

      setVerificationResults(verificationResults);
      setStatusMessage("Email verification completed successfully!");

      // Clear API key for security
      setApiKey("");
    } catch (error) {
      console.error("Email verification error:", error);
      setError(`Error during verification: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadCleanedCSV = () => {
    if (!results || !results.verificationData) {
      setError("No verification data available for download");
      return;
    }

    // Create CSV content with verification results
    const headers = [
      "Email",
      "Status",
      "Result",
      "Reason",
      "Free",
      "Role",
      "Disposable",
      "Accept All",
    ];

    const csvRows = [headers.join(",")];

    results.verificationData.forEach((item) => {
      const row = [
        `"${item.email}"`,
        `"${item.status || "unknown"}"`,
        `"${item.result || "unknown"}"`,
        `"${item.reason || ""}"`,
        `"${item.free || false}"`,
        `"${item.role || false}"`,
        `"${item.disposable || false}"`,
        `"${item.accept_all || false}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", results?.filename || "verified_emails.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetVerifier = () => {
    setCsvFile(null);
    setResults(null);
    setError("");
    setStatusMessage("");
    setProgress(0);
    setCurrentStep(0);
    setTotalSteps(0);
    setProcessing(false);
    setCostEstimate(null);
    setParsedData(null);
    setEmailColumns([]);
    setVerificationResults([]);
    setApiKey(""); // Clear API key on reset
  };

  return (
    <section
      className="email-verifier-section"
      style={{
        marginTop: "3rem",
        padding: "2rem 0",
        borderTop: "2px solid #e0e0e0",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}>
        <header style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2>📧 Email Verification Tool</h2>
          <p>
            Upload a CSV file to verify email addresses and get back a cleaned
            dataset
          </p>
        </header>

        {/* API Key Input */}
        <div className="api-key-section" style={{ marginBottom: "2rem" }}>
          <div
            className="card"
            style={{
              padding: "1.5rem",
              backgroundColor: "rgba(100, 108, 255, 0.05)",
              border: "1px solid rgba(100, 108, 255, 0.2)",
              borderRadius: "8px",
            }}
          >
            <h3>🔑 API Configuration</h3>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                }}
              >
                Bouncer API Key:
              </label>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Bouncer API key"
                  style={{
                    flex: 1,
                    padding: "0.6em 1.2em",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    fontSize: "1em",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    padding: "0.6em 1em",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    backgroundColor: "#f9f9f9",
                    cursor: "pointer",
                  }}
                >
                  {showApiKey ? "🙈" : "👁️"}
                </button>
              </div>
              <small
                style={{ color: "#666", marginTop: "0.5rem", display: "block" }}
              >
                Get your API key from{" "}
                <a
                  href="https://usebouncer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#646cff" }}
                >
                  usebouncer.com
                </a>
              </small>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="upload-section">
          <FileUpload
            title="CSV File with Email Addresses"
            description="Upload a CSV file containing email addresses to verify (any format with email columns)"
            accept=".csv"
            onFileSelect={handleFileSelect}
            files={csvFile}
            required={true}
          />
        </div>

        {/* Cost Estimate */}
        {costEstimate && (
          <div className="cost-estimate" style={{ margin: "2rem 0" }}>
            <div
              className="stat-card"
              style={{
                backgroundColor: "rgba(81, 207, 102, 0.1)",
                border: "1px solid rgba(81, 207, 102, 0.3)",
                padding: "1rem",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#2e7d32" }}>
                💰 Cost Estimate
              </h4>
              <p style={{ margin: "0", fontSize: "0.9em" }}>
                <strong>~{costEstimate.emails}</strong> emails •
                <strong> ${costEstimate.cost}</strong> estimated cost
              </p>
              <small
                style={{ color: "#666", display: "block", marginTop: "0.5rem" }}
              >
                Based on $0.008 per email verification
              </small>
            </div>
          </div>
        )}

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
            onClick={processEmailVerification}
            disabled={processing || !csvFile || !apiKey.trim()}
            style={{
              fontSize: "1.2em",
              padding: "1rem 2rem",
              marginRight: "1rem",
            }}
          >
            {processing ? "Verifying Emails..." : "🔍 Verify Email Addresses"}
          </button>

          {(results || error) && (
            <button
              onClick={resetVerifier}
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
        {results && (
          <div className="results-section">
            <h2>✅ Verification Results</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>{results.totalEmails}</h3>
                <p>Total Emails</p>
              </div>

              <div
                className="stat-card"
                style={{ backgroundColor: "rgba(76, 175, 80, 0.1)" }}
              >
                <h3>{results.validEmails}</h3>
                <p>Valid Emails</p>
              </div>

              <div
                className="stat-card"
                style={{ backgroundColor: "rgba(244, 67, 54, 0.1)" }}
              >
                <h3>{results.invalidEmails}</h3>
                <p>Invalid Emails</p>
              </div>

              {results.riskyEmails > 0 && (
                <div
                  className="stat-card"
                  style={{ backgroundColor: "rgba(255, 152, 0, 0.1)" }}
                >
                  <h3>{results.riskyEmails}</h3>
                  <p>Risky Emails</p>
                </div>
              )}

              <div
                className="stat-card"
                style={{ backgroundColor: "rgba(255, 193, 7, 0.1)" }}
              >
                <h3>
                  {((results.validEmails / results.totalEmails) * 100).toFixed(
                    1
                  )}
                  %
                </h3>
                <p>Success Rate</p>
              </div>
            </div>

            <div className="export-section">
              <h3>📥 Download Results</h3>
              <p>
                Your cleaned CSV file includes verification status for each
                email address. Invalid emails are flagged with reasons for easy
                cleanup.
              </p>

              <div className="export-buttons">
                <button
                  onClick={downloadCleanedCSV}
                  style={{
                    backgroundColor: "#4CAF50",
                    color: "white",
                    fontSize: "1.1em",
                    padding: "1rem 2rem",
                  }}
                >
                  📥 Download Verified CSV
                </button>
              </div>

              <div
                style={{ marginTop: "1rem", fontSize: "0.9em", opacity: 0.8 }}
              >
                <p>
                  <strong>CSV Contents:</strong> Email, Status, Result, Reason,
                  Free, Role, Disposable, Accept All
                </p>
                <p>
                  <strong>Status Types:</strong> deliverable (safe to email),
                  undeliverable (invalid), risky (proceed with caution), unknown
                  (unable to verify)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Information Section */}
        <div
          className="info-section"
          style={{
            marginTop: "3rem",
            padding: "2rem",
            backgroundColor: "rgba(100, 108, 255, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(100, 108, 255, 0.1)",
          }}
        >
          <h3>ℹ️ How Email Verification Works:</h3>
          <div
            style={{ textAlign: "left", maxWidth: "800px", margin: "0 auto" }}
          >
            <ol style={{ lineHeight: "1.6" }}>
              <li>
                <strong>File Upload:</strong> Upload any CSV file containing
                email addresses
              </li>
              <li>
                <strong>Email Detection:</strong> Automatically finds email
                columns in your data
              </li>
              <li>
                <strong>Real-time Verification:</strong> Each email is checked
                against Bouncer's verification API
              </li>
              <li>
                <strong>Status Classification:</strong> Emails are marked as
                Valid, Invalid, Risky, or Unknown
              </li>
              <li>
                <strong>Cleaned Export:</strong> Download your data with
                verification results and cleanup recommendations
              </li>
            </ol>

            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                borderRadius: "4px",
                border: "1px solid rgba(255, 193, 7, 0.3)",
              }}
            >
              <strong>⚠️ Note:</strong> This tool verifies email deliverability
              in real-time. Costs apply per email verified (~$0.008 each). Your
              API key is processed locally and never stored.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmailVerifier;
