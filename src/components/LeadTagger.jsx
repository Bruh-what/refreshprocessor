import React, { useState } from "react";
import Papa from "papaparse";

const LeadTagger = () => {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [originalData, setOriginalData] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Personal email domains
  const PERSONAL_DOMAINS = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "live.com",
    "msn.com",
    "ymail.com",
    "rocketmail.com",
    "att.net",
    "verizon.net",
    "comcast.net",
    "sbcglobal.net",
  ];

  // Extract all emails from a contact
  const getAllEmails = (contact) => {
    const emails = [];
    const emailFields = [
      "Email",
      "Personal Email",
      "Email Address",
      "Primary Email",
      "Work Email",
      "Business Email",
      "Home Email",
      "Other Email",
      "Email 1",
      "Email 2",
      "Email 3",
      "Email 4",
      "Email 5",
      "Email 6",
      "Primary Work Email",
      "Primary Personal Email",
      "Primary other Email",
      "other Email",
      "Primary Custom Email",
      "Primary work Email",
      "work Email",
      "Primary personal Email",
      "other Email 2",
      "other Email 3",
      "Personal Email 2",
      "home Email",
      "Personal Email 3",
      "Personal Email 4",
      "home Email 2",
      "personal Email",
      "work Email 2",
      "other Email 4",
      "Custom Email 2",
      "Custom Email",
    ];

    // Check standard email fields
    emailFields.forEach((field) => {
      const email = contact[field];
      if (email && typeof email === "string" && email.includes("@")) {
        emails.push(email.toLowerCase().trim());
      }
    });

    // Scan all fields for email patterns
    for (const [key, value] of Object.entries(contact)) {
      if (typeof value === "string" && value.includes("@")) {
        const emailRegex =
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const foundEmails = value.match(emailRegex);
        if (foundEmails) {
          foundEmails.forEach((email) => {
            const cleanEmail = email.toLowerCase().trim();
            if (!emails.includes(cleanEmail)) {
              emails.push(cleanEmail);
            }
          });
        }
      }
    }

    return [...new Set(emails)];
  };

  // Get email domain
  const getEmailDomain = (email) => {
    return email.split("@")[1]?.toLowerCase() || "";
  };

  // Check if contact has only personal emails
  const hasOnlyPersonalEmails = (emails) => {
    if (emails.length === 0) return false;
    return emails.every((email) => {
      const domain = getEmailDomain(email);
      return PERSONAL_DOMAINS.includes(domain);
    });
  };

  // Check if contact has at least one business email
  const hasBusinessEmail = (emails) => {
    if (emails.length === 0) return false;
    return emails.some((email) => {
      const domain = getEmailDomain(email);
      return !PERSONAL_DOMAINS.includes(domain);
    });
  };

  // Check if contact is already grouped/categorized
  const isAlreadyCategorized = (contact) => {
    const groups = (contact["Groups"] || contact["Group"] || "").trim();
    const category = (contact["Category"] || "").trim();

    // Consider "ALL CONTACTS" as not categorized since it's just a default
    // Also consider empty categories as not categorized
    const hasRealGroup = groups !== "" && groups !== "ALL CONTACTS";
    const hasRealCategory = category !== "" && category !== "Contact";

    return hasRealGroup || hasRealCategory;
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setResults(null);
      setProgress(0);
      addLog(`📁 File uploaded: ${uploadedFile.name}`);

      // Parse file to analyze contacts
      Papa.parse(uploadedFile, {
        header: true,
        complete: (results) => {
          setOriginalData(results.data);
          analyzeContacts(results.data);
        },
        error: (error) => {
          addLog(`❌ File parsing error: ${error.message}`);
        },
      });
    }
  };

  // Analyze contacts to show what will be processed
  const analyzeContacts = (data) => {
    addLog(`🔍 Analyzing ${data.length} total contacts...`);

    // Debug: Check first few contacts to see their structure
    addLog(`🔍 Debugging first 5 contacts:`);
    data.slice(0, 5).forEach((contact, idx) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      const category = (contact["Category"] || "").trim();
      const name = `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim();
      const emails = getAllEmails(contact);

      addLog(`   ${idx + 1}. ${name || "No Name"}`);
      addLog(`      Groups: "${groups}"`);
      addLog(`      Category: "${category}"`);
      addLog(`      Emails: ${emails.length > 0 ? emails.join(", ") : "NONE"}`);
      addLog(`      Is Categorized: ${isAlreadyCategorized(contact)}`);
      addLog(`      ---`);
    });

    let alreadyCategorized = 0;
    let businessEmailUncategorized = 0;
    let personalEmailOnly = 0;
    let noEmailToDelete = 0;

    data.forEach((contact, index) => {
      const emails = getAllEmails(contact);
      const name = `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim();

      if (isAlreadyCategorized(contact)) {
        alreadyCategorized++;

        // Debug: Log first few categorized contacts
        if (alreadyCategorized <= 3) {
          const groups = (contact["Groups"] || contact["Group"] || "").trim();
          const category = (contact["Category"] || "").trim();
          addLog(
            `🔍 Already categorized example: ${name} - Groups:"${groups}" Category:"${category}"`
          );
        }
      } else if (emails.length === 0) {
        // No email = delete (regardless of name)
        noEmailToDelete++;
      } else if (hasOnlyPersonalEmails(emails)) {
        personalEmailOnly++;
      } else if (hasBusinessEmail(emails)) {
        businessEmailUncategorized++;
      }
    });

    addLog(`📊 Analysis Results:`);
    addLog(`   ✅ Already categorized: ${alreadyCategorized}`);
    addLog(
      `   🏢 Business emails (will tag "Uncategorized"): ${businessEmailUncategorized}`
    );
    addLog(
      `   👤 Personal emails only (will tag "Leads"): ${personalEmailOnly}`
    );
    addLog(`   🗑️ No email/name (will delete): ${noEmailToDelete}`);
    addLog(
      `   📝 Total contacts after processing: ${data.length - noEmailToDelete}`
    );
  };

  // Process the contacts
  const processContacts = async () => {
    if (!file || originalData.length === 0) {
      addLog("❌ No file to process");
      return;
    }

    setProcessing(true);
    setProgress(0);
    addLog(`🚀 Starting Lead Tagger processing...`);

    const processedContacts = [];
    let deletedCount = 0;
    let uncategorizedTagged = 0;
    let leadsTagged = 0;
    let alreadyCategorizedCount = 0;

    for (let i = 0; i < originalData.length; i++) {
      const contact = { ...originalData[i] };
      const emails = getAllEmails(contact);
      const name = `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim();

      // Update progress
      setProgress((i / originalData.length) * 100);

      // Skip contacts with no email (delete them) - regardless of name
      if (emails.length === 0) {
        deletedCount++;
        addLog(`🗑️ Deleted: No email (${name || "No name"})`);
        continue;
      }

      // Skip already categorized contacts (leave them unchanged)
      if (isAlreadyCategorized(contact)) {
        alreadyCategorizedCount++;
        processedContacts.push(contact);
        continue;
      }

      // Process uncategorized contacts
      let wasModified = false;

      // Business emails that are uncategorized -> Add "Uncategorized" tag
      if (hasBusinessEmail(emails)) {
        const currentTags = contact["Tags"] || "";
        const newTags = currentTags
          ? `${currentTags}, Uncategorized`
          : "Uncategorized";

        contact["Tags"] = newTags;
        contact["Changes Made"] = contact["Changes Made"]
          ? `${contact["Changes Made"]}; Tagged as Uncategorized (business email)`
          : "Tagged as Uncategorized (business email)";

        uncategorizedTagged++;
        wasModified = true;
        addLog(
          `🏢 Tagged as Uncategorized: ${name || "Unknown"} (${emails.join(
            ", "
          )})`
        );
      }
      // Personal emails only -> Add to "Leads" group
      else if (hasOnlyPersonalEmails(emails)) {
        contact["Groups"] = "Leads";
        contact["Changes Made"] = contact["Changes Made"]
          ? `${contact["Changes Made"]}; Added to Leads group`
          : "Added to Leads group";

        leadsTagged++;
        wasModified = true;

        const emailInfo = emails.length > 0 ? emails.join(", ") : "No email";
        addLog(`👤 Added to Leads: ${name || "Unknown"} (${emailInfo})`);
      }

      processedContacts.push(contact);
    }

    setProgress(100);

    const finalResults = {
      processedContacts,
      stats: {
        originalCount: originalData.length,
        finalCount: processedContacts.length,
        deletedCount,
        alreadyCategorizedCount,
        uncategorizedTagged,
        leadsTagged,
      },
    };

    setResults(finalResults);

    addLog(`✅ Lead Tagger processing complete!`);
    addLog(`📊 Final Statistics:`);
    addLog(`   📥 Original contacts: ${originalData.length}`);
    addLog(`   📤 Final contacts: ${processedContacts.length}`);
    addLog(`   🗑️ Deleted (no email/name): ${deletedCount}`);
    addLog(`   ✅ Already categorized (unchanged): ${alreadyCategorizedCount}`);
    addLog(`   🏢 Tagged "Uncategorized": ${uncategorizedTagged}`);
    addLog(`   👤 Added to "Leads": ${leadsTagged}`);

    setProcessing(false);
  };

  // Export processed data
  const exportProcessedData = () => {
    if (!results || results.processedContacts.length === 0) {
      addLog("❌ No processed data to export");
      return;
    }

    const csv = Papa.unparse(results.processedContacts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `lead_tagged_contacts_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog("📁 Lead tagged contacts exported successfully");
  };

  // Clear data
  const clearData = () => {
    setFile(null);
    setResults(null);
    setOriginalData([]);
    setProgress(0);
    setLogs([]);
    addLog("Data cleared");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🏷️ Lead Tagger
        </h1>
        <p className="text-gray-600 mb-8">
          Automatically organize your contacts: Tag business emails as
          "Uncategorized", personal emails as "Leads", and clean up records
          without contact info
        </p>

          {/* File Upload Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              📁 Upload Contact File
            </h2>
            <div className="mb-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full p-3 border rounded-lg"
              />
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  📄 File: {file.name}
                </p>
              )}
            </div>
          </div>

          {/* Processing Rules */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🔧 Processing Rules</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3">
                <span className="text-green-600 font-bold">✅</span>
                <span>
                  <strong>Already Categorized:</strong> Contacts with existing
                  Groups or Categories are left unchanged
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-600 font-bold">🏢</span>
                <span>
                  <strong>Business Emails:</strong> Uncategorized contacts with
                  business emails get "Uncategorized" tag
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-purple-600 font-bold">👤</span>
                <span>
                  <strong>Personal Emails:</strong> Contacts with only personal
                  emails (Gmail, Yahoo, etc.) go to "Leads" group
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-red-600 font-bold">�️</span>
                <span>
                  <strong>No Email:</strong> Records without email addresses are
                  deleted (regardless of name)
                </span>
              </div>
            </div>
          </div>

          {/* Process Button */}
          {originalData.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                🚀 Ready to Process
              </h2>

              <button
                onClick={processContacts}
                disabled={processing || !file}
                className={`w-full py-3 px-4 rounded-lg font-semibold ${
                  !processing && file
                    ? "bg-blue-500 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {processing
                  ? `Processing... (${Math.floor(progress)}%)`
                  : `🏷️ Process ${originalData.length} Contacts`}
              </button>
            </div>
          )}

          {/* Progress Section */}
          {processing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                ⏳ Processing Progress
              </h2>
              <div className="mb-4">
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {Math.floor(progress)}% complete
                </p>
              </div>
            </div>
          )}

          {/* Results Section */}
          {results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                ✅ Processing Complete
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.stats.originalCount}
                  </div>
                  <div className="text-sm text-gray-600">Original Contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.stats.finalCount}
                  </div>
                  <div className="text-sm text-gray-600">Final Contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {results.stats.deletedCount}
                  </div>
                  <div className="text-sm text-gray-600">Deleted Records</div>
                  <div className="text-xs text-gray-500">(No email found)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {results.stats.alreadyCategorizedCount}
                  </div>
                  <div className="text-sm text-gray-600">
                    Already Categorized
                  </div>
                  <div className="text-xs text-gray-500">
                    (Has groups/category)
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.stats.uncategorizedTagged}
                  </div>
                  <div className="text-sm text-gray-600">
                    Tagged "Uncategorized"
                  </div>
                  <div className="text-xs text-gray-500">(Business emails)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {results.stats.leadsTagged}
                  </div>
                  <div className="text-sm text-gray-600">Added to "Leads"</div>
                  <div className="text-xs text-gray-500">
                    (Personal emails only)
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="space-y-4">
                <button
                  onClick={exportProcessedData}
                  className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
                >
                  📥 Export Processed Contacts
                </button>

                <div className="text-center">
                  <button
                    onClick={clearData}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    🗑️ Clear Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Logs Section */}
          {logs.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">📋 Processing Logs</h2>
              <div className="bg-black text-green-400 p-4 rounded-lg max-h-60 overflow-y-auto font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default LeadTagger;
