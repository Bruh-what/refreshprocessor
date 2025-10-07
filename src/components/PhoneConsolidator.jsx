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

  // Phone number extraction and normalization functions (matching RealEstateProcessor exactly)
  const getAllPhoneNumbers = (contact) => {
    const phoneFields = [
      // Standard Compass fields
      "Home Phone",
      "Mobile Phone",
      "Work Phone",
      "Phone",
      "Primary Home Phone",
      "Home Phone 2",
      "Primary Work Phone",
      "Primary Mobile Phone",
      "Primary Phone",
      "Mobile Phone 2",
      "Mobile Phone 3",
      "Work Phone 2",
      // Phone export specific formats
      "Phone :",
      "Phone : mobile",
      "Phone : home",
      "Phone : work",
      "Phone : iPhone",
      "Phone : cell",
      // Legacy phone fields for phone export compatibility
      "Phone Number (Home 1)",
      "Phone Number (Home 2)",
      "Phone Number (Home 3)",
      "Phone Number (Mobile 1)",
      "Phone Number (Mobile 2)",
      "Phone Number (Mobile 3)",
      "Phone Number (Work)",
      "Phone Number (Work 1)",
      "Phone Number (Work 2)",
      "Phone Number (Work 3)",
      "Phone Number (Work 4)",
      "Phone Number (Work 5)",
      "Phone Number (Abraham)",
      "Phone Number (Andrew)",
      "Phone Number (Anita)",
      "Phone Number (Annie)",
      "Phone Number (Berj)",
      "Phone Number (Bill)",
      "Phone Number (Brett)",
      "Phone Number (Call)",
      "Phone Number (Carole)",
      "Phone Number (Carrie)",
      "Phone Number (Cash)",
      "Phone Number (Cathy)",
      "Phone Number (Chanler)",
      "Phone Number (Cust Service)",
      "Phone Number (David)",
      "Phone Number (Eddie C)",
      "Phone Number (Edie)",
      "Phone Number (Exec Service)",
      "Phone Number (Ford Gate)",
      "Phone Number (Gina)",
      "Phone Number (Gloria)",
      "Phone Number (Greg)",
      "Phone Number (Harold)",
      "Phone Number (Heart)",
      "Phone Number (Helen)",
      "Phone Number (Janice)",
      "Phone Number (Joel)",
      "Phone Number (Kevin)",
      "Phone Number (Lee)",
      "Phone Number (Leslie)",
      "Phone Number (Lisa)",
      "Phone Number (Mark)",
      "Phone Number (Michael)",
      "Phone Number (Natalie)",
      "Phone Number (Nicholas)",
      "Phone Number (Pam)",
      "Phone Number (Peter)",
      "Phone Number (Ross)",
      "Phone Number (Sabrina)",
      "Phone Number (Seattle)",
      "Phone Number (Steve)",
      "Phone Number (Suzanne)",
      "Phone Number (Ted)",
      "Phone Number (Text)",
      "Phone Number (Yolanda)",
      "Phone Number (Zach Cell)",
      "Phone Number (Assistant)",
      "Phone Number (Company Main)",
      "Phone Number (Home Fax)",
      "Phone Number (Iphone)",
      "Phone Number (Main 1)",
      "Phone Number (Main 2)",
      "Phone Number (Other Fax)",
      "Phone Number (Other)",
      "Phone Number (Pager)",
      "Phone Number (Phone Number 1)",
      "Phone Number (Phone Number 2)",
      "Phone Number (Phone Number 3)",
      "Phone Number (Work Fax 1)",
      "Phone Number (Work Fax 2)",
    ];

    // First check the standard fields
    const standardPhoneNumbers = phoneFields
      .map((field) => contact[field])
      .filter((phone) => phone && phone.trim() && phone !== "0000000000")
      .map((phone) => normalizePhoneNumber(phone))
      .filter((phone) => phone && phone.length >= 10);

    // Also check for any field that starts with "Phone :" or similar patterns (for phone exports)
    const phoneExportNumbers = [];
    for (const key in contact) {
      // Check for different possible phone column formats in exports
      if (
        (key.startsWith("Phone :") ||
          key.startsWith("Phone:") ||
          key === "Phone" ||
          key.includes("Phone") ||
          key.includes("phone")) &&
        contact[key] &&
        contact[key].trim() &&
        contact[key] !== "0000000000"
      ) {
        const normalizedPhone = normalizePhoneNumber(contact[key]);
        if (normalizedPhone && normalizedPhone.length >= 10) {
          phoneExportNumbers.push(normalizedPhone);
        }
      }
    }

    // Combine both types of phone numbers and remove duplicates
    const allPhones = [...standardPhoneNumbers, ...phoneExportNumbers];
    const uniquePhones = [...new Set(allPhones)];

    return uniquePhones;

  };

  // Helper method to normalize phone numbers consistently (matching RealEstateProcessor)
  const normalizePhoneNumber = (phone) => {
    if (!phone || typeof phone !== "string") return "";

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Check if we have at least 10 digits
    if (digits.length < 10) return "";

    // For US numbers with country code, strip the leading '1' if present
    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.substring(1);
    }

    // Return the cleaned digits (either exactly 10 digits or more for international)
    return digits;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone || phone.length !== 10) return phone;
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  };

  // Email extraction for matching
  // Get all emails from a contact (matching RealEstateProcessor)
  const getAllEmails = (contact) => {
    const emailFields = [
      "Personal Email",
      "Email",
      "Work Email",
      "Email 2",
      "Email 3",
      "Primary Personal Email",
      "Custom Email",
      // Legacy email fields for phone export compatibility
      "Email (1)",
      "Email (2)",
      "Email (3)",
      "Email (Work)",
      "Email (Home 1)",
      "Email (Home 2)",
      "Email (Andrea)",
      "Email (David)",
      "Email (Edina)",
      "Email (Email 1)",
      "Email (Email 2)",
      "Email (Gabriele)",
      "Email (Jennifer)",
      "Email (John)",
      "Email (Lauren)",
      "Email (Lee)",
      "Email (Lyn)",
      "Email (Michael)",
      "Email (Obsolete)",
      "Email (Ralf)",
      "Email (Icloud)",
      "Email (Other 1)",
      "Email (Other 2)",
      "Email (Other 3)",
      "Email (Work 1)",
      "Email (Work 2)",
      "Email (Work 3)",
      "Primary Email",
      "Primary Work Email",
    ];

    // Extract all valid email addresses from the specified fields
    const emails = emailFields
      .map((field) => contact[field])
      .filter((email) => email && email.trim() && email.includes("@"))
      .map((email) => email.toLowerCase().trim());

    // Now scan all other fields for anything that looks like an email address
    // This helps catch emails in non-standard fields
    if (contact) {
      for (const [key, value] of Object.entries(contact)) {
        if (
          typeof value === "string" &&
          value.includes("@") &&
          !emailFields.includes(key)
        ) {
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
    }

    // Return unique emails only
    return [...new Set(emails)];
  };

  const normalizeEmail = (email) => {
    if (!email || typeof email !== "string") return "";

    return email
      .toLowerCase()
      .trim()
      .replace(/\./g, "") // Remove dots
      .replace(/\+.*@/, "@") // Remove plus aliases (user+alias@domain.com -> user@domain.com)
      .replace(/(\d+)$/, ""); // Remove trailing numbers from username part
  };

  // Normalize names for matching - REQUIRES BOTH FIRST AND LAST NAME
  const normalizeName = (firstName, lastName) => {
    const first = (firstName || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");
    const last = (lastName || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");

    // Only return normalized name if BOTH first and last names exist
    if (!first || !last) {
      return ""; // Return empty string if either name is missing
    }

    return `${first} ${last}`.trim();
  };

  // Check if two names are similar enough to potentially be the same person
  const areNamesSimilar = (name1, name2) => {
    if (!name1 || !name2) return false;

    // Exact match after normalization
    if (name1 === name2) return true;

    // Check for nickname matches (e.g., "Robert" and "Bob")
    const nicknames = {
      robert: ["rob", "bob", "bobby"],
      william: ["will", "bill", "billy"],
      james: ["jim", "jimmy"],
      john: ["johnny", "jon"],
      michael: ["mike", "mikey"],
      christopher: ["chris"],
      joseph: ["joe", "joey"],
      thomas: ["tom", "tommy"],
      charles: ["chuck", "charlie"],
      katherine: ["kate", "katie", "kathy"],
      elizabeth: ["liz", "beth", "betty"],
      margaret: ["maggie", "peggy"],
      patricia: ["pat", "patty", "tricia"],
      jennifer: ["jen", "jenny"],
      rebecca: ["becky"],
      nicole: ["nikki"],
      matthew: ["matt"],
      richard: ["rick", "ricky", "dick"],
      daniel: ["dan", "danny"],
      joshua: ["josh"],
      david: ["dave", "davey"],
      nicholas: ["nick"],
      anthony: ["tony"],
      susan: ["sue", "suzie"],
      deborah: ["deb", "debbie"],
      barbara: ["barb"],
      jessica: ["jess"],
      victoria: ["vicky", "tori"],
    };

    // Check if one name is a nickname of the other
    const n1 = name1.toLowerCase();
    const n2 = name2.toLowerCase();

    for (const [fullName, nicks] of Object.entries(nicknames)) {
      if (
        (n1 === fullName && nicks.includes(n2)) ||
        (n2 === fullName && nicks.includes(n1)) ||
        (nicks.includes(n1) && nicks.includes(n2))
      ) {
        return true;
      }
    }

    // Calculate string similarity for detecting typos
    const maxLength = Math.max(name1.length, name2.length);
    if (maxLength <= 0) return false;

    // Calculate Levenshtein distance
    const distance = getLevenshteinDistance(name1, name2);

    // Calculate similarity as a ratio
    const similarity = 1 - distance / maxLength;

    // Consider similar if 80% or more similar (allows for 1-2 character differences in typical names)
    return similarity >= 0.8;
  };

  // Calculate Levenshtein distance between two strings
  const getLevenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  // Enhanced matching function that requires both first and last names to match
  const isNameMatch = (contact1, contact2) => {
    const firstName1 = (contact1["First Name"] || "").toLowerCase().trim();
    const lastName1 = (contact1["Last Name"] || "").toLowerCase().trim();
    const firstName2 = (contact2["First Name"] || "").toLowerCase().trim();
    const lastName2 = (contact2["Last Name"] || "").toLowerCase().trim();

    // Both contacts must have both first and last names
    if (!firstName1 || !lastName1 || !firstName2 || !lastName2) {
      return false;
    }

    // Check if first names match (exact or similar)
    const firstNamesMatch = areNamesSimilar(firstName1, firstName2);
    
    // Check if last names match (exact or similar)  
    const lastNamesMatch = areNamesSimilar(lastName1, lastName2);

    // BOTH first and last names must match
    return firstNamesMatch && lastNamesMatch;
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

      // Create lookup maps for enhanced matching
      const emailKeyMap = new Map(); // email -> contact
      const nameKeyMap = new Map(); // normalized name -> contact
      const contactsArray = [...compassContactsMissingPhones]; // for fuzzy matching

      for (const compassContact of compassContactsMissingPhones) {
        const normalizedName = normalizeName(
          compassContact["First Name"],
          compassContact["Last Name"]
        );
        const emails = getAllEmails(compassContact).map((e) => normalizeEmail(e));

        // Add to name map if we have a valid normalized name
        if (normalizedName) {
          if (!nameKeyMap.has(normalizedName)) {
            nameKeyMap.set(normalizedName, []);
          }
          nameKeyMap.get(normalizedName).push(compassContact);
        }

        // Add to email maps
        for (const email of emails) {
          if (email) {
            const key = `${normalizedName}|${email}`;
            emailKeyMap.set(key, compassContact);
          }
        }
      }

      addLog(`🔍 Created lookup maps: ${emailKeyMap.size} email keys, ${nameKeyMap.size} name keys`);

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

          const normalizedName = normalizeName(
            phoneContact["First Name"],
            phoneContact["Last Name"]
          );
          const emails = getAllEmails(phoneContact).map((e) => normalizeEmail(e));

          let matchFound = false;
          let compassContact = null;

          // Strategy 1: Exact name + email match (highest confidence)
          for (const email of emails) {
            if (email && normalizedName) {
              const key = `${normalizedName}|${email}`;
              if (emailKeyMap.has(key)) {
                compassContact = emailKeyMap.get(key);
                addLog(`📧 Exact name+email match: ${normalizedName} (${email})`);
                matchFound = true;
                break;
              }
            }
          }

          // Strategy 2: Fuzzy name matching with strict requirements
          if (!matchFound && normalizedName) {
            // Check exact name match first
            if (nameKeyMap.has(normalizedName)) {
              const candidates = nameKeyMap.get(normalizedName);
              if (candidates.length === 1) {
                compassContact = candidates[0];
                addLog(`👤 Exact name match: ${normalizedName}`);
                matchFound = true;
              }
            }

            // If no exact match, try fuzzy matching but be very strict
            if (!matchFound) {
              for (const candidateContact of contactsArray) {
                // Skip if already processed
                if (getAllPhoneNumbers(candidateContact).length > 0) continue;

                // Use enhanced name matching that requires both first and last names
                if (isNameMatch(phoneContact, candidateContact)) {
                  // Additional verification: if phone contact has email, compass contact should too
                  if (emails.length > 0) {
                    const compassEmails = getAllEmails(candidateContact);
                    if (compassEmails.length === 0) {
                      continue; // Skip this match - phone has email but compass doesn't
                    }
                  }

                  compassContact = candidateContact;
                  addLog(`🔍 Fuzzy name match: ${normalizedName} -> ${normalizeName(candidateContact["First Name"], candidateContact["Last Name"])}`);
                  matchFound = true;
                  break;
                }
              }
            }
          }

          // Add phone numbers if match found
          if (matchFound && compassContact) {
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
                  compassContact["Changes Made"] += `Added phone number: ${formattedPhone}`;

                  phonesAddedCount++;
                  phoneAdded = true;
                  break;
                }
              }
              if (phoneAdded) break;
            }

            if (phoneAdded) {
              contactsUpdatedCount++;
              addLog(`✅ Added phone to ${normalizedName}: ${phoneNumbers.map(formatPhoneNumber).join(", ")}`);
            }
          }
        }

        // Update progress
        setProgress(((chunkIndex + 1) / phoneChunks.length) * 100);

        // Small delay to keep UI responsive
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Final count of contacts that still need phones
      const stillMissingPhones = updatedContacts.filter((contact) => {
        return getAllPhoneNumbers(contact).length === 0;
      });

      addLog(`📞 Final result: ${stillMissingPhones.length} contacts still missing phones after all matching strategies`);

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
