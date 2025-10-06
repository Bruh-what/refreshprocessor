import React, { useState } from "react";
import Papa from "papaparse";

const PhoneConsolidator = () => {
  const [compassFile, setCompassFile] = useState(null);
  const [phoneFile, setPhoneFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [compassData, setCompassData] = useState([]);
  const [phoneData, setPhoneData] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Phone number extraction and normalization functions
  const getAllPhoneNumbers = (contact) => {
    const phones = [];
    const phoneFields = [
      "Mobile Phone",
      "Home Phone",
      "Work Phone",
      "Phone",
      "Primary Mobile Phone",
      "Primary Home Phone",
      "Primary Work Phone",
      "Primary other Phone",
      "other Phone",
      "Primary Custom Phone",
      "Primary work Phone",
      "work Phone",
      "Primary personal Phone",
      "other Phone 2",
      "other Phone 3",
      "Personal Phone 2",
      "home Phone",
      "Personal Phone 3",
      "Personal Phone 4",
      "home Phone 2",
      "personal Phone",
      "work Phone 2",
      "other Phone 4",
      "Custom Phone 2",
      "Custom Phone",
      "Phone :",
      "Phone : mobile",
      "Phone : home",
      "Phone : work",
      "Phone : other",
      "Phone Number (Home 1)",
      "Phone Number (Mobile 1)",
      "Phone Number (Work 1)",
      "Phone Number (Other 1)",
      "Phone Number (Home 2)",
      "Phone Number (Mobile 2)",
      "Phone Number (Work 2)",
      "Phone Number (Other 2)",
    ];

    // Check standard phone fields
    phoneFields.forEach((field) => {
      const phone = contact[field];
      if (phone && typeof phone === "string" && phone.trim()) {
        const normalizedPhone = normalizePhoneNumber(phone);
        if (normalizedPhone && !phones.includes(normalizedPhone)) {
          phones.push(normalizedPhone);
        }
      }
    });

    // Scan all fields for phone patterns
    for (const [key, value] of Object.entries(contact)) {
      if (typeof value === "string" && value.trim()) {
        // Look for phone number patterns
        const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
        const foundPhones = value.match(phoneRegex);
        if (foundPhones) {
          foundPhones.forEach((phone) => {
            const normalizedPhone = normalizePhoneNumber(phone);
            if (normalizedPhone && !phones.includes(normalizedPhone)) {
              phones.push(normalizedPhone);
            }
          });
        }
      }
    }

    return phones;
  };

  const normalizePhoneNumber = (phone) => {
    if (!phone || typeof phone !== "string") return null;

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Must be at least 10 digits
    if (digits.length < 10) return null;

    // Handle US numbers with country code
    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.substring(1);
    }

    // Return 10-digit US number
    if (digits.length === 10) {
      return digits;
    }

    // For longer numbers, take the last 10 digits
    return digits.slice(-10);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone || phone.length !== 10) return phone;
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  };

  // Email extraction for matching
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
      "Primary Work Email",
      "Primary Personal Email",
      "Primary other Email",
      "other Email",
    ];

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

  const normalizeEmail = (email) => {
    return email.toLowerCase().trim();
  };

  // File upload handlers
  const handleCompassFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompassFile(file);
      addLog(`Compass file uploaded: ${file.name}`);

      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCompassData(results.data);
          addLog(`Parsed ${results.data.length} Compass contacts`);
        },
        error: (error) => {
          addLog(`❌ Error parsing Compass file: ${error.message}`);
        },
      });
    }
  };

  const handlePhoneFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoneFile(file);
      addLog(`Phone file uploaded: ${file.name}`);

      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setPhoneData(results.data);
          addLog(`Parsed ${results.data.length} phone records`);
        },
        error: (error) => {
          addLog(`❌ Error parsing phone file: ${error.message}`);
        },
      });
    }
  };

  // Main phone consolidation process
  const consolidatePhones = async () => {
    if (!compassData.length || !phoneData.length) {
      addLog("❌ Please upload both Compass and Phone files");
      return;
    }

    setProcessing(true);
    setProgress(0);
    addLog("🚀 Starting phone consolidation process...");

    try {
      // Filter Compass contacts that have names
      const compassWithNames = compassData.filter((contact) => {
        const firstName = (contact["First Name"] || "").trim();
        const lastName = (contact["Last Name"] || "").trim();
        return firstName || lastName;
      });

      addLog(`📋 Found ${compassWithNames.length} Compass contacts with names`);

      // Find Compass contacts missing phone numbers
      const compassContactsMissingPhones = compassWithNames.filter(
        (contact) => {
          return getAllPhoneNumbers(contact).length === 0;
        }
      );

      addLog(
        `📞 Found ${compassContactsMissingPhones.length} Compass contacts missing phone numbers`
      );

      // Create lookup map for contacts missing phones
      const keysToLookFor = new Set();
      const keyToContactMap = new Map();

      for (const compassContact of compassContactsMissingPhones) {
        const firstName = (compassContact["First Name"] || "")
          .toLowerCase()
          .trim();
        const lastName = (compassContact["Last Name"] || "")
          .toLowerCase()
          .trim();
        const emails = getAllEmails(compassContact).map((e) =>
          normalizeEmail(e)
        );

        for (const email of emails) {
          if (email) {
            const key = `${firstName}|${lastName}|${email}`;
            keysToLookFor.add(key);
            keyToContactMap.set(key, compassContact);
          }
        }
      }

      addLog(`🔍 Created ${keysToLookFor.size} lookup keys for matching`);

      let phonesAddedCount = 0;
      let contactsUpdatedCount = 0;
      const updatedContacts = [...compassWithNames];

      // Process phone data in chunks
      const CHUNK_SIZE = 100;
      const phoneChunks = [];
      for (let i = 0; i < phoneData.length; i += CHUNK_SIZE) {
        phoneChunks.push(phoneData.slice(i, i + CHUNK_SIZE));
      }

      for (let chunkIndex = 0; chunkIndex < phoneChunks.length; chunkIndex++) {
        const chunk = phoneChunks[chunkIndex];

        addLog(
          `📦 Processing phone chunk ${chunkIndex + 1}/${phoneChunks.length} (${
            chunk.length
          } records)`
        );

        for (const phoneContact of chunk) {
          const phoneNumbers = getAllPhoneNumbers(phoneContact);
          if (phoneNumbers.length === 0) continue;

          const firstName = (phoneContact["First Name"] || "")
            .toLowerCase()
            .trim();
          const lastName = (phoneContact["Last Name"] || "")
            .toLowerCase()
            .trim();
          const emails = getAllEmails(phoneContact).map((e) =>
            normalizeEmail(e)
          );

          // Try to match by name + email
          let matchFound = false;
          for (const email of emails) {
            if (email) {
              const key = `${firstName}|${lastName}|${email}`;
              if (keysToLookFor.has(key)) {
                const compassContact = keyToContactMap.get(key);

                // Add phone numbers to empty fields
                const phoneFields = [
                  "Mobile Phone",
                  "Home Phone",
                  "Work Phone",
                  "Phone",
                  "Primary Mobile Phone",
                  "Primary Home Phone",
                ];

                for (const phoneNumber of phoneNumbers) {
                  const formattedPhone = formatPhoneNumber(phoneNumber);

                  for (const field of phoneFields) {
                    if (!compassContact[field]) {
                      compassContact[field] = formattedPhone;

                      if (!compassContact["Changes Made"]) {
                        compassContact["Changes Made"] = "";
                      }
                      if (compassContact["Changes Made"]) {
                        compassContact["Changes Made"] += "; ";
                      }
                      compassContact[
                        "Changes Made"
                      ] += `Added phone number: ${formattedPhone}`;

                      phonesAddedCount++;
                      matchFound = true;
                      break;
                    }
                  }
                  if (matchFound) break;
                }

                if (matchFound) {
                  contactsUpdatedCount++;
                  addLog(
                    `✅ Added phone to ${firstName} ${lastName}: ${phoneNumbers
                      .map(formatPhoneNumber)
                      .join(", ")}`
                  );
                  break;
                }
              }
            }
          }
        }

        // Update progress
        setProgress(((chunkIndex + 1) / phoneChunks.length) * 100);

        // Small delay to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Try name-only matching for contacts that still need phones
      addLog("🔍 Trying name-only matching for remaining contacts...");

      const stillMissingPhones = updatedContacts.filter((contact) => {
        return getAllPhoneNumbers(contact).length === 0;
      });

      addLog(
        `📞 ${stillMissingPhones.length} contacts still missing phones, trying name-only matching`
      );

      for (const compassContact of stillMissingPhones) {
        const compassFirstName = (compassContact["First Name"] || "")
          .toLowerCase()
          .trim();
        const compassLastName = (compassContact["Last Name"] || "")
          .toLowerCase()
          .trim();

        if (!compassFirstName || !compassLastName) continue;

        for (const phoneContact of phoneData) {
          const phoneNumbers = getAllPhoneNumbers(phoneContact);
          if (phoneNumbers.length === 0) continue;

          const phoneFirstName = (phoneContact["First Name"] || "")
            .toLowerCase()
            .trim();
          const phoneLastName = (phoneContact["Last Name"] || "")
            .toLowerCase()
            .trim();

          if (
            compassFirstName === phoneFirstName &&
            compassLastName === phoneLastName
          ) {
            // Add phone numbers
            const phoneFields = [
              "Mobile Phone",
              "Home Phone",
              "Work Phone",
              "Phone",
              "Primary Mobile Phone",
              "Primary Home Phone",
            ];

            let phoneAdded = false;
            for (const phoneNumber of phoneNumbers) {
              const formattedPhone = formatPhoneNumber(phoneNumber);

              for (const field of phoneFields) {
                if (!compassContact[field]) {
                  compassContact[field] = formattedPhone;

                  if (!compassContact["Changes Made"]) {
                    compassContact["Changes Made"] = "";
                  }
                  if (compassContact["Changes Made"]) {
                    compassContact["Changes Made"] += "; ";
                  }
                  compassContact[
                    "Changes Made"
                  ] += `Added phone number (name match): ${formattedPhone}`;

                  phonesAddedCount++;
                  phoneAdded = true;
                  break;
                }
              }
              if (phoneAdded) break;
            }

            if (phoneAdded) {
              contactsUpdatedCount++;
              addLog(
                `✅ Added phone (name match) to ${compassFirstName} ${compassLastName}: ${phoneNumbers
                  .map(formatPhoneNumber)
                  .join(", ")}`
              );
              break;
            }
          }
        }
      }

      setResults({
        updatedContacts,
        phonesAddedCount,
        contactsUpdatedCount,
        totalContacts: compassWithNames.length,
        originalMissingPhones: compassContactsMissingPhones.length,
      });

      addLog("🎯 Phone consolidation complete!");
      addLog(
        `📊 Results: ${phonesAddedCount} phone numbers added to ${contactsUpdatedCount} contacts`
      );
    } catch (error) {
      addLog(`❌ Error during consolidation: ${error.message}`);
    } finally {
      setProcessing(false);
      setProgress(100);
    }
  };

  // Export consolidated data
  const exportConsolidatedData = () => {
    if (!results || !results.updatedContacts.length) {
      addLog("❌ No consolidated data to export");
      return;
    }

    const csv = Papa.unparse(results.updatedContacts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `compass_with_consolidated_phones_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog("📁 Consolidated data exported successfully");
  };

  // Export only updated contacts
  const exportUpdatedOnly = () => {
    if (!results || !results.updatedContacts.length) {
      addLog("❌ No data to export");
      return;
    }

    const updatedContacts = results.updatedContacts.filter((contact) => {
      return (
        contact["Changes Made"] &&
        contact["Changes Made"].includes("Added phone number")
      );
    });

    if (updatedContacts.length === 0) {
      addLog("❌ No contacts were updated with phone numbers");
      return;
    }

    const csv = Papa.unparse(updatedContacts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `contacts_with_added_phones_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog(
      `📁 Exported ${updatedContacts.length} contacts with added phone numbers`
    );
  };

  // Clear all data
  const clearData = () => {
    setCompassFile(null);
    setPhoneFile(null);
    setCompassData([]);
    setPhoneData([]);
    setResults(null);
    setProgress(0);
    setLogs([]);
    addLog("Data cleared");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          📞 Phone Consolidator
        </h1>
        <p className="text-gray-600 mb-8">
          Consolidate phone numbers from phone exports into Compass contacts
        </p>

        {/* File Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📋 Compass Contacts</h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleCompassFileUpload}
              className="w-full p-3 border rounded-lg mb-3"
            />
            {compassFile && (
              <div className="text-sm text-gray-600">
                <p>📄 File: {compassFile.name}</p>
                <p>📊 Contacts: {compassData.length}</p>
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📞 Phone Export</h2>
            <input
              type="file"
              accept=".csv"
              onChange={handlePhoneFileUpload}
              className="w-full p-3 border rounded-lg mb-3"
            />
            {phoneFile && (
              <div className="text-sm text-gray-600">
                <p>📄 File: {phoneFile.name}</p>
                <p>📊 Records: {phoneData.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Process Section */}
        {compassData.length > 0 && phoneData.length > 0 && !results && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🔄 Ready to Process</h2>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Process will match phone numbers using:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>First Name + Last Name + Email address matching</li>
                <li>Fallback to First Name + Last Name matching</li>
                <li>Only adds phones to contacts missing phone numbers</li>
                <li>Preserves all existing Compass data</li>
              </ul>
            </div>

            <button
              onClick={consolidatePhones}
              disabled={processing}
              className={`w-full py-3 px-4 rounded-lg font-semibold ${
                processing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-700 text-white"
              }`}
            >
              {processing
                ? `Processing... (${Math.floor(progress)}%)`
                : "🚀 Start Phone Consolidation"}
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
              🎯 Consolidation Results
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.totalContacts}
                </div>
                <div className="text-sm text-gray-600">Total Contacts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {results.originalMissingPhones}
                </div>
                <div className="text-sm text-gray-600">
                  Originally Missing Phones
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.contactsUpdatedCount}
                </div>
                <div className="text-sm text-gray-600">Contacts Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results.phonesAddedCount}
                </div>
                <div className="text-sm text-gray-600">Phone Numbers Added</div>
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">📥 Export Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <button
                    onClick={exportConsolidatedData}
                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
                  >
                    📋 Export All Contacts
                  </button>
                  <p className="text-xs text-gray-600">
                    Complete Compass dataset with consolidated phone numbers
                    <br />({results.totalContacts} total contacts)
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={exportUpdatedOnly}
                    className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
                  >
                    🎯 Export Updated Only
                  </button>
                  <p className="text-xs text-gray-600">
                    Only contacts that received new phone numbers
                    <br />({results.contactsUpdatedCount} updated contacts)
                  </p>
                </div>
              </div>
            </div>

            {/* Clear Data Button */}
            <div className="text-center mt-4">
              <button
                onClick={clearData}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                🗑️ Clear Data
              </button>
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

export default PhoneConsolidator;
