import React, { useState } from "react";
import Papa from "papaparse";

const SimpleDuplicateTagger = () => {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  // Simple name normalization (matching processor logic)
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

  // Calculate information completeness score for a record
  const calculateInformationScore = (record) => {
    let score = 0;

    // Key fields worth more points
    const keyFields = [
      "First Name",
      "Last Name",
      "Email",
      "Personal Email",
      "Phone",
      "Mobile Phone",
      "Home Phone",
      "Work Phone",
      "Address",
      "City",
      "State",
      "Zip Code",
      "Country",
    ];

    // Secondary fields worth fewer points
    const secondaryFields = [
      "Company",
      "Job Title",
      "Website",
      "Birthday",
      "Anniversary",
      "Notes",
      "Lead Source",
      "Tags",
      "Created At",
      "Updated At",
    ];

    // Count key fields (3 points each)
    keyFields.forEach((field) => {
      if (record[field] && record[field].toString().trim()) {
        score += 3;
      }
    });

    // Count secondary fields (1 point each)
    secondaryFields.forEach((field) => {
      if (record[field] && record[field].toString().trim()) {
        score += 1;
      }
    });

    // Bonus for longer text fields (indicates more detailed info)
    const textFields = ["Notes", "Address", "Company"];
    textFields.forEach((field) => {
      if (record[field] && record[field].toString().trim().length > 50) {
        score += 2; // Bonus for detailed text
      }
    });

    return score;
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setLogs([]);
    addLog("Starting simple duplicate detection...");

    try {
      const text = await file.text();
      addLog(`File loaded, parsing CSV...`);

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
      });

      addLog(`Parsed ${parsed.data.length} records`);

      // Group records by normalized name
      const nameGroups = new Map();
      let recordsWithNames = 0;
      let recordsWithoutNames = 0;

      for (let i = 0; i < parsed.data.length; i++) {
        const record = parsed.data[i];
        const normalizedName = normalizeName(
          record["First Name"],
          record["Last Name"]
        );

        if (!normalizedName) {
          recordsWithoutNames++;
          continue;
        }

        recordsWithNames++;

        if (!nameGroups.has(normalizedName)) {
          nameGroups.set(normalizedName, []);
        }
        nameGroups.get(normalizedName).push({
          index: i,
          record: record,
        });
      }

      addLog(`Records with valid names: ${recordsWithNames}`);
      addLog(`Records without valid names: ${recordsWithoutNames}`);
      addLog(`Unique name groups: ${nameGroups.size}`);

      // Process duplicates - create a deep copy to avoid modifying original data
      const processedData = parsed.data.map((record) => ({ ...record }));
      let duplicateGroups = 0;
      let totalDuplicateRecords = 0;
      let masterRecords = 0;
      const duplicateDetails = [];

      for (const [name, records] of nameGroups.entries()) {
        if (records.length > 1) {
          duplicateGroups++;

          // Sort by information completeness - record with most data becomes master
          records.sort((a, b) => {
            const scoreA = calculateInformationScore(a.record);
            const scoreB = calculateInformationScore(b.record);
            return scoreB - scoreA; // Highest score first becomes master
          });

          // Tag ALL records in the group as duplicates (including master)
          for (let j = 0; j < records.length; j++) {
            const recordIndex = records[j].index;
            const record = processedData[recordIndex];

            // Debug: Log what we're about to modify for Lauren records
            if (
              record["First Name"] &&
              record["First Name"].toLowerCase().includes("lauren")
            ) {
              console.log(
                `Before tagging Lauren record at index ${recordIndex}:`,
                {
                  firstName: record["First Name"],
                  lastName: record["Last Name"],
                  name: record["Name"],
                  tags: record["Tags"],
                }
              );
            }

            const existingTags = record["Tags"] || "";
            if (!existingTags.includes("CRM:Duplicate")) {
              record["Tags"] = existingTags
                ? `${existingTags},CRM:Duplicate`
                : "CRM:Duplicate";
              
              // Add change tracking
              const existingChanges = record["Changes Made"] || "";
              const newChange = "Tagged as CRM:Duplicate";
              record["Changes Made"] = existingChanges
                ? `${existingChanges}; ${newChange}`
                : newChange;
            }
            totalDuplicateRecords++;

            // Debug: Log after modification
            if (
              record["First Name"] &&
              record["First Name"].toLowerCase().includes("lauren")
            ) {
              console.log(
                `After tagging Lauren record at index ${recordIndex}:`,
                {
                  firstName: record["First Name"],
                  lastName: record["Last Name"],
                  name: record["Name"],
                  tags: record["Tags"],
                }
              );
            }
          }

          // Track which one is the master (oldest) for reporting purposes
          const masterIndex = records[0].index;
          masterRecords++;

          // Store details for reporting
          duplicateDetails.push({
            name: name,
            count: records.length,
            masterIndex: masterIndex + 2, // +2 for CSV line number (1-indexed + header)
            duplicateIndexes: records.slice(1).map((r) => r.index + 2),
            records: records.map((r, index) => ({
              line: r.index + 2,
              firstName: r.record["First Name"] || "",
              lastName: r.record["Last Name"] || "",
              email:
                r.record["Email"] || r.record["Personal Email"] || "No email",
              createdAt: r.record["Created At"] || "No date",
              infoScore: calculateInformationScore(r.record),
              isMaster: index === 0,
            })),
          });
        }
      }

      // Sort duplicate groups by count (largest first)
      duplicateDetails.sort((a, b) => b.count - a.count);

      addLog(`\n=== TAGGING COMPLETE ===`);
      addLog(`Duplicate groups found: ${duplicateGroups}`);
      addLog(
        `Total records tagged with CRM:Duplicate: ${totalDuplicateRecords}`
      );
      addLog(
        `Master records (most complete info in each group): ${masterRecords}`
      );

      // Verify tags were applied
      const taggedDuplicates = processedData.filter(
        (r) => r.Tags && r.Tags.includes("CRM:Duplicate")
      ).length;

      addLog(`\n=== VERIFICATION ===`);
      addLog(`Records with CRM:Duplicate tag: ${taggedDuplicates}`);

      setResults({
        originalCount: parsed.data.length,
        processedData: processedData,
        duplicateGroups: duplicateGroups,
        masterRecords: masterRecords,
        duplicateRecords: totalDuplicateRecords,
        taggedDuplicates: taggedDuplicates,
        duplicateDetails: duplicateDetails.slice(0, 20), // Show top 20 groups
        recordsWithNames: recordsWithNames,
        recordsWithoutNames: recordsWithoutNames,
      });
    } catch (error) {
      addLog(`Error: ${error.message}`);
      console.error("Processing error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const exportResults = () => {
    if (!results) return;

    const csv = Papa.unparse(results.processedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "simple_duplicate_tagged.csv";
    link.click();
  };

  const exportTaggedOnly = () => {
    if (!results) return;

    // Filter to only records that have CRM:Duplicate tag
    const taggedRecords = results.processedData.filter(
      (record) => record.Tags && record.Tags.includes("CRM:Duplicate")
    );

    if (taggedRecords.length === 0) {
      alert("No tagged records found to export!");
      return;
    }

    const csv = Papa.unparse(taggedRecords);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "duplicate_tagged_only.csv";
    link.click();
  };

  // Extract all emails from a record
  const extractEmails = (record) => {
    const emailFields = [
      "Email",
      "Personal Email",
      "Work Email",
      "Primary Email",
      "Primary Personal Email",
      "Primary Work Email",
      "Email 2",
      "Primary other Email",
      "other Email",
      "Primary Custom Email",
      "Primary personal Email",
      "other Email 2",
      "other Email 3",
      "Primary work Email",
      "work Email",
      "Email 3",
      "Email 4",
      "Email 5",
      "Email 6",
      "work Email 2",
      "Personal Email 2",
      "Personal Email 3",
      "Personal Email 4",
      "home Email",
      "home Email 2",
      "personal Email",
      "other Email 4",
      "Custom Email",
      "Custom Email 2",
      "Obsolete Email",
    ];

    return emailFields
      .map((field) => record[field])
      .filter((email) => email && email.trim() && email.includes("@"))
      .map((email) => email.trim().toLowerCase());
  };

  // Extract all phone numbers from a record
  const extractPhones = (record) => {
    const phoneFields = [
      "Phone",
      "Mobile Phone",
      "Home Phone",
      "Work Phone",
      "Primary Phone",
      "Primary Mobile Phone",
      "Primary Home Phone",
      "Primary Work Phone",
      "Primary Main Phone",
      "Primary Other Phone",
      "Other Phone",
      "Home Phone 2",
      "Other Phone 2",
      "Phone 2",
      "Work Phone 2",
      "Mobile Phone 2",
      "Mobile Phone 3",
      "Main Phone",
      "Custom Phone",
      "Primary Custom Phone",
      "Primary Wife Phone",
      "Primary workMobile Phone",
      "Work_fax Phone",
      "Home_fax Phone",
      "Primary Work_fax Phone",
      "Primary homeFax Phone",
      "Primary Other_fax Phone",
      "Primary Home_fax Phone",
    ];

    return phoneFields
      .map((field) => record[field])
      .filter((phone) => phone && phone.trim())
      .map((phone) => phone.trim().replace(/\D/g, "")) // Remove non-digits for comparison
      .filter((phone) => phone.length >= 10); // Valid phone numbers
  };

  // Merge duplicate records into masters
  const mergeRecords = () => {
    if (!results) return;

    setProcessing(true);
    addLog("\n=== STARTING MERGE PROCESS ===");

    try {
      const mergedData = results.processedData.map((record) => ({ ...record }));
      let mergeCount = 0;
      let masterCount = 0;

      // Group records by normalized name again to process merges
      const nameGroups = new Map();

      for (let i = 0; i < mergedData.length; i++) {
        const record = mergedData[i];
        if (!record.Tags || !record.Tags.includes("CRM:Duplicate")) continue;

        const normalizedName = normalizeName(
          record["First Name"],
          record["Last Name"]
        );
        if (!normalizedName) continue;

        if (!nameGroups.has(normalizedName)) {
          nameGroups.set(normalizedName, []);
        }
        nameGroups.get(normalizedName).push({ index: i, record: record });
      }

      // Process each duplicate group
      for (const [name, records] of nameGroups.entries()) {
        if (records.length <= 1) continue;

        // Sort by information completeness - highest score becomes master
        records.sort((a, b) => {
          const scoreA = calculateInformationScore(a.record);
          const scoreB = calculateInformationScore(b.record);
          return scoreB - scoreA;
        });

        const masterRecord = mergedData[records[0].index];
        const duplicateRecords = records.slice(1);

        addLog(
          `Merging ${duplicateRecords.length} duplicates into master: "${name}"`
        );

        // Debug: Track Robert Abbott specifically
        if (
          name.toLowerCase().includes("robert") &&
          name.toLowerCase().includes("abbott")
        ) {
          console.log("=== ROBERT ABBOTT MERGE DEBUG ===");
          console.log(`Master record index: ${records[0].index}`);
          console.log(`Master record:`, masterRecord);
          console.log(`Duplicate records count: ${duplicateRecords.length}`);
          duplicateRecords.forEach((dup, i) => {
            console.log(`Duplicate ${i + 1} index: ${dup.index}`);
            console.log(`Duplicate ${i + 1} record:`, mergedData[dup.index]);
          });
        }

        // Extract existing data from master
        const masterEmails = extractEmails(masterRecord).map((e) =>
          e.toLowerCase()
        );
        const masterPhones = extractPhones(masterRecord);

        // Merge data from each duplicate into master
        for (const duplicate of duplicateRecords) {
          const dupRecord = mergedData[duplicate.index];

          // Merge emails
          const dupEmails = extractEmails(dupRecord);
          const emailFields = [
            "Personal Email",
            "Email",
            "Work Email",
            "Email 2",
            "Primary other Email",
            "other Email",
            "Primary Custom Email",
            "Primary personal Email",
            "other Email 2",
            "other Email 3",
            "Email 3",
            "Email 4",
            "Email 5",
            "Email 6",
            "work Email 2",
            "Personal Email 2",
            "Personal Email 3",
            "Personal Email 4",
            "home Email",
            "home Email 2",
            "personal Email",
            "other Email 4",
            "Custom Email",
            "Custom Email 2",
          ];

          for (const email of dupEmails) {
            if (!masterEmails.includes(email.toLowerCase())) {
              // Find first empty email field
              for (const field of emailFields) {
                if (!masterRecord[field] || !masterRecord[field].trim()) {
                  masterRecord[field] = email;
                  masterEmails.push(email.toLowerCase());
                  break;
                }
              }
            }
          }

          // Merge phone numbers
          const dupPhones = extractPhones(dupRecord);
          const phoneFields = [
            "Mobile Phone",
            "Home Phone",
            "Work Phone",
            "Primary Other Phone",
            "Other Phone",
            "Home Phone 2",
            "Other Phone 2",
            "Phone 2",
            "Work Phone 2",
            "Mobile Phone 2",
            "Mobile Phone 3",
            "Main Phone",
            "Custom Phone",
            "Primary Custom Phone",
            "Primary Wife Phone",
            "Primary workMobile Phone",
          ];

          for (const phone of dupPhones) {
            if (!masterPhones.includes(phone)) {
              // Find first empty phone field
              for (const field of phoneFields) {
                if (!masterRecord[field] || !masterRecord[field].trim()) {
                  masterRecord[field] = phone;
                  masterPhones.push(phone);
                  break;
                }
              }
            }
          }

          // Merge other fields if master is empty
          const fieldsToMerge = [
            "Company",
            "Title",
            "Notes",
            "Key Background Info",
            "Primary Work Address Line 1",
            "Primary Work Address City",
            "Primary Work Address State",
            "Primary Work Address Zip",
            "Home Address Line 1",
            "Home Address City",
            "Home Address State",
            "Home Address Zip",
            "Team Assigned To",
          ];

          for (const field of fieldsToMerge) {
            if (
              (!masterRecord[field] || !masterRecord[field].trim()) &&
              dupRecord[field] &&
              dupRecord[field].trim()
            ) {
              masterRecord[field] = dupRecord[field];
            }
          }

          // Merge tags (combine unique tags)
          if (dupRecord["Tags"]) {
            const masterTags = (masterRecord["Tags"] || "")
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t);
            const dupTags = dupRecord["Tags"]
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t);
            const allTags = [...new Set([...masterTags, ...dupTags])];
            masterRecord["Tags"] = allTags.join(",");
          }

          mergeCount++;
        }

        // Update master record tags
        const existingTags = (masterRecord["Tags"] || "")
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t);
        const updatedTags = existingTags.filter((t) => t !== "CRM:Duplicate");
        if (!updatedTags.includes("CRM:Merged")) {
          updatedTags.push("CRM:Merged");
        }
        masterRecord["Tags"] = updatedTags.join(",");
        
        // Add change tracking for merge
        const existingChanges = masterRecord["Changes Made"] || "";
        const newChange = `Merged with ${duplicateRecords.length} duplicate records`;
        masterRecord["Changes Made"] = existingChanges
          ? `${existingChanges}; ${newChange}`
          : newChange;

        masterCount++;
      }

      addLog(`\n=== MERGE COMPLETE ===`);
      addLog(`Master records created: ${masterCount}`);
      addLog(`Duplicate records merged: ${mergeCount}`);

      // Debug: Count Robert Abbott records in final mergedData
      const robertAbbottRecords = mergedData.filter(
        (record) =>
          record["First Name"] &&
          record["Last Name"] &&
          record["First Name"].toLowerCase().includes("robert") &&
          record["Last Name"].toLowerCase().includes("abbott")
      );
      console.log("=== FINAL ROBERT ABBOTT COUNT ===");
      console.log(
        `Found ${robertAbbottRecords.length} Robert Abbott records in mergedData:`
      );
      robertAbbottRecords.forEach((record, i) => {
        console.log(`Robert Abbott ${i + 1}:`, {
          firstName: record["First Name"],
          lastName: record["Last Name"],
          tags: record["Tags"],
          email: record["Email"] || record["Personal Email"],
        });
      });

      // Update results with merged data
      setResults({
        ...results,
        mergedData: mergedData,
        masterCount: masterCount,
        mergeCount: mergeCount,
        hasMerged: true,
      });
    } catch (error) {
      addLog(`Merge error: ${error.message}`);
      console.error("Merge error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const exportMergedResults = () => {
    if (!results || !results.hasMerged) return;

    // Debug: Check what we're about to export
    console.log("=== EXPORT DEBUG ===");
    console.log(`Total records in mergedData: ${results.mergedData.length}`);

    const robertAbbottExportRecords = results.mergedData.filter(
      (record) =>
        record["First Name"] &&
        record["Last Name"] &&
        record["First Name"].toLowerCase().includes("robert") &&
        record["Last Name"].toLowerCase().includes("abbott")
    );

    console.log(
      `Robert Abbott records being exported: ${robertAbbottExportRecords.length}`
    );
    robertAbbottExportRecords.forEach((record, i) => {
      console.log(`Export Robert Abbott ${i + 1}:`, {
        firstName: record["First Name"],
        lastName: record["Last Name"],
        tags: record["Tags"],
        email:
          record["Email"] ||
          record["Personal Email"] ||
          record["Primary Work Email"],
        createdAt: record["Created At"],
      });
    });

    const csv = Papa.unparse(results.mergedData);

    // Debug: Check the CSV output for Robert Abbott
    const csvLines = csv.split("\n");
    const robertLines = csvLines.filter(
      (line) =>
        line.toLowerCase().includes("robert") &&
        line.toLowerCase().includes("abbott")
    );
    console.log(`Robert Abbott lines in CSV: ${robertLines.length}`);
    robertLines.forEach((line, i) => {
      console.log(
        `CSV Robert Abbott line ${i + 1}:`,
        line.substring(0, 200) + "..."
      );
    });

    // Debug: Check for duplicate lines
    const allLines = csv.split("\n");
    console.log(`Total CSV lines: ${allLines.length}`);
    console.log(
      `First few Robert Abbott characters in CSV:`,
      csv.substring(csv.indexOf("Robert"), csv.indexOf("Robert") + 500)
    );

    // Debug: Check if both records are actually different
    const uniqueRobertLines = [...new Set(robertLines)];
    console.log(`Unique Robert Abbott lines: ${uniqueRobertLines.length}`);
    if (uniqueRobertLines.length !== robertLines.length) {
      console.log("WARNING: Duplicate Robert Abbott lines detected!");
      console.log("Original lines:", robertLines.length);
      console.log("Unique lines:", uniqueRobertLines.length);
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "merged_duplicates.csv";
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Simple Duplicate Tagger</h1>
      <p className="text-gray-600 mb-6">
        This tool only focuses on duplicate detection and tagging - no merging,
        classification, or other complex logic.
      </p>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <button
          onClick={processFile}
          disabled={!file || processing}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {processing ? "Processing..." : "Tag Duplicates"}
        </button>
      </div>

      {/* Processing Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-100 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Processing Log</h3>
          <div className="text-sm font-mono max-h-60 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Results Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {results.originalCount}
                </div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {results.duplicateGroups}
                </div>
                <div className="text-sm text-gray-600">Duplicate Groups</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">
                  {results.taggedDuplicates}
                </div>
                <div className="text-sm text-gray-600">CRM:Duplicate Tags</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-lg font-bold">
                  {results.recordsWithNames}
                </div>
                <div className="text-sm text-gray-600">
                  Records with Valid Names
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-lg font-bold">
                  {results.recordsWithoutNames}
                </div>
                <div className="text-sm text-gray-600">
                  Records without Valid Names
                </div>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="text-center space-x-4">
            <button
              onClick={exportResults}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
            >
              Export All Records
            </button>
            <button
              onClick={exportTaggedOnly}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
            >
              Export Tagged Only ({results.taggedDuplicates} records)
            </button>
          </div>

          {/* Merge Section */}
          <div className="bg-orange-50 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-orange-800">
              📋 Merge Duplicates (Optional)
            </h2>
            <p className="text-gray-700 mb-4">
              Merge duplicate records into their master records. This will
              consolidate emails, phone numbers, and other data from duplicates
              into the master record with the highest information score.
            </p>

            {!results.hasMerged ? (
              <div className="space-y-4">
                <div className="bg-yellow-100 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="text-yellow-700">
                      <p className="font-medium">⚠️ Important:</p>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        <li>
                          Master records will get <strong>CRM:Merged</strong>{" "}
                          tags
                        </li>
                        <li>
                          Duplicate records keep <strong>CRM:Duplicate</strong>{" "}
                          tags
                        </li>
                        <li>
                          Emails, phones, and other data will be consolidated
                        </li>
                        <li>This action cannot be undone in this session</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={mergeRecords}
                    disabled={processing}
                    className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg disabled:opacity-50"
                  >
                    {processing
                      ? "Merging..."
                      : `🔄 Merge ${results.duplicateGroups} Duplicate Groups`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-100 border-l-4 border-green-400 p-4">
                  <div className="text-green-700">
                    <p className="font-medium">✅ Merge Complete!</p>
                    <div className="mt-2 text-sm">
                      <p>
                        • {results.masterCount} master records created with CRM:
                        Merged tags
                      </p>
                      <p>
                        • {results.mergeCount} duplicate records consolidated
                      </p>
                      <p>
                        • Data merged: emails, phones, addresses, and other
                        fields
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center space-x-4">
                  <button
                    onClick={exportMergedResults}
                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded"
                  >
                    📥 Export Merged Data
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
                  >
                    🔄 Start Over
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Top Duplicate Groups */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Top Duplicate Groups</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.duplicateDetails.map((group, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold">
                    {index + 1}. "{group.name}" ({group.count} records)
                  </h3>
                  <div className="text-sm space-y-1 mt-2">
                    {group.records.map((record, i) => (
                      <div
                        key={i}
                        className={`${
                          record.isMaster
                            ? "text-green-600 font-medium"
                            : "text-red-600"
                        }`}
                      >
                        {record.isMaster ? "[MASTER]" : "[DUPLICATE]"} Line{" "}
                        {record.line}: {record.firstName} {record.lastName} (
                        {record.email})
                        <span className="text-blue-500 ml-2">
                          - Score: {record.infoScore}
                        </span>
                        {record.createdAt !== "No date" && (
                          <span className="text-gray-500 ml-2">
                            - {record.createdAt}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logic Explanation */}
          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <div className="text-sm space-y-2">
              <p>
                <strong>Name Normalization:</strong> Converts names to
                lowercase, removes special characters, requires both first AND
                last name.
              </p>
              <p>
                <strong>Grouping:</strong> Groups records by normalized name
                (e.g., "John Smith" and "john smith" are the same).
              </p>
              <p>
                <strong>Master Selection:</strong> Record with most complete
                information (based on filled fields) is identified as master for
                reference.
              </p>
              <p>
                <strong>Duplicate Tagging:</strong> ALL records in duplicate
                groups (including masters) get CRM:Duplicate tag.
              </p>
              <p>
                <strong>No Merging:</strong> Records are only tagged - no data
                is merged or modified except for tags.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDuplicateTagger;
