import React, { useState } from "react";
import Papa from "papaparse";
import "./CsvFormatter.css";

function CsvFormatter() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [step1Data, setStep1Data] = useState({
    csvFile: null,
    sellingAgent: "",
    filteredData: null,
    allFormattedData: null,
    downloadReady: false,
  });
  const [step2Data, setStep2Data] = useState({
    homeAnniversaryCsv: null,
    streamAppCsv: null,
    mainSellingAgent: "", // Added to store the main selling agent name
  });
  const [step3Data, setStep3Data] = useState({
    processedData: null,
    downloadReady: false,
    matchedCount: 0,
    newEntriesCount: 0,
    isProcessing: false,
    progress: 0,
    currentOperation: "",
  });

  // Helper function to parse CSV using PapaParse
  const parseCSV = (csvText) => {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    return {
      headers: result.meta.fields,
      rows: result.data,
      originalText: csvText,
    };
  };

  // Helper function to convert data back to CSV
  const convertToCSV = (headers, rows) => {
    const csvHeader = headers.map((h) => `"${h}"`).join(",");
    const csvRows = rows.map((row) =>
      headers.map((header) => `"${row[header] || ""}"`).join(",")
    );
    return [csvHeader, ...csvRows].join("\n");
  };

  // Step 1: Handle CSV upload and agent filtering (preserve original format)
  const handleStep1CsvUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setStep1Data((prev) => ({ ...prev, csvFile: file }));

      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target.result;
        // Save the original text for later use
        setStep1Data((prev) => ({
          ...prev,
          originalCsvText: csvText,
          downloadReady: false,
        }));
      };
      reader.readAsText(file);
    }
  };

  const handleSellingAgentChange = (event) => {
    setStep1Data((prev) => ({ ...prev, sellingAgent: event.target.value }));
  };

  // Function to parse an address into components
  const parseAddress = (address) => {
    if (!address) return { line1: "", line2: "", city: "", state: "", zip: "" };

    let result = {
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip: "",
    };

    try {
      // Handle addresses like: 20 Chapel St, Unit B511, Brookline, MA 02446
      // First, try to extract city, state, zip from the end
      const addressParts = address
        .trim()
        .split(",")
        .map((part) => part.trim());

      // If we have at least 3 parts, we assume the last parts are city, state zip
      if (addressParts.length >= 3) {
        // Last part might be "STATE ZIP" or just "ZIP"
        const lastPart = addressParts.pop(); // Get the last part (e.g., "MA 02446")

        // Check if the last part contains both state and zip
        const stateZipMatch = lastPart.match(
          /^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/
        );

        if (stateZipMatch) {
          // We have both state and zip in the last part
          result.state = stateZipMatch[1].toUpperCase();
          result.zip = stateZipMatch[2];
        } else {
          // Last part might be just the ZIP
          if (/^\d{5}(?:-\d{4})?$/.test(lastPart)) {
            result.zip = lastPart;
            // In this case, the previous part is probably the state
            if (addressParts.length > 0) {
              const statePart = addressParts.pop();
              result.state = statePart.trim().toUpperCase();
            }
          } else {
            // Put it back if it doesn't match our patterns
            addressParts.push(lastPart);
          }
        }

        // City should be the last remaining part
        if (addressParts.length > 0) {
          result.city = addressParts.pop();
        }

        // If we have 2+ parts remaining, the second part is likely line2 (unit/apt)
        if (addressParts.length >= 2) {
          // Check if the second part starts with unit/apt/suite indicators
          const secondPart = addressParts[1].toLowerCase();
          if (
            secondPart.includes("unit") ||
            secondPart.includes("apt") ||
            secondPart.includes("#") ||
            secondPart.includes("suite") ||
            /^[a-zA-Z]?-?\d+[a-zA-Z]?$/.test(secondPart.trim()) // matches patterns like A-12, 2B, etc.
          ) {
            result.line2 = addressParts.splice(1).join(", ");
            result.line1 = addressParts[0];
          } else {
            // If no clear unit indicator, assume the first part is line1
            result.line1 = addressParts.join(", ");
            result.line2 = "";
          }
        } else {
          // Only one part left, it must be line1
          result.line1 = addressParts.join(", ");
        }
      } else if (addressParts.length === 2) {
        // Simpler case with just two parts
        result.line1 = addressParts[0];

        // Try to parse the second part as "CITY, STATE ZIP"
        const cityStateZip = addressParts[1].split(",").map((p) => p.trim());
        if (cityStateZip.length === 2) {
          result.city = cityStateZip[0];

          // Parse "STATE ZIP"
          const stateZip = cityStateZip[1].trim().split(/\s+/);
          if (stateZip.length >= 2) {
            result.state = stateZip[0].toUpperCase();
            result.zip = stateZip[1];
          }
        } else {
          result.city = addressParts[1];
        }
      } else if (addressParts.length === 1) {
        // Only one part - put it all in line1
        result.line1 = addressParts[0];
      }
    } catch (e) {
      console.error("Error parsing address:", e);
      result.line1 = address; // In case of error, put the whole address in line1
    }

    return result;
  };

  const filterBySellingAgent = () => {
    if (!step1Data.originalCsvText) {
      alert("Please upload a CSV file.");
      return;
    }

    // Parse with PapaParse to get headers and rows
    const parsed = Papa.parse(step1Data.originalCsvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });
    const headers = parsed.meta.fields;
    const rows = parsed.data;
    const agentName = step1Data.sellingAgent.trim().toLowerCase();

    // Find the selling agent column (flexible column name matching)
    const agentColumn =
      headers.find(
        (h) =>
          h &&
          h.toLowerCase().includes("selling") &&
          h.toLowerCase().includes("agent")
      ) || headers.find((h) => h && h.toLowerCase().includes("agent"));

    if (!agentColumn) {
      alert(
        "Could not find a selling agent column in the CSV. Please check your file format."
      );
      return;
    }

    // Format multiple buyers (replace | with & for multiple buyers) for ALL rows
    const buyerColumn = headers.find(
      (h) =>
        h &&
        h.toLowerCase().includes("buyer") &&
        h.toLowerCase().includes("name")
    );

    // Create two sets of rows - all rows with formatting and filtered rows
    let allFormattedRows = JSON.parse(JSON.stringify(rows));
    let filteredRows = [];

    if (buyerColumn) {
      // Apply formatting to all rows
      allFormattedRows.forEach((row) => {
        if (row[buyerColumn]) {
          // Split by | and check if there are multiple buyers
          const buyers = row[buyerColumn]
            .split("|")
            .map((b) => b.trim())
            .filter(Boolean);
          // If more than one buyer, replace | with & (for all rows)
          if (buyers.length >= 1) {
            row[buyerColumn] = buyers.join(" & ");
          }

          // Add name normalization to improve matching
          if (row[buyerColumn]) {
            // Process each buyer name in the joined string
            const normalizedBuyers = row[buyerColumn]
              .split(/\s*&\s*/)
              .map((name) => {
                // Handle company/trust names (all uppercase or contains business terms)
                if (
                  name.toUpperCase() === name ||
                  /\b(LLC|TRUST|INC|CORP|PROPERTIES|GROUP)\b/i.test(name)
                ) {
                  return name; // Keep business names as-is
                }

                // Handle Last,First format (most common in anniversary data)
                if (name.includes(",")) {
                  const [lastName, firstName] = name
                    .split(",")
                    .map((part) => part.trim());

                  // Format names with consistent capitalization
                  const formatName = (namePart) => {
                    if (!namePart) return "";
                    return namePart
                      .split(/\s+/)
                      .map((part) => {
                        if (part.length <= 1) return part.toUpperCase();
                        return (
                          part.charAt(0).toUpperCase() +
                          part.slice(1).toLowerCase()
                        );
                      })
                      .join(" ");
                  };

                  return `${formatName(lastName)},${formatName(firstName)}`;
                }

                return name; // Keep other formats as-is
              });

            // Join normalized buyers back together
            row[buyerColumn] = normalizedBuyers.join(" & ");
          }

          // Normalize buyer names for better matching
          if (row[buyerColumn]) {
            // Process each buyer name
            const normalizedBuyers = row[buyerColumn]
              .split(/\s*&\s*/)
              .map((name) => {
                // Handle company/trust names (all uppercase or contains LLC/TRUST)
                if (
                  name.toUpperCase() === name ||
                  /\b(LLC|TRUST|INC|CORP|PROPERTIES|GROUP)\b/i.test(name)
                ) {
                  return name; // Keep business names as-is
                }

                // Handle Last,First format (most common in anniversary data)
                if (name.includes(",")) {
                  // Ensure consistent capitalization for Last,First format
                  const [lastName, firstName] = name
                    .split(",")
                    .map((part) => part.trim());

                  // Capitalize first letter of each name part
                  const formatName = (namePart) => {
                    if (!namePart) return "";
                    return namePart
                      .split(/\s+/)
                      .map((part) => {
                        if (part.length <= 1) return part.toUpperCase();
                        return (
                          part.charAt(0).toUpperCase() +
                          part.slice(1).toLowerCase()
                        );
                      })
                      .join(" ");
                  };

                  const formattedLastName = formatName(lastName);
                  const formattedFirstName = formatName(firstName);

                  // Return in consistent Last,First format
                  return `${formattedLastName},${formattedFirstName}`;
                }

                // Handle First Last format (less common but possible)
                const parts = name.split(/\s+/);
                if (parts.length >= 2) {
                  // Try to detect if it's already in First Last format and normalize
                  const formattedParts = parts.map((part) => {
                    if (part.length <= 1) return part.toUpperCase();
                    return (
                      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                    );
                  });

                  // Convert to Last,First format for consistency
                  const lastName = formattedParts.pop();
                  const firstName = formattedParts.join(" ");
                  return `${lastName},${firstName}`;
                }

                return name; // Keep single names as-is
              });

            // Join normalized buyers back together
            row[buyerColumn] = normalizedBuyers.join(" & ");
          }
        }

        // We'll handle address parsing outside this block
      });

      // Add address parsing for all rows
      // Look for the most likely address column - try various patterns
      let addressColumn = headers.find(
        (h) => h && h.toLowerCase() === "address" // Exact match first
      );

      if (!addressColumn) {
        addressColumn = headers.find(
          (h) => h && h.toLowerCase().includes("property address") // Common in real estate data
        );
      }

      if (!addressColumn) {
        addressColumn = headers.find(
          (h) =>
            h &&
            h.toLowerCase().includes("address") &&
            !h.includes("Line") &&
            !h.includes("City") &&
            !h.includes("State") &&
            !h.includes("Zip")
        );
      }

      // Log which address column we found
      console.log("Using address column:", addressColumn);

      if (addressColumn) {
        // Add new address fields to headers if they don't exist
        const newAddressHeaders = [
          "Home Address Line 1",
          "Home Address Line 2",
          "Home Address City",
          "Home Address State",
          "Home Address Zip",
        ];

        // Add the new headers to the headers array
        newAddressHeaders.forEach((header) => {
          if (!headers.includes(header)) {
            headers.push(header);
            console.log(`Added new header: ${header}`);
          }
        });

        // Process all rows to parse addresses
        allFormattedRows.forEach((row) => {
          if (row[addressColumn]) {
            const parsedAddress = parseAddress(row[addressColumn]);

            // Add parsed components to the row
            row["Home Address Line 1"] = parsedAddress.line1;
            row["Home Address Line 2"] = parsedAddress.line2;
            row["Home Address City"] = parsedAddress.city;
            row["Home Address State"] = parsedAddress.state;
            row["Home Address Zip"] = parsedAddress.zip;

            // Add log for debugging
            console.log(
              `Parsed address "${row[addressColumn]}" into:`,
              parsedAddress
            );
          }
        });
      }

      // Filter rows that match the selling agent name (if agent name provided)
      if (agentName) {
        filteredRows = allFormattedRows.filter(
          (row) =>
            row[agentColumn] &&
            row[agentColumn].toLowerCase().includes(agentName)
        );
      } else {
        // If no agent name provided, use all rows
        filteredRows = allFormattedRows;
      }
    }

    // Ensure all headers are included (original + new address headers)
    const allHeaders = [...headers];

    // Make sure the address headers are included
    const addressHeaders = [
      "Home Address Line 1",
      "Home Address Line 2",
      "Home Address City",
      "Home Address State",
      "Home Address Zip",
    ];

    // Add any missing headers
    addressHeaders.forEach((header) => {
      if (!allHeaders.includes(header)) {
        allHeaders.push(header);
      }
    });

    // Use Papa.unparse with explicit fields to preserve formatting and include all columns
    const filteredCsv = Papa.unparse({
      fields: allHeaders,
      data: filteredRows,
    });

    const allFormattedCsv = Papa.unparse({
      fields: allHeaders,
      data: allFormattedRows,
    });

    setStep1Data((prev) => ({
      ...prev,
      filteredData: {
        headers: allHeaders,
        rows: filteredRows,
        csvText: filteredCsv,
      },
      allFormattedData: {
        headers: allHeaders,
        rows: allFormattedRows,
        csvText: allFormattedCsv,
      },
      downloadReady: true,
    }));
  };

  const downloadFilteredCSV = () => {
    if (!step1Data.filteredData) return;

    const csvContent = step1Data.filteredData.csvText;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `filtered_home_anniversaries_${step1Data.sellingAgent.replace(
      /\s+/g,
      "_"
    )}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadAllFormattedCSV = () => {
    if (!step1Data.allFormattedData) return;

    const csvContent = step1Data.allFormattedData.csvText;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_formatted_home_anniversaries.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Step 2: Handle dual CSV uploads
  const handleHomeAnniversaryUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target.result;
        const parsedData = parseCSV(csvText);
        // We now have a dedicated input in Step 3 for the main agent
        setStep2Data((prev) => ({
          ...prev,
          homeAnniversaryCsv: parsedData,
        }));
      };
      reader.readAsText(file);
    }
  };

  const handleStreamAppUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target.result;
        const parsedData = parseCSV(csvText);
        setStep2Data((prev) => ({ ...prev, streamAppCsv: parsedData }));
      };
      reader.readAsText(file);
    }
  };

  // Step 3: Process and merge data
  const processAndMergeData = async () => {
    if (!step2Data.homeAnniversaryCsv || !step2Data.streamAppCsv) {
      alert("Please upload both CSV files before processing.");
      return;
    }

    // Set processing state
    setStep3Data((prev) => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      currentOperation: "Initializing processing...",
      processedData: null,
      downloadReady: false,
    }));

    // Prepare to track changes for detailed reporting
    const changeLog = [];
    let matchedCount = 0;
    let newEntriesCount = 0;
    let totalBuyersProcessed = 0;
    let totalSellersProcessed = 0;
    // Track unique contacts that were updated to avoid counting duplicates
    const uniqueContactsUpdated = new Set();
    // Track unique log entries to avoid duplicate logs
    const uniqueLogEntries = new Set();

    // Helper function to delay execution and allow UI updates
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Helper function to process data in chunks
    const processInChunks = async (items, chunkSize, processor) => {
      const chunks = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await processor(chunk, i, chunks.length);

        // Update progress
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        setStep3Data((prev) => ({
          ...prev,
          progress: progress,
          currentOperation: `Processing chunk ${i + 1} of ${chunks.length}...`,
        }));

        // Allow UI to update by yielding control
        await delay(10);
      }
    };

    try {
      // Prepare home anniversary data (filtered CSV)
      const haRows = step2Data.homeAnniversaryCsv.rows;
      const haHeaders = step2Data.homeAnniversaryCsv.headers;

      // Find relevant columns in filtered CSV
      const haBuyerNameCol = haHeaders.find(
        (h) =>
          h &&
          h.toLowerCase().includes("buyer") &&
          h.toLowerCase().includes("name")
      );
      const haSellerNameCol = haHeaders.find(
        (h) =>
          h &&
          h.toLowerCase().includes("seller") &&
          h.toLowerCase().includes("name")
      );
      const haAddressCol = haHeaders.find((h) =>
        h.toLowerCase().includes("address")
      );
      const haAnnivCol = haHeaders.find(
        (h) =>
          h.toLowerCase().includes("anniversary") ||
          h.toLowerCase().includes("date")
      );
      const haSellingAgentCol = haHeaders.find(
        (h) =>
          h &&
          h.toLowerCase().includes("selling") &&
          h.toLowerCase().includes("agent")
      );

      // Add listing agent column detection
      const haListingAgentCol = haHeaders.find(
        (h) =>
          h &&
          h.toLowerCase().includes("listing") &&
          h.toLowerCase().includes("agent")
      );

      if (!haBuyerNameCol || !haAnnivCol) {
        alert(
          "Could not find buyer name or anniversary date columns in the home anniversary CSV."
        );
        return;
      }

      // Prepare stream app data
      const saRows = step2Data.streamAppCsv.rows;
      const saHeaders = step2Data.streamAppCsv.headers;

      // Find relevant columns in stream app CSV
      const saFirstNameCol = saHeaders.find(
        (h) => h.toLowerCase().replace(/\s/g, "") === "firstname"
      );
      const saLastNameCol = saHeaders.find(
        (h) => h.toLowerCase().replace(/\s/g, "") === "lastname"
      );

      if (!saFirstNameCol || !saLastNameCol) {
        alert(
          "Could not find first name or last name columns in the Compass contacts CSV."
        );
        return;
      }

      // Check if Home Anniversary column exists, if not we'll create it
      let saHomeAnnivCol = saHeaders.find((h) =>
        h.toLowerCase().includes("home anniversary")
      );

      // Create a deep copy of the stream app rows to modify
      const updatedSaRows = JSON.parse(JSON.stringify(saRows));

      // If Home Anniversary column doesn't exist, add it to headers and all rows
      if (!saHomeAnnivCol) {
        saHomeAnnivCol = "Home Anniversary";
        saHeaders.push(saHomeAnnivCol);
        updatedSaRows.forEach((row) => {
          row[saHomeAnnivCol] = "";
        });
      }

      // Add Closed Date column right after Home Anniversary
      let saClosedDateCol = saHeaders.find((h) =>
        h.toLowerCase().includes("closed date")
      );

      if (!saClosedDateCol) {
        saClosedDateCol = "Closed Date";
        saHeaders.push(saClosedDateCol);
        updatedSaRows.forEach((row) => {
          row[saClosedDateCol] = "";
        });
      }

      // Ensure 'Groups', 'Tags', 'Notes', and 'Changes Made' columns are added to headers
      if (!saHeaders.includes("Groups")) {
        saHeaders.push("Groups");
      }
      if (!saHeaders.includes("Tags")) {
        saHeaders.push("Tags");
      }
      if (!saHeaders.includes("Notes")) {
        saHeaders.push("Notes");
      }
      if (!saHeaders.includes("Changes Made")) {
        saHeaders.push("Changes Made");
      }

      // Initialize columns for all existing rows
      updatedSaRows.forEach((row) => {
        if (!row["Groups"]) {
          row["Groups"] = "";
        }
        if (!row["Tags"]) {
          row["Tags"] = "";
        }
        if (!row["Notes"]) {
          row["Notes"] = "";
        }
        if (!row["Changes Made"]) {
          row["Changes Made"] = "";
        }
        if (!row[saClosedDateCol]) {
          row[saClosedDateCol] = "";
        }
      });

      // Helper function to detect if a name is likely a company name
      // Function to clean names for output - remove initials completely
      const cleanNameForOutput = (name, isFirstName = true) => {
        if (!name || typeof name !== "string") return name;

        let cleanedName;

        // For first names, get just the first substantial word (ignoring middle names/initials)
        if (isFirstName) {
          const parts = name.trim().split(/\s+/);
          cleanedName = parts[0];

          // If first part is just an initial, try to use the next substantial part
          if (
            parts.length > 1 &&
            (parts[0].length === 1 ||
              (parts[0].length === 2 && parts[0].endsWith(".")))
          ) {
            // Look for the next substantial part (not an initial)
            for (let i = 1; i < parts.length; i++) {
              if (parts[i].length > 1 && !parts[i].endsWith(".")) {
                cleanedName = parts[i];
                break;
              }
            }
          }
        }
        // For last names, always remove leading initials
        else {
          const parts = name.trim().split(/\s+/);

          // If there's only one part, just return it
          if (parts.length <= 1) {
            cleanedName = name;
          } else {
            // Check if the first part is an initial (single letter possibly with period)
            if (
              parts[0].length === 1 ||
              (parts[0].length === 2 && parts[0].endsWith("."))
            ) {
              // Remove the initial and return the rest
              cleanedName = parts.slice(1).join(" ");
            } else {
              cleanedName = name;
            }
          }
        }

        // Apply title case to the cleaned name
        return toTitleCase(cleanedName);
      };

      const isLikelyCompany = (name) => {
        // List of business identifiers/suffixes
        const businessTerms = [
          "llc",
          "inc",
          "ltd",
          "corp",
          "corporation",
          "holdings",
          "enterprises",
          "group",
          "associates",
          "partners",
          "properties",
          "realty",
          "management",
          "services",
          "solutions",
          "trust",
          "investments",
          "fund",
          "capital",
        ];

        const lowerName = name.toLowerCase();

        // Check for business identifiers
        for (const term of businessTerms) {
          if (lowerName.includes(term)) {
            return true;
          }
        }

        // Check for multiple words without comma (likely a company name)
        if (!name.includes(",") && name.split(/\s+/).length > 2) {
          return true;
        }

        return false;
      };

      // Pre-process buyer name to avoid splitting trusts and businesses incorrectly
      // Also handle pipe separators (|) that might be in the data
      const preprocessBuyerName = (buyerNameRaw) => {
        if (!buyerNameRaw) return [];

        // Trim extra whitespace and normalize
        const normalizedName = buyerNameRaw.trim().replace(/\s+/g, " ");

        // If it's a likely business/trust that contains "&", keep it as one entity
        if (isLikelyCompany(normalizedName) && normalizedName.includes("&")) {
          return [normalizedName];
        }

        // First split by pipe (|) if present, which takes precedence over ampersands
        if (normalizedName.includes("|")) {
          return normalizedName.split(/\s*\|\s*/).flatMap((name) => {
            // Then split each pipe-separated part by "&" if needed
            if (name.includes("&") && !isLikelyCompany(name)) {
              return name.split(/\s*&\s*/);
            }
            return [name.trim()];
          });
        }

        // Split by "&" as normal
        return normalizedName.split(/\s*&\s*/).map((name) => name.trim());
      };

      // NEW: Enhanced name processor that creates separate rows for each person
      const processNameIntoSeparateRows = (
        nameString,
        baseRowData,
        anniversaryDate,
        contactType,
        isBuyer,
        firstNameCol,
        lastNameCol,
        homeAnnivCol,
        closedDateCol
      ) => {
        const separateRows = [];

        // Step 1: Split by pipe (|) first - highest priority separator
        const pipeGroups = nameString.split(/\s*\|\s*/);

        pipeGroups.forEach((pipeGroup) => {
          const cleanPipeGroup = pipeGroup.trim();
          if (!cleanPipeGroup) return;

          // WORKFLOW ENHANCEMENT: Handle "Last, First & First2" format
          if (cleanPipeGroup.includes(",")) {
            // Handle comma-separated format with potential ampersands
            const [lastPart, firstPart] = cleanPipeGroup
              .split(",")
              .map((part) => part.trim());

            if (firstPart && firstPart.includes("&")) {
              // WORKFLOW RULE: "Last Name, First-Name & First-Name-2 → duplicate the row for First-Name-2 (same Last-Name)"
              const firstNames = firstPart
                .split(/\s*&\s*/)
                .map((name) => name.trim())
                .filter(Boolean);

              firstNames.forEach((firstName) => {
                // Create full name in "Last, First" format for parsing
                const fullName = `${lastPart}, ${firstName}`;
                const {
                  firstName: cleanFirst,
                  lastName: cleanLast,
                  isValid,
                } = parseIndividualName(fullName);

                if (isValid) {
                  const newRow = {
                    ...baseRowData,
                    [firstNameCol]: cleanFirst,
                    [lastNameCol]: cleanLast,
                    [homeAnnivCol]: isBuyer ? anniversaryDate || "" : "",
                    [closedDateCol]: isBuyer ? "" : anniversaryDate || "",
                    ["Changes Made"]: `New ${contactType} contact added: ${cleanFirst} ${cleanLast}; ${
                      isBuyer ? "Home anniversary" : "Closed"
                    } date: ${anniversaryDate}; Tags added to Past clients group`,
                  };
                  separateRows.push(newRow);
                }
              });
            } else {
              // Handle simple "Last, First" format
              const { firstName, lastName, isValid } =
                parseIndividualName(cleanPipeGroup);

              if (isValid) {
                const newRow = {
                  ...baseRowData,
                  [firstNameCol]: firstName,
                  [lastNameCol]: lastName,
                  [homeAnnivCol]: isBuyer ? anniversaryDate || "" : "",
                  [closedDateCol]: isBuyer ? "" : anniversaryDate || "",
                  ["Changes Made"]: `New ${contactType} contact added: ${firstName} ${lastName}; ${
                    isBuyer ? "Home anniversary" : "Closed"
                  } date: ${anniversaryDate}; Tags added to Past clients group`,
                };
                separateRows.push(newRow);
              }
            }
          } else {
            // Handle formats without commas - split by ampersand
            let ampersandNames;
            if (
              isLikelyCompany(cleanPipeGroup) &&
              cleanPipeGroup.includes("&")
            ) {
              // Keep company names with & intact
              ampersandNames = [cleanPipeGroup];
            } else {
              ampersandNames = cleanPipeGroup.split(/\s*&\s*/);
            }

            ampersandNames.forEach((individualName) => {
              const cleanName = individualName.trim();
              if (!cleanName) return;

              // Step 3: Parse individual name into First/Last with proper case
              const { firstName, lastName, isValid } =
                parseIndividualName(cleanName);

              if (isValid) {
                const newRow = {
                  ...baseRowData,
                  [firstNameCol]: firstName,
                  [lastNameCol]: lastName,
                  [homeAnnivCol]: isBuyer ? anniversaryDate || "" : "",
                  [closedDateCol]: isBuyer ? "" : anniversaryDate || "",
                  ["Changes Made"]: `New ${contactType} contact added: ${firstName} ${lastName}; ${
                    isBuyer ? "Home anniversary" : "Closed"
                  } date: ${anniversaryDate}; Tags added to Past clients group`,
                };
                separateRows.push(newRow);
              }
            });
          }
        });

        return separateRows;
      };

      // NEW: Parse individual name with proper case formatting
      const parseIndividualName = (name) => {
        if (!name || typeof name !== "string") {
          return { firstName: "", lastName: "", isValid: false };
        }

        // Check if it's a company (keep existing company logic)
        if (isLikelyCompany(name)) {
          return {
            firstName: toTitleCase(name.trim()), // Put company name in first name field with proper case
            lastName: "",
            isValid: true,
          };
        }

        let firstName = "";
        let lastName = "";

        // Handle "Last, First Middle-Initial" format - WORKFLOW COMPLIANT
        if (name.includes(",")) {
          const [lastPart, firstPart] = name
            .split(",")
            .map((part) => part.trim());

          lastName = toTitleCase(lastPart);

          // WORKFLOW RULE: Keep the first given name, ignore middle initials after the comma
          if (firstPart) {
            const firstParts = firstPart.split(/\s+/);
            let cleanFirstName = firstParts[0] || "";
            
            // If first part is just an initial, try to use the next substantial part
            if (
              firstParts.length > 1 &&
              (firstParts[0].length === 1 ||
                (firstParts[0].length === 2 && firstParts[0].endsWith(".")))
            ) {
              // Look for the next substantial part (not an initial)
              for (let i = 1; i < firstParts.length; i++) {
                if (firstParts[i].length > 1 && !firstParts[i].endsWith(".")) {
                  cleanFirstName = firstParts[i];
                  break;
                }
              }
            }
            
            firstName = toTitleCase(cleanFirstName);
          }
        } else {
          // Handle "First Last" or "First Middle Last" format
          const parts = name.split(/\s+/).filter((part) => part.length > 0);

          if (parts.length >= 2) {
            // First word is first name, last word is last name (ignore middle parts)
            firstName = toTitleCase(parts[0]);
            lastName = toTitleCase(parts[parts.length - 1]);
          } else if (parts.length === 1) {
            firstName = toTitleCase(parts[0]);
            lastName = "";
          }
        }

        return {
          firstName: firstName,
          lastName: lastName,
          isValid: firstName.length >= 1, // Must have at least first name
        };
      };

      // NEW: Proper title case conversion
      const toTitleCase = (str) => {
        if (!str) return str;
        return str
          .toLowerCase()
          .split(/\s+/)
          .map((word) => {
            if (word.length === 0) return word;

            // Handle special cases like "McDonald", "O'Connor"
            if (word.includes("'")) {
              return word
                .split("'")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join("'");
            }
            if (word.toLowerCase().startsWith("mc") && word.length > 2) {
              return "Mc" + word.charAt(2).toUpperCase() + word.slice(3);
            }
            if (word.toLowerCase().startsWith("mac") && word.length > 3) {
              return "Mac" + word.charAt(3).toUpperCase() + word.slice(4);
            }

            // Standard title case
            return word.charAt(0).toUpperCase() + word.slice(1);
          })
          .join(" ");
      };

      // Process each row in home anniversaries CSV using chunked processing
      const CHUNK_SIZE = 50; // Process 50 rows at a time

      await processInChunks(
        haRows,
        CHUNK_SIZE,
        async (chunk, chunkIndex, totalChunks) => {
          setStep3Data((prev) => ({
            ...prev,
            currentOperation: `Processing home anniversary data (chunk ${
              chunkIndex + 1
            }/${totalChunks})...`,
          }));

          // Enhanced duplicate prevention tracking
          const processedKeys = new Set();

          chunk.forEach((haRow, rowIndex) => {
            const buyerNameRaw = haRow[haBuyerNameCol];
            const sellerNameRaw = haSellerNameCol
              ? haRow[haSellerNameCol]
              : null;
            const anniversaryDate = haRow[haAnnivCol] || "";
            const address = haRow[haAddressCol] || "";
            const sellingAgent = haRow[haSellingAgentCol] || "";
            const listingAgent = haListingAgentCol
              ? haRow[haListingAgentCol] || ""
              : "";

            // Get the main agent name we saved in step 2
            const mainAgentName = step2Data.mainSellingAgent.toLowerCase();

            if (!anniversaryDate) return; // Skip if no anniversary date

            // Determine if our agent is the selling agent (buyer's agent) or listing agent (seller's agent)
            // Clean and normalize agent names for comparison
            const cleanMainAgentName = mainAgentName.trim().toLowerCase();
            const cleanSellingAgent = sellingAgent.trim().toLowerCase();
            const cleanListingAgent = listingAgent.trim().toLowerCase();

            // Debug logging for the 70 Dalfonso case
            if (address.includes("70 Dalfonso")) {
              console.log("70 Dalfonso Debug:", {
                cleanMainAgentName,
                cleanSellingAgent,
                buyerNameRaw,
                sellerNameRaw,
                includes: cleanSellingAgent.includes(cleanMainAgentName),
              });
            }

            // Enhanced agent matching that handles middle initials
            // This means our agent is the selling agent (buyer's agent)
            const matchesAgent = (agentInFile, targetAgent) => {
              if (!agentInFile || !targetAgent) return false;

              const cleanFile = agentInFile.toLowerCase().trim();
              const cleanTarget = targetAgent.toLowerCase().trim();

              // Simple case: exact match or contains
              if (cleanFile.includes(cleanTarget)) return true;

              // Parse both names into parts
              const fileParts = cleanFile
                .split(/\s+/)
                .filter((part) => part.length > 0);
              const targetParts = cleanTarget
                .split(/\s+/)
                .filter((part) => part.length > 0);

              if (targetParts.length < 2 || fileParts.length < 2) return false;

              // Extract first and last names from target (user input)
              const targetFirst = targetParts[0];
              const targetLast = targetParts[targetParts.length - 1];

              // Check if file contains the first and last name (ignoring middle parts)
              const fileFirst = fileParts[0];
              const fileLast = fileParts[fileParts.length - 1];

              return targetFirst === fileFirst && targetLast === fileLast;
            };

            const isOurAgentSellingAgent =
              cleanSellingAgent !== "" &&
              matchesAgent(cleanSellingAgent, cleanMainAgentName);

            const isOurAgentListingAgent =
              cleanListingAgent !== "" &&
              matchesAgent(cleanListingAgent, cleanMainAgentName);

            // Enhanced debugging for troubleshooting - log more transactions to help debug
            const shouldDebugThis =
              address.includes("70 Dalfonso") ||
              address.includes("34 Black Hawk") ||
              address.includes("16 Shari Dr") ||
              address.includes("Westlake Dr") ||
              address.includes("Barton Creek") ||
              isOurAgentListingAgent ||
              Math.random() < 0.1; // Increased sample rate

            if (shouldDebugThis) {
              console.log("🔍 Agent Matching Debug:", {
                address: address,
                cleanMainAgentName: cleanMainAgentName,
                cleanSellingAgent: cleanSellingAgent || "[EMPTY]",
                cleanListingAgent: cleanListingAgent || "[EMPTY]",
                isOurAgentSellingAgent: isOurAgentSellingAgent,
                isOurAgentListingAgent: isOurAgentListingAgent,
                buyerNameRaw: buyerNameRaw || "[EMPTY]",
                sellerNameRaw: sellerNameRaw || "[EMPTY]",
                willProcess: isOurAgentSellingAgent
                  ? "BUYER ONLY"
                  : isOurAgentListingAgent
                  ? "SELLER ONLY (if seller name exists)"
                  : "SKIP - NOT OUR TRANSACTION",
              });
            }

            // Process contacts based on agent role
            const contactsToProcess = [];

            if (isOurAgentSellingAgent) {
              // Our agent represents the buyer - ONLY process buyer, NEVER process seller
              if (buyerNameRaw && buyerNameRaw.trim()) {
                const buyerNames = preprocessBuyerName(buyerNameRaw);
                buyerNames.forEach((name) => {
                  if (name && name.trim()) {
                    contactsToProcess.push({
                      name: name.trim(),
                      isBuyer: true,
                    });
                  }
                });
                totalBuyersProcessed += buyerNames.length;
              }
              // CRITICAL: When our agent is selling agent, NEVER process seller
              console.log(
                "Selling agent case - only processing buyer:",
                buyerNameRaw,
                "SKIPPING seller:",
                sellerNameRaw
              );
            } else if (isOurAgentListingAgent) {
              // Our agent represents the seller - ONLY process seller, NEVER process buyer
              if (sellerNameRaw && sellerNameRaw.trim()) {
                const sellerNames = preprocessBuyerName(sellerNameRaw); // Same preprocessing function works for sellers
                sellerNames.forEach((name) => {
                  if (name && name.trim()) {
                    contactsToProcess.push({
                      name: name.trim(),
                      isBuyer: false, // This is a seller
                    });
                  }
                });
                totalSellersProcessed += sellerNames.length;
                console.log(
                  "✅ Listing agent case - processing seller:",
                  sellerNameRaw,
                  "SKIPPING buyer:",
                  buyerNameRaw
                );
              } else {
                // ENHANCED: Handle case where seller name is empty but we're the listing agent
                console.log(
                  "⚠️ Listing agent case - SELLER NAME IS EMPTY:",
                  "Address:",
                  address,
                  "Listing Agent:",
                  listingAgent,
                  "Seller Name Raw:",
                  sellerNameRaw || "[EMPTY]",
                  "Buyer Name:",
                  buyerNameRaw || "[EMPTY]"
                );

                // Still skip processing since we don't have seller name data
                // But at least we're logging this so you know what's happening
              }
            } else {
              // Our agent is neither selling nor listing agent - SKIP this transaction entirely
              console.log(
                "SKIPPING transaction - our agent not involved:",
                "Selling Agent:",
                sellingAgent,
                "Listing Agent:",
                listingAgent,
                "Address:",
                address,
                "SKIPPING buyer:",
                buyerNameRaw,
                "SKIPPING seller:",
                sellerNameRaw
              );
              return; // Skip this entire transaction
            }

            if (contactsToProcess.length === 0) return; // Skip if no contacts to process

            // Helper function to simplify names by removing middle names/initials
            // This more advanced version detects and removes initials whether they're
            // attached to first or last name
            const simplifyName = (name) => {
              if (!name) return "";

              // First normalize the name - remove extra spaces, trim
              const normalizedName = name.trim().replace(/\s+/g, " ");

              // Function to identify if a part is likely an initial
              const isLikelyInitial = (part) => {
                return (
                  part.length === 1 || // Single character
                  (part.length === 2 && part.endsWith(".")) || // Single character with period
                  (part.length <= 3 && part.includes("."))
                ); // Short abbreviation with period
              };

              // Function to extract the core name (non-initial parts)
              const extractCoreName = (nameParts) => {
                // If we have 2 or fewer parts, return as is
                if (nameParts.length <= 2) return nameParts;

                // For more complex names, try to identify initials and remove them
                const firstPart = nameParts[0];
                const lastPart = nameParts[nameParts.length - 1];

                // Find non-initial parts for the main name
                const nonInitialParts = nameParts.filter(
                  (part) => !isLikelyInitial(part)
                );

                // If we have at least 2 non-initial parts, use first and last of those
                if (nonInitialParts.length >= 2) {
                  return [
                    nonInitialParts[0],
                    nonInitialParts[nonInitialParts.length - 1],
                  ];
                }

                // Otherwise, just use first and last parts regardless of initials
                return [firstPart, lastPart];
              };

              // Check if it's a comma-separated name (Last, First)
              if (normalizedName.includes(",")) {
                const parts = normalizedName
                  .split(",")
                  .map((part) => part.trim());

                if (parts.length < 2 || !parts[1]) {
                  return parts[0]; // Just return the last name if that's all we have
                }

                // Split the last name and first name into parts
                const lastNameParts = parts[0].split(" ");
                const firstNameParts = parts[1].split(" ");

                // Extract core name parts
                const coreLastName = extractCoreName(lastNameParts);
                const coreFirstName = extractCoreName(firstNameParts);

                // Use the main parts (first of first name, last of last name if multiple)
                return `${coreLastName[0]}, ${coreFirstName[0]}`;
              }
              // Otherwise assume it's First Last format
              else {
                const parts = normalizedName.split(" ");

                // Extract core name parts
                const coreParts = extractCoreName(parts);

                // Return first and last as core name
                return coreParts.join(" ");
              }
            };

            // Helper function to generate different name formats to try for matching
            const generateNameMatchFormats = (buyerName) => {
              const formats = [];

              // Handle empty or invalid input
              if (!buyerName || typeof buyerName !== "string") {
                return {
                  isCompany: false,
                  singleName: "unknown",
                  formats: [],
                };
              }

              // Check if it's likely a company (no need for name variations)
              if (isLikelyCompany(buyerName)) {
                return {
                  isCompany: true,
                  companyName: buyerName.trim(),
                  formats: [],
                };
              }

              // If name has comma "Last, First" format
              if (buyerName.includes(",")) {
                const [lastName, firstName] = buyerName
                  .split(",")
                  .map((part) => part.trim());

                // Handle potential middle names in both first and last name parts
                let primaryFirstName = firstName;
                let firstNameMiddle = "";

                if (firstName.includes(" ")) {
                  const firstNameParts = firstName.split(/\s+/);
                  primaryFirstName = firstNameParts[0];
                  firstNameMiddle = firstNameParts.slice(1).join(" ");
                }

                let primaryLastName = lastName;
                let lastNameMiddle = "";
                let lastWordOfLastName = lastName;

                if (lastName.includes(" ")) {
                  const lastNameParts = lastName.split(/\s+/);
                  primaryLastName = lastNameParts[0];
                  lastNameMiddle = lastNameParts.slice(1, -1).join(" ");
                  lastWordOfLastName = lastNameParts[lastNameParts.length - 1];
                }

                // Combine middle parts
                const combinedMiddle = [lastNameMiddle, firstNameMiddle]
                  .filter(Boolean)
                  .join(" ");

                return {
                  isCompany: false,
                  firstName: primaryFirstName,
                  lastName: lastWordOfLastName, // Use the last word as the core last name for matching
                  originalLastName: lastName, // Keep original for reference
                  combinedMiddle: combinedMiddle,
                  fullLastFirst: `${lastName}, ${firstName}`,
                  fullFirstLast: `${firstName} ${lastName}`,
                  formats: [
                    // Standard format
                    {
                      type: "standard",
                      firstName: primaryFirstName.toLowerCase(),
                      lastName: primaryLastName.toLowerCase(),
                    },
                    // Reversed format (in case data was entered in wrong order)
                    {
                      type: "reversed",
                      firstName: primaryLastName.toLowerCase(),
                      lastName: primaryFirstName.toLowerCase(),
                    },
                    // Full name format (in case searching across fields)
                    {
                      type: "fullname",
                      fullName: `${firstName} ${lastName}`.toLowerCase(),
                    },
                  ],
                };
              }
              // If name doesn't have comma, try to guess the format
              else {
                // First check for pipe separator and handle pipe-separated names
                if (buyerName.includes("|")) {
                  // Just take the first part before the pipe for matching
                  const firstPart = buyerName.split("|")[0].trim();
                  return generateNameMatchFormats(firstPart);
                }

                const parts = buyerName.trim().split(/\s+/);

                if (parts.length >= 2) {
                  // Assume "First Last" format
                  const lastName = parts.pop(); // Last word is the last name
                  const firstPart = parts[0]; // First word is the primary first name
                  const middleParts = parts.slice(1).join(" "); // Everything else is middle
                  const firstName = parts.join(" "); // Keep the whole first part for compatibility

                  return {
                    isCompany: false,
                    firstName: firstPart, // Just the first word as core first name
                    lastName: lastName, // Just the last word as core last name
                    originalFirstName: firstName, // Keep the full first part with middle names
                    fullFirstLast: buyerName.trim(),
                    formats: [
                      // Standard format (assuming First Last)
                      {
                        type: "standard",
                        firstName: firstPart.toLowerCase(), // Use just the first word of the first name
                        lastName: lastName.toLowerCase(),
                      },
                      // Reversed format (in case it's actually Last First)
                      {
                        type: "reversed",
                        firstName: lastName.toLowerCase(),
                        lastName: firstPart.toLowerCase(), // Use just the first word of the first name
                      },
                    ],
                  };
                } else {
                  // Single word name - can't really determine format
                  return {
                    isCompany: false,
                    singleName: buyerName.trim(),
                    formats: [
                      { type: "single", name: buyerName.trim().toLowerCase() },
                    ],
                  };
                }
              }
            };

            // Enhanced matching function to check if a contact matches the buyer
            const isNameMatch = (
              nameInfo,
              saFirstName,
              saLastName,
              saCompany = ""
            ) => {
              saFirstName = (saFirstName || "").trim().toLowerCase();
              saLastName = (saLastName || "").trim().toLowerCase();
              saCompany = (saCompany || "").trim().toLowerCase();

              // Skip matching if either first or last name is missing or too short
              if (
                !saFirstName ||
                !saLastName ||
                saFirstName.length < 2 ||
                saLastName.length < 2
              ) {
                return {
                  matched: false,
                  matchType: "insufficient-name-data",
                  details: "Skipped due to missing or insufficient name data",
                };
              }

              // Helper function to detect if a name looks like an initial
              const looksLikeInitial = (name) => {
                return /^[A-Za-z]\.?$/.test(name.trim()); // Single letter with optional period
              };

              // Helper function to detect if a name contains initials
              const containsInitials = (name) => {
                const parts = name.trim().split(/\s+/);
                return parts.some((part) => looksLikeInitial(part));
              };

              // Create simplified versions of the names (without middle names/initials)
              const saFullName = `${saFirstName} ${saLastName}`;
              const saSimplifiedName = simplifyName(saFullName).toLowerCase();
              const saSimplifiedParts = saSimplifiedName.split(/\s+/);
              const saSimplifiedFirstName = saSimplifiedParts[0];
              const saSimplifiedLastName =
                saSimplifiedParts.length > 1
                  ? saSimplifiedParts[saSimplifiedParts.length - 1]
                  : "";

              // If it's a company, do company matching
              if (nameInfo.isCompany) {
                const companyName = nameInfo.companyName.toLowerCase();

                // Normalized versions for company name matching
                const normalizedCompanyName = companyName.replace(
                  /[^\w\s]/g,
                  ""
                );
                const normalizedFullName =
                  `${saFirstName} ${saLastName}`.replace(/[^\w\s]/g, "");
                const normalizedSaCompany = saCompany.replace(/[^\w\s]/g, "");

                // Helper function to escape special regex characters
                const escapeRegex = (string) => {
                  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                };

                // Check for strict boundary match - MUCH more precise
                const escapedCompanyName = escapeRegex(companyName);
                const boundaryMatch =
                  new RegExp(`\\b${escapedCompanyName}\\b`).test(
                    `${saFirstName} ${saLastName}`
                  ) ||
                  (saCompany &&
                    new RegExp(`\\b${escapedCompanyName}\\b`).test(saCompany));

                // Only return true for exact boundary matches - prevents over-matching
                return {
                  matched: boundaryMatch,
                  matchType: boundaryMatch ? "company-boundary-match" : null,
                  details: boundaryMatch
                    ? `Company "${companyName}" found in "${saFirstName} ${saLastName}${
                        saCompany ? " or " + saCompany : ""
                      }"`
                    : null,
                };
              }

              // If it's a single name (without comma or multiple parts)
              if (nameInfo.singleName) {
                // Single names need to match exactly to prevent over-matching
                const singleName = nameInfo.singleName.toLowerCase();
                const firstNameMatch = saFirstName === singleName;
                const lastNameMatch = saLastName === singleName;

                return {
                  matched: firstNameMatch || lastNameMatch,
                  matchType: firstNameMatch
                    ? "single-name-first-match"
                    : lastNameMatch
                    ? "single-name-last-match"
                    : null,
                  details: firstNameMatch
                    ? `Single name "${singleName}" matched first name`
                    : lastNameMatch
                    ? `Single name "${singleName}" matched last name`
                    : null,
                };
              }

              // Parse contact's name parts
              const saFirstParts = saFirstName.split(/\s+/);
              const saPrimaryFirst = saFirstParts[0]; // First word of first name
              const saFirstMiddle =
                saFirstParts.length > 1 ? saFirstParts.slice(1).join(" ") : "";

              const saLastParts = saLastName.split(/\s+/);
              const saPrimaryLast = saLastParts[0]; // First word of last name
              const saLastMiddle =
                saLastParts.length > 1
                  ? saLastParts.slice(1, -1).join(" ")
                  : "";
              const saActualLast = saLastParts[saLastParts.length - 1]; // Last word of last name

              // NEW: Extract just the primary first and last names for more flexible matching
              // This helps with middle name variations like "Ethan Goldstein" vs "Ethan Gutmann Goldstein"
              const saBasicFirstName = saPrimaryFirst.toLowerCase();
              const saBasicLastName = saActualLast.toLowerCase();

              // Combine middle parts
              const saCombinedMiddle = [saFirstMiddle, saLastMiddle]
                .filter(Boolean)
                .join(" ");

              // Enhanced name matching logic - STRICT with proper middle name handling
              console.log(
                `Attempting to match: ${JSON.stringify(
                  nameInfo
                )} with ${saFirstName} ${saLastName} (Core: ${saBasicFirstName} ${saBasicLastName})`
              );

              // For comma-separated names (Last,First format)
              if (nameInfo.lastName && nameInfo.firstName) {
                // Check if one side has initials and the other doesn't - if so, be very strict
                const buyerHasInitials =
                  containsInitials(nameInfo.firstName) ||
                  containsInitials(nameInfo.lastName);
                const contactHasInitials =
                  containsInitials(saFirstName) || containsInitials(saLastName);

                // If only one side has initials, require perfect matches
                if (buyerHasInitials !== contactHasInitials) {
                  // Only allow exact matches when initials are involved on one side
                  const exactFirstMatch =
                    saPrimaryFirst === nameInfo.firstName.toLowerCase();
                  const exactLastMatch =
                    saPrimaryLast === nameInfo.lastName.toLowerCase() ||
                    saActualLast === nameInfo.lastName.toLowerCase();

                  if (exactFirstMatch && exactLastMatch) {
                    return {
                      matched: true,
                      matchType: "exact-name-match-with-initials",
                      details: `Exact match with initials involved: "${nameInfo.firstName} ${nameInfo.lastName}" with "${saPrimaryFirst} ${saLastName}"`,
                    };
                  } else {
                    // Don't allow fuzzy matching when initials are involved
                    return {
                      matched: false,
                      matchType: "initial-mismatch-rejected",
                      details: `Rejected: One side has initials (${
                        buyerHasInitials ? "buyer" : "contact"
                      }) but names don't match exactly`,
                    };
                  }
                }
                // 1. Exact match on both first and last - highest confidence
                const exactFirstMatch =
                  saPrimaryFirst === nameInfo.firstName.toLowerCase();
                const exactLastMatch =
                  saPrimaryLast === nameInfo.lastName.toLowerCase() ||
                  saActualLast === nameInfo.lastName.toLowerCase();

                if (exactFirstMatch && exactLastMatch) {
                  return {
                    matched: true,
                    matchType: "exact-name-match",
                    details: `Exact match: "${nameInfo.firstName} ${nameInfo.lastName}" with "${saPrimaryFirst} ${saLastName}"`,
                  };
                }

                // 2. Simplified name match - using the simplifyName function to handle middle names/initials
                const simplifiedBuyerName = simplifyName(
                  `${nameInfo.firstName} ${nameInfo.lastName}`
                ).toLowerCase();
                const simplifiedBuyerParts = simplifiedBuyerName.split(/\s+/);
                const simplifiedBuyerFirst = simplifiedBuyerParts[0];
                const simplifiedBuyerLast =
                  simplifiedBuyerParts.length > 1
                    ? simplifiedBuyerParts[simplifiedBuyerParts.length - 1]
                    : "";

                // BOTH simplified names must match
                const simplifiedFirstMatch =
                  simplifiedBuyerFirst === saSimplifiedFirstName;
                const simplifiedLastMatch =
                  simplifiedBuyerLast === saSimplifiedLastName;

                if (simplifiedFirstMatch && simplifiedLastMatch) {
                  return {
                    matched: true,
                    matchType: "simplified-name-match",
                    details: `Simplified name match (ignoring middle names/initials): "${simplifiedBuyerFirst} ${simplifiedBuyerLast}" matches "${saSimplifiedFirstName} ${saSimplifiedLastName}"`,
                  };
                }

                // Also try direct comparison of simplified names
                if (simplifiedBuyerName === saSimplifiedName) {
                  return {
                    matched: true,
                    matchType: "direct-simplified-match",
                    details: `Direct simplified name match: "${simplifiedBuyerName}" with "${saSimplifiedName}"`,
                  };
                }

                // 3. Core name match - ignores middle names completely
                const coreFirstMatch =
                  saBasicFirstName === nameInfo.firstName.toLowerCase();
                const coreLastMatch =
                  saBasicLastName === nameInfo.lastName.toLowerCase();

                if (coreFirstMatch && coreLastMatch) {
                  return {
                    matched: true,
                    matchType: "core-name-match",
                    details: `Core name match ignoring middle names: "${nameInfo.firstName} ${nameInfo.lastName}" matches "${saBasicFirstName} ${saBasicLastName}" in "${saFirstName} ${saLastName}"`,
                  };
                }

                // 4. Middle name handling in last name - REQUIRES EXACT FIRST NAME MATCH
                const lastNameMiddleMatch =
                  exactFirstMatch && // Must have exact first name match
                  saLastName
                    .toLowerCase()
                    .includes(nameInfo.lastName.toLowerCase()) &&
                  // Ensure the last name is a complete word OR at the end of the string
                  (new RegExp(`\\b${nameInfo.lastName.toLowerCase()}\\b`).test(
                    saLastName.toLowerCase()
                  ) ||
                    new RegExp(`\\b${nameInfo.lastName.toLowerCase()}$`).test(
                      saLastName.toLowerCase()
                    ));

                if (lastNameMiddleMatch) {
                  return {
                    matched: true,
                    matchType: "last-name-with-middle",
                    details: `First name exact match "${nameInfo.firstName}" and last name "${nameInfo.lastName}" found within compound last name "${saLastName}"`,
                  };
                }

                // 5. Handle first name with middle - REQUIRES EXACT LAST NAME MATCH
                const firstNameMiddleMatch =
                  exactLastMatch && // Must have exact last name match
                  saFirstName
                    .toLowerCase()
                    .includes(nameInfo.firstName.toLowerCase()) &&
                  // Make sure first name is a complete word in first name with middle
                  new RegExp(`\\b${nameInfo.firstName.toLowerCase()}\\b`).test(
                    saFirstName.toLowerCase()
                  );

                if (firstNameMiddleMatch) {
                  return {
                    matched: true,
                    matchType: "first-name-with-middle",
                    details: `Last name exact match "${nameInfo.lastName}" and first name "${nameInfo.firstName}" found within "${saFirstName}"`,
                  };
                }

                // 6. Hyphenated last name handling - REQUIRES EXACT FIRST NAME MATCH
                const hyphenatedLastNameMatch =
                  exactFirstMatch && // Must have exact first name match
                  (saLastName.includes("-") || saLastName.includes(" ")) &&
                  saLastName
                    .toLowerCase()
                    .split(/[-\s]/)
                    .includes(nameInfo.lastName.toLowerCase());

                if (hyphenatedLastNameMatch) {
                  return {
                    matched: true,
                    matchType: "hyphenated-last-name",
                    details: `First name exact match "${nameInfo.firstName}" and last name "${nameInfo.lastName}" found as part of hyphenated/compound last name "${saLastName}"`,
                  };
                }
              }

              // Check each format for specific matching patterns - STRICTER NOW
              for (const format of nameInfo.formats) {
                if (format.type === "standard") {
                  // Standard matching (Last, First) - BOTH names must match exactly
                  const lastNameMatch =
                    format.lastName === saPrimaryLast ||
                    format.lastName === saActualLast;
                  const exactFirstNameMatch =
                    format.firstName === saPrimaryFirst;

                  // BOTH must match for a positive result
                  if (lastNameMatch && exactFirstNameMatch) {
                    return {
                      matched: true,
                      matchType: "standard-exact-match",
                      details: `Standard format exact match: "${format.firstName} ${format.lastName}" with "${saPrimaryFirst} ${saLastName}"`,
                    };
                  }

                  // Core name match for standard format - BOTH must match
                  const coreNameMatch =
                    format.firstName === saBasicFirstName &&
                    format.lastName === saBasicLastName;

                  if (coreNameMatch) {
                    return {
                      matched: true,
                      matchType: "standard-core-match",
                      details: `Standard format core name match (ignoring middle names): "${format.firstName} ${format.lastName}" matches "${saBasicFirstName} ${saBasicLastName}" in "${saFirstName} ${saLastName}"`,
                    };
                  }

                  // Middle name handling - requires BOTH exact first name match AND proper last name matching
                  const middleNameMatch =
                    exactFirstNameMatch &&
                    saLastName.toLowerCase().includes(format.lastName) &&
                    (new RegExp(`\\b${format.lastName}\\b`).test(
                      saLastName.toLowerCase()
                    ) ||
                      new RegExp(`\\b${format.lastName}$`).test(
                        saLastName.toLowerCase()
                      ));

                  if (middleNameMatch) {
                    return {
                      matched: true,
                      matchType: "standard-middle-name",
                      details: `Standard format with middle/compound name: exact first name "${format.firstName}" and last name "${format.lastName}" found in "${saLastName}"`,
                    };
                  }

                  // Hyphenated or compound last name handling - requires exact first name match
                  if (
                    exactFirstNameMatch &&
                    (saLastName.includes("-") || saLastName.includes(" ")) &&
                    saLastName
                      .toLowerCase()
                      .split(/[-\s]/)
                      .includes(format.lastName)
                  ) {
                    return {
                      matched: true,
                      matchType: "standard-compound-last",
                      details: `Standard format with compound last name: exact first name "${format.firstName}" and last name "${format.lastName}" found in "${saLastName}"`,
                    };
                  } else if (format.type === "reversed") {
                    // Reversed matching (in case the data was entered in reversed order)
                    // Require both to match exactly to avoid false positives
                    const reversedLastMatch =
                      format.lastName === saPrimaryFirst;
                    const reversedFirstMatch =
                      format.firstName === saPrimaryLast;

                    if (reversedLastMatch && reversedFirstMatch) {
                      return {
                        matched: true,
                        matchType: "reversed-name-match",
                        details: `Reversed name format match: "${format.firstName} ${format.lastName}" with "${saPrimaryFirst} ${saLastName}" (reversed)`,
                      };
                    }
                  }
                } else if (format.type === "reversed") {
                  // Reversed matching (in case the data was entered in reversed order)
                  // Require both to match exactly to avoid false positives
                  const reversedLastMatch = format.lastName === saPrimaryFirst;
                  const reversedFirstMatch = format.firstName === saPrimaryLast;

                  if (reversedLastMatch && reversedFirstMatch) {
                    return {
                      matched: true,
                      matchType: "reversed-name-match",
                      details: `Reversed name format match: "${format.firstName} ${format.lastName}" with "${saPrimaryFirst} ${saLastName}" (reversed)`,
                    };
                  }
                }
                // Removed the following overly permissive matchers:
                // - fullname (too broad, caused over-matching)
                // - fullname-reversed (too broad)
                // - firstletter (too many false positives)
                // - lastname-only (too many false positives)
              }

              // No match found
              return {
                matched: false,
                matchType: null,
                details: null,
              };
            };

            contactsToProcess.forEach((contactInfo) => {
              const contactName = contactInfo.name;

              // Skip empty contact names
              if (!contactName.trim()) {
                return;
              }

              // Enhanced duplicate prevention - create comprehensive keys
              const contactKey = `${contactName.toLowerCase().trim()}-${address
                .toLowerCase()
                .trim()}-${anniversaryDate}`;
              const basicKey = `${contactName
                .toLowerCase()
                .trim()}-${anniversaryDate}`;

              // Check multiple criteria to prevent duplicates
              if (
                processedKeys &&
                (processedKeys.has(contactKey) || processedKeys.has(basicKey))
              ) {
                console.log(
                  `🚫 Skipping duplicate contact: ${contactName} at ${address}`
                );
                return;
              }

              // Track this contact to prevent future duplicates
              if (processedKeys) {
                processedKeys.add(contactKey);
                processedKeys.add(basicKey);
              }

              // Generate name matching formats
              const nameInfo = generateNameMatchFormats(contactName);

              // Handle company names
              if (nameInfo.isCompany) {
                const companyName = nameInfo.companyName;

                // Look for company name matches in compass contacts
                let matchFound = false;

                updatedSaRows.forEach((saRow, saIndex) => {
                  // Check in both First Name and Last Name fields
                  const saFirstName = (saRow[saFirstNameCol] || "").trim();
                  const saLastName = (saRow[saLastNameCol] || "").trim();

                  // Also check the Company field if it exists
                  const saCompanyField = saHeaders.find((h) =>
                    h.toLowerCase().includes("company")
                  );
                  const saCompany = saCompanyField
                    ? (saRow[saCompanyField] || "").trim()
                    : "";

                  // Check if this contact matches the company name
                  const matchResult = isNameMatch(
                    nameInfo,
                    saFirstName,
                    saLastName,
                    saCompany
                  );
                  if (matchResult.matched) {
                    matchFound = true;

                    // Only count this as a match if we haven't updated this contact before
                    const contactKey = `${saFirstName}-${saLastName}`;
                    if (!uniqueContactsUpdated.has(contactKey)) {
                      uniqueContactsUpdated.add(contactKey);
                      matchedCount++;
                    }

                    // Update the appropriate date field based on buyer vs seller
                    let oldValue = "";
                    if (contactInfo.isBuyer) {
                      // Buyers get Home Anniversary date
                      oldValue = saRow[saHomeAnnivCol] || "";
                      updatedSaRows[saIndex][saHomeAnnivCol] = anniversaryDate;
                      updatedSaRows[saIndex][saClosedDateCol] = ""; // Clear closed date
                    } else {
                      // Sellers get Closed Date
                      oldValue = saRow[saClosedDateCol] || "";
                      updatedSaRows[saIndex][saClosedDateCol] = anniversaryDate;
                      updatedSaRows[saIndex][saHomeAnnivCol] = ""; // Clear home anniversary
                    }

                    // Extract year from anniversary date for the sold date tag
                    const anniversaryYear = anniversaryDate
                      ? new Date(anniversaryDate).getFullYear()
                      : "";

                    // Create different tags based on whether this is a buyer or seller
                    const tagsToAdd = contactInfo.isBuyer
                      ? [
                          "CRM: Home Anniversary",
                          "Buyer",
                          anniversaryYear ? `${anniversaryYear}` : null,
                        ].filter(Boolean) // Remove null values
                      : [
                          "CRM: Closed Date",
                          "SELLER-CRMREFRESH",
                          anniversaryYear ? `${anniversaryYear}` : null,
                        ].filter(Boolean); // Remove null values

                    // Update or add the Tags field with consistent formatting
                    const existingTags = updatedSaRows[saIndex]["Tags"] || "";
                    let existingTagsArray = existingTags
                      ? existingTags.split(",").map((t) => t.trim())
                      : [];

                    // Remove old format CRM Refresh tags to ensure consistency
                    existingTagsArray = existingTagsArray.filter(
                      (tag) =>
                        !tag.toLowerCase().includes("crm refresh") ||
                        !tag.toLowerCase().includes("home anniversary")
                    );

                    // Add new tags that don't already exist
                    const addedTags = [];
                    tagsToAdd.forEach((tag) => {
                      if (!existingTagsArray.includes(tag)) {
                        existingTagsArray.push(tag);
                        addedTags.push(tag);
                      }
                    });

                    updatedSaRows[saIndex]["Tags"] =
                      existingTagsArray.join(", ");

                    // PROPER CHANGE TRACKING: Preserve existing changes and add new ones
                    const contactType = contactInfo.isBuyer
                      ? "buyer"
                      : "seller";
                    const newChanges = [];
                    newChanges.push(
                      `Updated existing contact as ${contactType}`
                    );
                    newChanges.push(
                      `Added home anniversary date (${anniversaryDate})`
                    );
                    if (addedTags.length > 0) {
                      newChanges.push(`Tags added: ${addedTags.join(", ")}`);
                    }

                    // Preserve existing "Changes Made" and append new changes
                    const existingChanges =
                      updatedSaRows[saIndex]["Changes Made"] || "";
                    updatedSaRows[saIndex]["Changes Made"] = existingChanges
                      ? `${existingChanges}; ${newChanges.join("; ")}`
                      : newChanges.join("; ");

                    // Optional: Also update Notes field for backward compatibility
                    const notes = newChanges.join(". ");
                    updatedSaRows[saIndex]["Notes"] = notes;

                    // Create a unique log entry key
                    const logKey = `${companyName}-${address}`;

                    // Only log if we haven't already logged this combination
                    if (!uniqueLogEntries.has(logKey)) {
                      uniqueLogEntries.add(logKey);

                      // Log the change
                      changeLog.push({
                        type: "company_match",
                        contactType: contactType,
                        contactName: companyName,
                        rowIndex: saIndex,
                        oldValue: oldValue,
                        newValue: anniversaryDate,
                        address: address,
                        matchType: matchResult.matchType,
                        matchDetails: matchResult.details,
                      });
                    }
                  }
                });

                // If no match was found, add a new row for the company
                if (!matchFound) {
                  newEntriesCount++;

                  // Extract year from anniversary date for the sold date tag
                  const anniversaryYear = anniversaryDate
                    ? new Date(anniversaryDate).getFullYear()
                    : "";

                  // Create different tags based on whether this is a buyer or seller
                  const contactType = contactInfo.isBuyer ? "buyer" : "seller";
                  const newEntryTags = contactInfo.isBuyer
                    ? [
                        "CRM: Home Anniversary",
                        "Buyer",
                        anniversaryYear ? `${anniversaryYear}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : [
                        "CRM: Closed Date",
                        "Seller",
                        anniversaryYear ? `${anniversaryYear}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ");

                  // Add the company as a new row - preserve address components
                  const newRow = {
                    [saFirstNameCol]: toTitleCase(companyName || ""), // First Name (we'll put the company name here with proper case)
                    [saLastNameCol]: "", // Last Name
                    // Preserve address components from the original row if they exist
                    ["Home Address Line 1"]:
                      haRow["Home Address Line 1"] || address || "",
                    ["Home Address Line 2"]: haRow["Home Address Line 2"] || "",
                    ["Home Address City"]: haRow["Home Address City"] || "",
                    ["Home Address State"]: haRow["Home Address State"] || "",
                    ["Home Address Zip"]: haRow["Home Address Zip"] || "",
                    // Set the appropriate date column based on buyer vs seller
                    [saHomeAnnivCol]: contactInfo.isBuyer
                      ? anniversaryDate || ""
                      : "",
                    [saClosedDateCol]: contactInfo.isBuyer
                      ? ""
                      : anniversaryDate || "",
                    ["Groups"]: "Past clients", // Groups column value
                    ["Tags"]: newEntryTags, // Tags column value
                    ["Changes Made"]: `New ${contactType} company contact added: ${companyName}; ${
                      contactInfo.isBuyer ? "Home anniversary" : "Closed"
                    } date: ${anniversaryDate}; Tags added: ${newEntryTags}; Added to Past clients group`,
                    ["Notes"]: `New ${contactType} company contact added: ${companyName}. Anniversary date: ${anniversaryDate}. Tags added: ${newEntryTags}`,
                  };
                  updatedSaRows.push(newRow);

                  changeLog.push({
                    type: "no_match_company_added",
                    contactType: contactType,
                    contactName: companyName,
                    anniversaryDate: anniversaryDate,
                    address: address,
                  });
                }

                return;
              }

              // Handle single names (without comma) that aren't companies
              if (nameInfo.singleName) {
                // Skip single names to prevent false matches
                changeLog.push({
                  type: "skipped_single_name",
                  contactName: nameInfo.singleName,
                  contactType: contactInfo.isBuyer ? "buyer" : "seller",
                  reason:
                    "Single name without last name - too ambiguous to match safely",
                  address: address,
                  anniversaryDate: anniversaryDate,
                });
                return;
              }

              // For comma-separated names or multiple word names without comma
              let firstName, lastName;

              if (contactName.includes(",")) {
                const parts = contactName.split(",").map((part) => part.trim());
                lastName = parts[0];
                firstName = parts[1];

                // Clean the names to remove middle initials/names
                lastName = cleanNameForOutput(lastName, false);
                firstName = cleanNameForOutput(firstName, true);

                // Skip entries where first name is empty or too short
                if (!firstName || firstName.trim().length < 2) {
                  changeLog.push({
                    type: "skipped_incomplete",
                    contactName: contactName,
                    contactType: contactInfo.isBuyer ? "buyer" : "seller",
                    reason:
                      "First name is too short or missing - may cause over-matching",
                    address: address,
                    anniversaryDate: anniversaryDate,
                  });
                  return;
                }
              } else {
                // For "First Last" format
                const parts = contactName.trim().split(/\s+/);
                if (parts.length >= 2) {
                  lastName = parts.pop();
                  // Clean the first name to get just the first word
                  firstName = cleanNameForOutput(parts.join(" "), true);
                  // Clean the last name in case it has initials at the beginning
                  lastName = cleanNameForOutput(lastName, false);
                } else {
                  // This shouldn't happen due to our earlier check, but just in case
                  changeLog.push({
                    type: "parse_error",
                    contactName: contactName,
                    contactType: contactInfo.isBuyer ? "buyer" : "seller",
                    reason: "Could not parse contact name format",
                    address: address,
                  });
                  return;
                }
              }

              // Look for matches in the Compass contacts
              let matchFound = false;
              updatedSaRows.forEach((saRow, saIndex) => {
                const saFirstName = (saRow[saFirstNameCol] || "").trim();
                const saLastName = (saRow[saLastNameCol] || "").trim();

                // Skip rows with missing first or last names in Compass contacts
                if (!saFirstName || !saLastName) {
                  return;
                }

                // Check if this contact matches using our enhanced matching function
                const matchResult = isNameMatch(
                  nameInfo,
                  saFirstName,
                  saLastName
                );
                if (matchResult.matched) {
                  matchFound = true;

                  // Only count this as a match if we haven't updated this contact before
                  const contactKey = `${saFirstName}-${saLastName}`;
                  if (!uniqueContactsUpdated.has(contactKey)) {
                    uniqueContactsUpdated.add(contactKey);
                    matchedCount++;
                  }

                  // Update the appropriate date field based on buyer vs seller
                  let oldValue = "";
                  if (contactInfo.isBuyer) {
                    // Buyers get Home Anniversary date
                    oldValue = saRow[saHomeAnnivCol] || "";
                    updatedSaRows[saIndex][saHomeAnnivCol] = anniversaryDate;
                    updatedSaRows[saIndex][saClosedDateCol] = ""; // Clear closed date
                  } else {
                    // Sellers get Closed Date
                    oldValue = saRow[saClosedDateCol] || "";
                    updatedSaRows[saIndex][saClosedDateCol] = anniversaryDate;
                    updatedSaRows[saIndex][saHomeAnnivCol] = ""; // Clear home anniversary
                  }

                  // Extract year from anniversary date for the sold date tag
                  const anniversaryYear = anniversaryDate
                    ? new Date(anniversaryDate).getFullYear()
                    : "";

                  // Create different tags based on whether this is a buyer or seller
                  const tagsToAdd = contactInfo.isBuyer
                    ? [
                        "CRM: Home Anniversary", // Changed from "CRM Refresh: Home Anniversary"
                        "Buyer",
                        anniversaryYear ? `${anniversaryYear}` : null,
                      ].filter(Boolean) // Remove null values
                    : [
                        "CRM: Closed Date", // Changed from "CRM REFRESH CLOSED DATE"
                        "Seller",
                        anniversaryYear ? `${anniversaryYear}` : null,
                      ].filter(Boolean); // Remove null values            // Update or add the Tags field with consistent formatting
                  const existingTags = updatedSaRows[saIndex]["Tags"] || "";
                  let existingTagsArray = existingTags
                    ? existingTags.split(",").map((t) => t.trim())
                    : [];

                  // Remove old format CRM Refresh tags to ensure consistency
                  existingTagsArray = existingTagsArray.filter(
                    (tag) =>
                      !tag.toLowerCase().includes("crm refresh") ||
                      !tag.toLowerCase().includes("home anniversary")
                  );

                  // Add new tags that don't already exist
                  const addedTags = [];
                  tagsToAdd.forEach((tag) => {
                    if (!existingTagsArray.includes(tag)) {
                      existingTagsArray.push(tag);
                      addedTags.push(tag);
                    }
                  });

                  updatedSaRows[saIndex]["Tags"] = existingTagsArray.join(", ");

                  // PROPER CHANGE TRACKING: Preserve existing changes and add new ones
                  const contactType = contactInfo.isBuyer ? "buyer" : "seller";
                  const newChanges = [];
                  newChanges.push(`Updated existing contact as ${contactType}`);
                  newChanges.push(
                    `Added ${
                      contactInfo.isBuyer ? "home anniversary" : "closed"
                    } date (${anniversaryDate})`
                  );
                  if (addedTags.length > 0) {
                    newChanges.push(`Tags added: ${addedTags.join(", ")}`);
                  } // Preserve existing "Changes Made" and append new changes
                  const existingChanges =
                    updatedSaRows[saIndex]["Changes Made"] || "";
                  updatedSaRows[saIndex]["Changes Made"] = existingChanges
                    ? `${existingChanges}; ${newChanges.join("; ")}`
                    : newChanges.join("; ");

                  // Optional: Also update Notes field for backward compatibility
                  const notes = `Updated existing contact as ${contactType}: Added ${
                    contactInfo.isBuyer ? "home anniversary" : "closed"
                  } date (${anniversaryDate}). Tags added: ${addedTags.join(
                    ", "
                  )}`;
                  updatedSaRows[saIndex]["Notes"] = notes;

                  // Create a unique log entry key
                  const logKey = `${firstName} ${lastName}-${address}`;

                  // Only log if we haven't already logged this combination
                  if (!uniqueLogEntries.has(logKey)) {
                    uniqueLogEntries.add(logKey);

                    // Log the change
                    changeLog.push({
                      type: "match",
                      contactType: contactType,
                      contactName: `${firstName} ${lastName}`,
                      rowIndex: saIndex,
                      oldValue: oldValue,
                      newValue: anniversaryDate,
                      address: address,
                      matchType: matchResult.matchType,
                      matchDetails: matchResult.details,
                    });
                  }
                }
              });

              // If no match was found, add a new row for unmatched buyers
              if (!matchFound) {
                newEntriesCount++;

                // Extract year from anniversary date for the sold date tag
                const anniversaryYear = anniversaryDate
                  ? new Date(anniversaryDate).getFullYear()
                  : "";

                // Create different tags based on whether this is a buyer or seller
                const contactType = contactInfo.isBuyer ? "buyer" : "seller";
                const newEntryTags = contactInfo.isBuyer
                  ? [
                      "CRM: Home Anniversary",
                      "Buyer",
                      anniversaryYear ? `${anniversaryYear}` : null,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : [
                      "CRM: Closed Date",
                      "Seller",
                      anniversaryYear ? `${anniversaryYear}` : null,
                    ]
                      .filter(Boolean)
                      .join(", ");

                // Clean first and last names - remove any middle initials/names
                const cleanedFirstName = cleanNameForOutput(firstName, true);
                const cleanedLastName = cleanNameForOutput(lastName, false);

                // Create base row data that will be shared by all persons
                const baseRowData = {
                  // Preserve address components from the original row if they exist
                  ["Home Address Line 1"]:
                    haRow["Home Address Line 1"] || address || "",
                  ["Home Address Line 2"]: haRow["Home Address Line 2"] || "",
                  ["Home Address City"]: haRow["Home Address City"] || "",
                  ["Home Address State"]: haRow["Home Address State"] || "",
                  ["Home Address Zip"]: haRow["Home Address Zip"] || "",
                  ["Groups"]: "Past clients", // Groups column value
                  ["Tags"]: newEntryTags, // Tags column value
                  ["Notes"]: `New ${contactType} contact added. ${
                    contactInfo.isBuyer ? "Home anniversary" : "Closed"
                  } date: ${anniversaryDate}. Tags added: ${newEntryTags}`,
                };

                // Use enhanced name processing to create separate rows for each person
                const separateRows = processNameIntoSeparateRows(
                  `${firstName} ${lastName}`, // Reconstruct the original name
                  baseRowData,
                  anniversaryDate,
                  contactType,
                  contactInfo.isBuyer,
                  saFirstNameCol,
                  saLastNameCol,
                  saHomeAnnivCol,
                  saClosedDateCol
                );

                // Add all the separate rows
                separateRows.forEach((row) => {
                  updatedSaRows.push(row);
                });

                changeLog.push({
                  type: "no_match_added",
                  contactType: contactType,
                  contactName: `${firstName} ${lastName}`,
                  anniversaryDate: anniversaryDate,
                  address: address,
                });
              }
            });
          });
        }
      );

      // Track which entries from the home anniversaries file were processed
      const processedEntries = new Set();
      changeLog.forEach((log) => {
        if (log.address && log.anniversaryDate) {
          processedEntries.add(`${log.address}-${log.anniversaryDate}`);
        }
      });

      // Make sure all entries from the home anniversaries file are included
      // If any were missed during the matching process, add them as new entries
      setStep3Data((prev) => ({
        ...prev,
        currentOperation: "Processing fallback entries...",
        progress: 90,
      }));

      await processInChunks(
        haRows,
        CHUNK_SIZE,
        async (chunk, chunkIndex, totalChunks) => {
          setStep3Data((prev) => ({
            ...prev,
            currentOperation: `Processing fallback entries (chunk ${
              chunkIndex + 1
            }/${totalChunks})...`,
          }));

          chunk.forEach((haRow) => {
            const buyerNameRaw = haRow[haBuyerNameCol];
            const sellerNameRaw = haSellerNameCol
              ? haRow[haSellerNameCol]
              : null;
            const anniversaryDate = haRow[haAnnivCol] || "";
            const address = haRow[haAddressCol] || "";
            const sellingAgent = haRow[haSellingAgentCol] || "";
            const listingAgent = haListingAgentCol
              ? haRow[haListingAgentCol] || ""
              : "";

            // Skip if no anniversary date or address
            if (!anniversaryDate || !address) return;

            // Check if this entry was already processed
            const entryKey = `${address}-${anniversaryDate}`;
            if (processedEntries.has(entryKey)) return;

            // If we get here, this entry wasn't processed yet
            // Get the main agent name we saved in step 2
            const mainAgentName = step2Data.mainSellingAgent.toLowerCase();

            // Determine if our agent is the selling agent (buyer's agent) or listing agent (seller's agent)
            // Clean and normalize agent names for comparison
            const cleanMainAgentName = mainAgentName.trim().toLowerCase();
            const cleanSellingAgent = sellingAgent.trim().toLowerCase();
            const cleanListingAgent = listingAgent.trim().toLowerCase();

            // Debug logging for the 70 Dalfonso case (fallback processing)
            if (
              address.includes("70 Dalfonso") ||
              address.includes("16 Shari Dr")
            ) {
              console.log("Debug (Fallback):", {
                address: address,
                cleanMainAgentName,
                cleanSellingAgent,
                buyerNameRaw,
                sellerNameRaw,
                includes: cleanSellingAgent.includes(cleanMainAgentName),
              });
            }

            // Enhanced agent matching that handles middle initials (same as main processing)
            // This means our agent is the selling agent (buyer's agent)
            const matchesAgentFallback = (agentInFile, targetAgent) => {
              if (!agentInFile || !targetAgent) return false;

              const cleanFile = agentInFile.toLowerCase().trim();
              const cleanTarget = targetAgent.toLowerCase().trim();

              // Simple case: exact match or contains
              if (cleanFile.includes(cleanTarget)) return true;

              // Parse both names into parts
              const fileParts = cleanFile
                .split(/\s+/)
                .filter((part) => part.length > 0);
              const targetParts = cleanTarget
                .split(/\s+/)
                .filter((part) => part.length > 0);

              if (targetParts.length < 2 || fileParts.length < 2) return false;

              // Extract first and last names from target (user input)
              const targetFirst = targetParts[0];
              const targetLast = targetParts[targetParts.length - 1];

              // Check if file contains the first and last name (ignoring middle parts)
              const fileFirst = fileParts[0];
              const fileLast = fileParts[fileParts.length - 1];

              return targetFirst === fileFirst && targetLast === fileLast;
            };

            const isOurAgentSellingAgent =
              cleanSellingAgent !== "" &&
              matchesAgentFallback(cleanSellingAgent, cleanMainAgentName);

            const isOurAgentListingAgent =
              cleanListingAgent !== "" &&
              matchesAgentFallback(cleanListingAgent, cleanMainAgentName);

            // Choose which name to process based on agent role
            let nameToProcess = null;
            let isBuyer = false;

            if (isOurAgentSellingAgent) {
              // Our agent represents the buyer - ONLY process buyer, NEVER process seller
              nameToProcess =
                buyerNameRaw && buyerNameRaw.trim()
                  ? buyerNameRaw.trim()
                  : null;
              isBuyer = true;
              console.log(
                "Fallback: Selling agent case - processing buyer:",
                nameToProcess,
                "SKIPPING seller:",
                sellerNameRaw
              );
            } else if (isOurAgentListingAgent) {
              // Our agent represents the seller - ONLY process seller, NEVER process buyer
              nameToProcess =
                sellerNameRaw && sellerNameRaw.trim()
                  ? sellerNameRaw.trim()
                  : null;
              isBuyer = false;
              console.log(
                "Fallback: Listing agent case - processing seller:",
                nameToProcess,
                "SKIPPING buyer:",
                buyerNameRaw
              );
            } else {
              // Our agent is neither selling nor listing agent - SKIP this transaction entirely
              console.log(
                "Fallback: SKIPPING transaction - our agent not involved:",
                "Selling Agent:",
                sellingAgent,
                "Listing Agent:",
                listingAgent,
                "Address:",
                address,
                "SKIPPING buyer:",
                buyerNameRaw,
                "SKIPPING seller:",
                sellerNameRaw
              );
              return; // Skip this entire transaction
            }

            if (!nameToProcess) return; // Skip if no appropriate name

            // Create a new entry for this unprocessed record
            const contactType = isBuyer ? "buyer" : "seller";

            // Try to parse the name
            let firstName, lastName;
            if (nameToProcess.includes(",")) {
              const parts = nameToProcess.split(",").map((part) => part.trim());
              lastName = parts[0];
              firstName = parts[1] || "";
            } else {
              const parts = nameToProcess.split(/\s+/);
              if (parts.length >= 2) {
                lastName = parts.pop();
                firstName = parts.join(" ");
              } else {
                // Single name, just use it as first name
                firstName = nameToProcess;
                lastName = "";
              }
            }

            // Extract year from anniversary date for the sold date tag
            const anniversaryYear = anniversaryDate
              ? new Date(anniversaryDate).getFullYear()
              : "";

            // Create different tags based on whether this is a buyer or seller
            const newEntryTags = isBuyer
              ? [
                  "CRM: Home Anniversary",
                  "Buyer",
                  anniversaryYear ? `${anniversaryYear}` : null,
                ]
                  .filter(Boolean)
                  .join(", ")
              : [
                  "CRM: Closed Date",
                  "Seller",
                  anniversaryYear ? `${anniversaryYear}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");

            // Clean first and last names - remove any middle initials/names
            const cleanedFirstName = cleanNameForOutput(firstName, true);
            const cleanedLastName = cleanNameForOutput(lastName, false);

            // Create the new row - preserve address components if they exist in the original data
            const newRow = {
              [saFirstNameCol]: cleanedFirstName || "",
              [saLastNameCol]: cleanedLastName || "",
              // Preserve address components from the original row if they exist
              ["Home Address Line 1"]:
                haRow["Home Address Line 1"] || address || "",
              ["Home Address Line 2"]: haRow["Home Address Line 2"] || "",
              ["Home Address City"]: haRow["Home Address City"] || "",
              ["Home Address State"]: haRow["Home Address State"] || "",
              ["Home Address Zip"]: haRow["Home Address Zip"] || "",
              // Set the appropriate date column based on buyer vs seller
              [saHomeAnnivCol]: isBuyer ? anniversaryDate || "" : "",
              [saClosedDateCol]: isBuyer ? "" : anniversaryDate || "",
              ["Groups"]: "Past clients",
              ["Tags"]: newEntryTags,
              ["Changes Made"]: `New ${contactType} contact added (fallback processing): ${firstName} ${lastName}; Names cleaned to ${cleanedFirstName} ${cleanedLastName}; ${
                isBuyer ? "Home anniversary" : "Closed"
              } date: ${anniversaryDate}; Tags added: ${newEntryTags}; Added to Past clients group`,
              ["Notes"]: `New ${contactType} contact added (fallback processing): ${firstName} ${lastName} (cleaned to ${cleanedFirstName} ${cleanedLastName}). Anniversary date: ${anniversaryDate}. Tags added: ${newEntryTags}`,
            };

            updatedSaRows.push(newRow);
            newEntriesCount++;

            // Add to change log
            changeLog.push({
              type: "fallback_entry_added",
              contactType: contactType,
              contactName: `${firstName} ${lastName}`,
              anniversaryDate: anniversaryDate,
              address: address,
            });

            // Mark as processed
            processedEntries.add(entryKey);
          });
        }
      );

      // Create the output CSV with updated headers and rows
      const processedData = {
        headers: saHeaders,
        rows: updatedSaRows,
      };

      // Generate detailed stats for the user
      console.log(`Total change log entries: ${changeLog.length}`);

      // Create a log distribution summary to help troubleshoot
      const logTypeCounts = {};
      changeLog.forEach((log) => {
        logTypeCounts[log.type] = (logTypeCounts[log.type] || 0) + 1;
      });
      console.log("Change log entry types:", logTypeCounts);

      // Enhanced summary reporting
      console.log("📊 PROCESSING SUMMARY:");
      console.log(`🔵 Total Buyers Processed: ${totalBuyersProcessed}`);
      console.log(`🟢 Total Sellers Processed: ${totalSellersProcessed}`);
      console.log(`✅ Contacts Matched & Updated: ${matchedCount}`);
      console.log(`➕ New Contacts Added: ${newEntriesCount}`);

      // Count listings where Beth is listing agent but seller name is empty
      let emptySellerCount = 0;
      let listingAgentCount = 0;
      haRows.forEach((row) => {
        const listingAgent = haListingAgentCol
          ? row[haListingAgentCol] || ""
          : "";
        const sellerName = haSellerNameCol ? row[haSellerNameCol] || "" : "";
        const cleanListingAgent = listingAgent.trim().toLowerCase();
        const mainAgentName = step2Data.mainSellingAgent.toLowerCase();

        if (
          cleanListingAgent !== "" &&
          cleanListingAgent.includes(mainAgentName)
        ) {
          listingAgentCount++;
          if (!sellerName || !sellerName.trim()) {
            emptySellerCount++;
          }
        }
      });

      console.log(`📋 LISTING AGENT ANALYSIS:`);
      console.log(
        `🏠 Total transactions where you're listing agent: ${listingAgentCount}`
      );
      console.log(
        `❌ Transactions with empty seller names: ${emptySellerCount}`
      );
      if (emptySellerCount > 0) {
        console.log(
          `⚠️  ${emptySellerCount} seller transactions were skipped due to missing seller names in your CSV data.`
        );

        // Show user-friendly notification about missing seller data
        const message =
          `Processing completed!\n\n` +
          `✅ Buyers processed: ${totalBuyersProcessed}\n` +
          `✅ Sellers processed: ${totalSellersProcessed}\n` +
          `✅ Contacts updated: ${matchedCount}\n` +
          `✅ New contacts added: ${newEntriesCount}\n\n` +
          `⚠️ Note: ${emptySellerCount} transactions where you're the listing agent were skipped because the "Seller Name" field is empty in your CSV data.\n\n` +
          `To process sellers, make sure your CSV has seller names filled in for listings where you're the listing agent.`;

        setTimeout(() => alert(message), 1000);
      }

      setStep3Data({
        processedData: processedData,
        downloadReady: true,
        matchedCount: matchedCount,
        newEntriesCount: newEntriesCount,
        totalBuyersProcessed: totalBuyersProcessed,
        totalSellersProcessed: totalSellersProcessed,
        changeLog: changeLog,
        isProcessing: false,
        progress: 100,
        currentOperation: "Processing complete!",
      });
    } catch (error) {
      console.error("Error processing data:", error);
      alert(
        "An error occurred while processing the data. Please try again with a smaller file or check the console for details."
      );

      setStep3Data((prev) => ({
        ...prev,
        isProcessing: false,
        progress: 0,
        currentOperation: "Processing failed",
      }));
    }
  };

  // Helper function for proper title case conversion
  const toTitleCase = (str) => {
    if (!str) return str;
    return str
      .toLowerCase()
      .split(/\s+/)
      .map((word) => {
        if (word.length === 0) return word;

        // Handle special cases like "McDonald", "O'Connor"
        if (word.includes("'")) {
          return word
            .split("'")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("'");
        }
        if (word.toLowerCase().startsWith("mc") && word.length > 2) {
          return "Mc" + word.charAt(2).toUpperCase() + word.slice(3);
        }
        if (word.toLowerCase().startsWith("mac") && word.length > 3) {
          return "Mac" + word.charAt(3).toUpperCase() + word.slice(4);
        }

        // Standard title case
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };

  const downloadProcessedCSV = () => {
    if (!step3Data.processedData) return;

    const csvContent = Papa.unparse({
      fields: step3Data.processedData.headers,
      data: step3Data.processedData.rows,
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `processed_compass_contacts_with_anniversaries.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateClosedTransactionLog = () => {
    console.log("🚀 generateClosedTransactionLog called!");
    console.log("step3Data:", step3Data);
    console.log("step2Data:", step2Data);

    if (!step3Data.processedData || !step2Data.homeAnniversaryCsv) {
      alert(
        "Please complete processing first to generate the transaction log."
      );
      return;
    }

    const transactionLogEntries = [];
    const processedContacts = step3Data.processedData.rows;
    const homeAnniversaryData = step2Data.homeAnniversaryCsv.rows;
    const haHeaders = step2Data.homeAnniversaryCsv.headers;

    // Find column mappings in home anniversary data
    const haBuyerNameCol = haHeaders.find(
      (h) =>
        h &&
        h.toLowerCase().includes("buyer") &&
        h.toLowerCase().includes("name")
    );
    const haSellerNameCol = haHeaders.find(
      (h) =>
        h &&
        h.toLowerCase().includes("seller") &&
        h.toLowerCase().includes("name")
    );
    const haAddressCol = haHeaders.find((h) =>
      h.toLowerCase().includes("address")
    );
    const haAnnivCol = haHeaders.find(
      (h) =>
        h.toLowerCase().includes("anniversary") ||
        h.toLowerCase().includes("date")
    );
    const haSalePriceCol = haHeaders.find(
      (h) =>
        h.toLowerCase().includes("sold") && h.toLowerCase().includes("price")
    );
    const haSellingAgentCol = haHeaders.find(
      (h) =>
        h &&
        h.toLowerCase().includes("selling") &&
        h.toLowerCase().includes("agent")
    );
    const haListingAgentCol = haHeaders.find(
      (h) =>
        h &&
        h.toLowerCase().includes("listing") &&
        h.toLowerCase().includes("agent")
    );

    // Helper function for agent matching (same as main processing)
    const matchesAgent = (agentInFile, targetAgent) => {
      if (!agentInFile || !targetAgent) return false;
      const cleanFile = agentInFile.toLowerCase().trim();
      const cleanTarget = targetAgent.toLowerCase().trim();

      if (cleanFile.includes(cleanTarget)) return true;

      const fileParts = cleanFile
        .split(/\s+/)
        .filter((part) => part.length > 0);
      const targetParts = cleanTarget
        .split(/\s+/)
        .filter((part) => part.length > 0);

      if (targetParts.length < 2 || fileParts.length < 2) return false;

      const targetFirst = targetParts[0];
      const targetLast = targetParts[targetParts.length - 1];
      const fileFirst = fileParts[0];
      const fileLast = fileParts[fileParts.length - 1];

      return targetFirst === fileFirst && targetLast === fileLast;
    };

    // Process each home anniversary entry
    homeAnniversaryData.forEach((haRow) => {
      const buyerNameRaw = haRow[haBuyerNameCol] || "";
      const sellerNameRaw = haSellerNameCol ? haRow[haSellerNameCol] || "" : "";
      const address = haRow[haAddressCol] || "";
      const anniversaryDate = haRow[haAnnivCol] || "";
      const salePrice = haRow[haSalePriceCol] || "";
      const sellingAgent = haRow[haSellingAgentCol] || "";
      const listingAgent = haListingAgentCol
        ? haRow[haListingAgentCol] || ""
        : "";

      if (!anniversaryDate || !address) return; // Skip incomplete entries

      // Determine agent role (same logic as processing)
      const mainAgentName = step2Data.mainSellingAgent.toLowerCase();
      const cleanSellingAgent = sellingAgent.trim().toLowerCase();
      const cleanListingAgent = listingAgent.trim().toLowerCase();

      const isOurAgentSellingAgent =
        cleanSellingAgent !== "" &&
        matchesAgent(cleanSellingAgent, mainAgentName);
      const isOurAgentListingAgent =
        cleanListingAgent !== "" &&
        matchesAgent(cleanListingAgent, mainAgentName);

      // Parse address using existing parseAddress function
      const parsedAddress = parseAddress(address);
      const propertyAddress = parsedAddress.line1;
      const propertyUnit = parsedAddress.line2;
      const propertyCity = parsedAddress.city;

      // Process based on agent role
      if (isOurAgentSellingAgent && buyerNameRaw) {
        // Process buyers (when we're selling agent)
        const buyerNames = buyerNameRaw
          .split(/\s*[&|]\s*/)
          .map((name) => name.trim())
          .filter(Boolean);

        buyerNames.forEach((buyerName) => {
          if (!buyerName) return;

          // Try to find matching contact info from processed data (simple name lookup)
          let matchedContact = null;

          // Parse the buyer name to get first and last parts
          let searchFirst = "";
          let searchLast = "";

          if (buyerName.includes(",")) {
            // Handle "Last, First" format
            const [last, first] = buyerName.split(",").map((s) => s.trim());
            searchFirst = first.toLowerCase().trim();
            searchLast = last.toLowerCase().trim();
          } else {
            // Handle "First Last" format
            const nameParts = buyerName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              searchFirst = nameParts[0].toLowerCase().trim();
              searchLast = nameParts[nameParts.length - 1].toLowerCase().trim();
            }
          }

          // Simple lookup by first and last name in processed contacts
          if (searchFirst && searchLast) {
            // Debug: show what we're searching for
            console.log(
              `🔍 Looking for buyer: "${searchFirst}" "${searchLast}"`
            );

            processedContacts.forEach((contact) => {
              const firstName = (contact["First Name"] || "")
                .toLowerCase()
                .trim();
              const lastName = (contact["Last Name"] || "")
                .toLowerCase()
                .trim();

              if (firstName === searchFirst && lastName === searchLast) {
                // Prioritize contacts with phone/email data
                if (
                  !matchedContact ||
                  (!matchedContact["Primary Mobile Phone"] &&
                    contact["Primary Mobile Phone"]) ||
                  (!matchedContact["Primary Work Email"] &&
                    contact["Primary Work Email"])
                ) {
                  matchedContact = contact;
                }
                console.log(
                  `✅ Found match: "${firstName}" "${lastName}" - Phone: ${
                    contact["Primary Mobile Phone"] || "none"
                  } - Email: ${contact["Primary Work Email"] || "none"}`
                );
              }
            });

            if (!matchedContact) {
              console.log(
                `❌ No match found for: "${searchFirst}" "${searchLast}"`
              );
            }
          }

          // Clean up buyer name for display (handle Last, First format)
          let clientName = buyerName;
          if (buyerName.includes(",")) {
            const [last, first] = buyerName.split(",").map((s) => s.trim());
            clientName = `${toTitleCase(first)} ${toTitleCase(last)}`.trim();
          } else {
            // Apply title case to "First Last" format
            const nameParts = buyerName.trim().split(/\s+/);
            clientName = nameParts.map((part) => toTitleCase(part)).join(" ");
          }

          // Extract phone and email from any available column
          let phone = "";
          let email = "";

          if (matchedContact) {
            // Look for phone in any phone column
            const phoneColumns = Object.keys(matchedContact).filter(
              (key) =>
                key.toLowerCase().includes("phone") && matchedContact[key]
            );
            phone =
              phoneColumns.length > 0 ? matchedContact[phoneColumns[0]] : "";

            // Look for email in any email column
            const emailColumns = Object.keys(matchedContact).filter(
              (key) =>
                key.toLowerCase().includes("email") && matchedContact[key]
            );
            email =
              emailColumns.length > 0 ? matchedContact[emailColumns[0]] : "";
          }

          const entry = {
            "Closing Date": anniversaryDate,
            "Property Address": propertyAddress,
            "Property Unit": propertyUnit,
            "Property City": propertyCity,
            "Buyer / Seller": "Buyer",
            "Client Name": clientName,
            "Sale Price": salePrice.replace(/['"]/g, "").trim(), // Keep dollar sign, remove quotes
            Phone: phone,
            Email: email,
          };

          transactionLogEntries.push(entry);
        });
      } else if (isOurAgentListingAgent && sellerNameRaw) {
        // Process sellers (when we're listing agent)
        const sellerNames = sellerNameRaw
          .split(/\s*[&|]\s*/)
          .map((name) => name.trim())
          .filter(Boolean);

        sellerNames.forEach((sellerName) => {
          if (!sellerName) return;

          // Try to find matching contact info from processed data (simple name lookup)
          let matchedContact = null;

          // Parse the seller name to get first and last parts
          let searchFirst = "";
          let searchLast = "";

          if (sellerName.includes(",")) {
            // Handle "Last, First" format
            const [last, first] = sellerName.split(",").map((s) => s.trim());
            searchFirst = first.toLowerCase().trim();
            searchLast = last.toLowerCase().trim();
          } else {
            // Handle "First Last" format
            const nameParts = sellerName.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              searchFirst = nameParts[0].toLowerCase().trim();
              searchLast = nameParts[nameParts.length - 1].toLowerCase().trim();
            }
          }

          // Simple lookup by first and last name in processed contacts
          if (searchFirst && searchLast) {
            // Debug: show what we're searching for
            console.log(
              `🔍 Looking for seller: "${searchFirst}" "${searchLast}"`
            );

            processedContacts.forEach((contact) => {
              const firstName = (contact["First Name"] || "")
                .toLowerCase()
                .trim();
              const lastName = (contact["Last Name"] || "")
                .toLowerCase()
                .trim();

              if (firstName === searchFirst && lastName === searchLast) {
                // Prioritize contacts with phone/email data
                if (
                  !matchedContact ||
                  (!matchedContact["Primary Mobile Phone"] &&
                    contact["Primary Mobile Phone"]) ||
                  (!matchedContact["Primary Work Email"] &&
                    contact["Primary Work Email"])
                ) {
                  matchedContact = contact;
                }
                console.log(
                  `✅ Found match: "${firstName}" "${lastName}" - Phone: ${
                    contact["Primary Mobile Phone"] || "none"
                  } - Email: ${contact["Primary Work Email"] || "none"}`
                );
              }
            });

            if (!matchedContact) {
              console.log(
                `❌ No match found for: "${searchFirst}" "${searchLast}"`
              );
            }
          }

          // Clean up seller name for display (handle Last, First format)
          let clientName = sellerName;
          if (sellerName.includes(",")) {
            const [last, first] = sellerName.split(",").map((s) => s.trim());
            clientName = `${toTitleCase(first)} ${toTitleCase(last)}`.trim();
          } else {
            // Apply title case to "First Last" format
            const nameParts = sellerName.trim().split(/\s+/);
            clientName = nameParts.map((part) => toTitleCase(part)).join(" ");
          }

          // Extract phone and email from any available column
          let phone = "";
          let email = "";

          if (matchedContact) {
            // Look for phone in any phone column
            const phoneColumns = Object.keys(matchedContact).filter(
              (key) =>
                key.toLowerCase().includes("phone") && matchedContact[key]
            );
            phone =
              phoneColumns.length > 0 ? matchedContact[phoneColumns[0]] : "";

            // Look for email in any email column
            const emailColumns = Object.keys(matchedContact).filter(
              (key) =>
                key.toLowerCase().includes("email") && matchedContact[key]
            );
            email =
              emailColumns.length > 0 ? matchedContact[emailColumns[0]] : "";
          }

          const entry = {
            "Closing Date": anniversaryDate,
            "Property Address": propertyAddress,
            "Property Unit": propertyUnit,
            "Property City": propertyCity,
            "Buyer / Seller": "Seller",
            "Client Name": clientName,
            "Sale Price": salePrice.replace(/['"]/g, "").trim(), // Keep dollar sign, remove quotes
            Phone: phone,
            Email: email,
          };

          transactionLogEntries.push(entry);
        });
      }
    });

    if (transactionLogEntries.length === 0) {
      alert(
        "No transaction log entries found. Make sure you have processed data with matching agent roles."
      );
      return;
    }

    // Generate CSV
    const headers = [
      "Closing Date",
      "Property Address",
      "Property Unit",
      "Property City",
      "Buyer / Seller",
      "Client Name",
      "Sale Price",
      "Phone",
      "Email",
    ];
    const csvContent = Papa.unparse({
      fields: headers,
      data: transactionLogEntries,
    });

    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `closed_transaction_log_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert(`Generated ${transactionLogEntries.length} transaction log entries!`);
  };

  return (
    <div className="csv-formatter">
      <header className="page-header">
        <h1>📊 CSV Formatter</h1>
        <p>Process and merge your CSV data in 3 easy steps</p>

        {/* Step indicator */}
        <div className="step-indicator">
          <div
            className={`step ${
              currentStep === 1 ? "active" : currentStep > 1 ? "completed" : ""
            }`}
          >
            <span>1</span>
            <label>Format & Filter</label>
          </div>
          <div
            className={`step ${
              currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""
            }`}
          >
            <span>2</span>
            <label>Upload Files</label>
          </div>
          <div className={`step ${currentStep === 3 ? "active" : ""}`}>
            <span>3</span>
            <label>Process & Download</label>
          </div>
        </div>
      </header>

      <main className="csv-formatter-main">
        <div className="formatter-content">
          {/* Step 1: Filter by Selling Agent */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="step-header">
                <h2>
                  Step 1: Format Names & Optionally Filter by Selling Agent
                </h2>
                <p>
                  Upload your CSV file with home anniversaries, format all names
                  correctly, and optionally filter by selling agent.
                </p>
              </div>

              <div className="upload-section">
                <div className="file-upload">
                  <label htmlFor="step1-csv" className="upload-label">
                    📁 Upload Home Anniversaries CSV
                  </label>
                  <input
                    type="file"
                    id="step1-csv"
                    accept=".csv"
                    onChange={handleStep1CsvUpload}
                    className="file-input"
                  />
                  {step1Data.csvFile && (
                    <div className="file-info">
                      ✅ File: {step1Data.csvFile.name}
                    </div>
                  )}
                </div>

                <div className="agent-input">
                  <label htmlFor="selling-agent">
                    Selling Agent Name (optional):
                  </label>
                  <input
                    type="text"
                    id="selling-agent"
                    value={step1Data.sellingAgent}
                    onChange={handleSellingAgentChange}
                    placeholder="Enter selling agent name (or leave blank for all entries)"
                    className="text-input"
                  />
                </div>

                <button
                  onClick={filterBySellingAgent}
                  className="filter-button"
                  disabled={!step1Data.csvFile}
                >
                  Process CSV Data
                </button>

                {step1Data.filteredData && (
                  <div className="filter-results">
                    {step1Data.sellingAgent.trim() ? (
                      <p>
                        ✅ Found {step1Data.filteredData.rows.length} entries
                        for "{step1Data.sellingAgent}" (from{" "}
                        {step1Data.allFormattedData.rows.length} total)
                      </p>
                    ) : (
                      <p>
                        ✅ Processed all{" "}
                        {step1Data.allFormattedData.rows.length} entries
                      </p>
                    )}

                    <div className="download-options">
                      {step1Data.sellingAgent.trim() && (
                        <button
                          onClick={downloadFilteredCSV}
                          className="download-button"
                        >
                          📥 Download Filtered CSV
                        </button>
                      )}

                      <button
                        onClick={downloadAllFormattedCSV}
                        className="download-button"
                      >
                        📥 Download All Formatted CSV
                      </button>
                    </div>
                  </div>
                )}

                {step1Data.downloadReady && (
                  <div className="next-step">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="next-button"
                    >
                      Next Step →
                    </button>
                  </div>
                )}
              </div>

              <style jsx>{`
                .download-options {
                  display: flex;
                  gap: 10px;
                  margin-top: 10px;
                }

                .agent-info {
                  background-color: #f8f9fa;
                  border: 1px solid #e9ecef;
                  border-radius: 5px;
                  padding: 10px 15px;
                  margin: 15px 0;
                }

                .agent-input-processing {
                  background-color: #f0f8ff;
                  border: 1px solid #d1e7ff;
                  border-radius: 5px;
                  padding: 15px;
                  margin: 20px 0;
                }

                .agent-input-processing label {
                  display: block;
                  font-weight: bold;
                  margin-bottom: 8px;
                }

                .agent-input-processing input {
                  width: 100%;
                  padding: 8px 10px;
                  border: 1px solid #ced4da;
                  border-radius: 4px;
                  font-size: 16px;
                  margin-bottom: 8px;
                }

                .agent-info-text {
                  font-size: 14px;
                  color: #555;
                  margin-top: 5px;
                }

                .log-display-options {
                  display: flex;
                  align-items: center;
                  margin-bottom: 15px;
                }

                .toggle-logs-button {
                  background-color: #f0f0f0;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  padding: 5px 10px;
                  font-size: 12px;
                  cursor: pointer;
                }

                .toggle-logs-button:hover {
                  background-color: #e0e0e0;
                }

                .small-note {
                  font-size: 12px;
                  color: #666;
                  margin-left: 10px;
                }
              `}</style>
            </div>
          )}

          {/* Step 2: Upload Both CSVs */}
          {currentStep === 2 && (
            <div className="step-content">
              <div className="step-header">
                <h2>Step 2: Upload CSV Files for Processing</h2>
                <p>
                  Upload both the formatted home anniversary CSV (either
                  filtered or all entries) and the stream app CSV for data
                  merging.
                </p>
              </div>

              <div className="dual-upload-section">
                <div className="upload-card">
                  <h3>Formatted Home Anniversary CSV</h3>
                  <div className="file-upload">
                    <label
                      htmlFor="home-anniversary-csv"
                      className="upload-label"
                    >
                      📁 Upload Formatted CSV
                    </label>
                    <input
                      type="file"
                      id="home-anniversary-csv"
                      accept=".csv"
                      onChange={handleHomeAnniversaryUpload}
                      className="file-input"
                    />
                    {step2Data.homeAnniversaryCsv && (
                      <div className="file-info">
                        ✅ {step2Data.homeAnniversaryCsv.rows.length} rows
                        loaded
                      </div>
                    )}
                  </div>
                </div>

                <div className="upload-card">
                  <h3>Stream App CSV</h3>
                  <div className="file-upload">
                    <label htmlFor="stream-app-csv" className="upload-label">
                      📁 Upload Stream App CSV
                    </label>
                    <input
                      type="file"
                      id="stream-app-csv"
                      accept=".csv"
                      onChange={handleStreamAppUpload}
                      className="file-input"
                    />
                    {step2Data.streamAppCsv && (
                      <div className="file-info">
                        ✅ {step2Data.streamAppCsv.rows.length} rows loaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="step-actions">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="back-button"
                >
                  ← Back
                </button>

                {step2Data.homeAnniversaryCsv && step2Data.streamAppCsv && (
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="next-button"
                  >
                    Process Data →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Process and Download */}
          {currentStep === 3 && (
            <div className="step-content">
              <div className="step-header">
                <h2>Step 3: Process and Merge Data</h2>
                <p>
                  The system will find matching buyer names and add their home
                  anniversary dates to the Compass contacts.
                </p>
              </div>

              <div className="process-section">
                {!step3Data.processedData ? (
                  <div className="process-info">
                    <p>Ready to process your data. This will:</p>
                    <ul>
                      <li>
                        Extract contact names from home anniversary CSV (format:
                        "Last Name, First Name" or company names)
                      </li>
                      <li>
                        Handle multiple buyers/sellers separated by "&" symbols
                      </li>
                      <li>
                        Search for matching names in the Compass contacts
                        database
                      </li>
                      <li>
                        Tag contacts as "Buyer" with "CRM Refresh: Home
                        Anniversary" if the selling agent matches the main agent
                      </li>
                      <li>
                        Tag contacts as "SELLER-CRMREFRESH" with "CRM REFRESH
                        CLOSED DATE" if selling agent is different or missing
                      </li>
                      <li>
                        Update matched contacts with home anniversary dates
                      </li>
                      <li>Generate a detailed report of changes</li>
                    </ul>

                    <div className="agent-input-processing">
                      <label htmlFor="main-selling-agent">
                        Main Selling Agent for Buyer/Seller Determination:
                      </label>
                      <input
                        type="text"
                        id="main-selling-agent"
                        value={step2Data.mainSellingAgent}
                        onChange={(e) =>
                          setStep2Data((prev) => ({
                            ...prev,
                            mainSellingAgent: e.target.value,
                          }))
                        }
                        placeholder="Enter the main selling agent name (entries with this agent will be tagged as Buyers)"
                        className="text-input"
                      />
                      <p className="agent-info-text">
                        <em>
                          Contacts with this agent will be tagged as Buyers, all
                          others as Sellers
                        </em>
                      </p>
                    </div>

                    {step3Data.isProcessing && (
                      <div className="processing-indicator">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${step3Data.progress}%` }}
                          ></div>
                        </div>
                        <p className="progress-text">
                          {step3Data.currentOperation} ({step3Data.progress}%)
                        </p>
                        <p className="progress-warning">
                          ⚠️ Processing large file - please wait and do not
                          close the browser...
                        </p>
                      </div>
                    )}

                    <button
                      onClick={processAndMergeData}
                      className="process-button"
                      disabled={
                        !step2Data.mainSellingAgent.trim() ||
                        step3Data.isProcessing
                      }
                    >
                      {step3Data.isProcessing
                        ? "🔄 Processing..."
                        : "🔄 Process Data"}
                    </button>
                  </div>
                ) : (
                  <div className="process-results">
                    <p>✅ Processing complete!</p>

                    <div className="agent-info">
                      <p>
                        <strong>Main Selling Agent:</strong>{" "}
                        {step2Data.mainSellingAgent}
                      </p>
                      <p>
                        <em>
                          Contacts with this agent were tagged as Buyers, all
                          others as Sellers
                        </em>
                      </p>
                    </div>
                    <div className="process-stats">
                      <p>
                        📊 Processed {step3Data.totalBuyersProcessed} names as
                        buyers (with main agent) and{" "}
                        {step3Data.totalSellersProcessed} names as sellers
                        (other agents)
                      </p>
                      <p>
                        ✓ {step3Data.matchedCount} unique contacts updated with
                        home anniversary dates
                      </p>
                      <p>
                        ➕ {step3Data.newEntriesCount} names did not match
                        existing contacts
                      </p>
                      {step3Data.matchedCount >
                        (step3Data.totalBuyersProcessed +
                          step3Data.totalSellersProcessed) *
                          0.8 && (
                        <p className="warning">
                          ⚠️ Warning: The number of matches (
                          {step3Data.matchedCount}) is unusually high compared
                          to the total names processed (
                          {step3Data.totalBuyersProcessed +
                            step3Data.totalSellersProcessed}
                          ). This may indicate over-matching with flexible name
                          matching.
                        </p>
                      )}
                      {step3Data.changeLog && (
                        <p>
                          📝 {step3Data.changeLog.length} total log entries
                          captured (some may be filtered in display below)
                        </p>
                      )}
                      {step3Data.matchedCount >
                        (step3Data.totalBuyersProcessed +
                          step3Data.totalSellersProcessed) *
                          0.8 && (
                        <p className="warning">
                          ⚠️ The number of contacts updated (
                          {step3Data.matchedCount}) is much higher than expected
                          for {step3Data.totalBuyersProcessed} buyers processed.
                          This may indicate over-matching with company names or
                          duplicates.
                        </p>
                      )}
                    </div>

                    {step3Data.changeLog && step3Data.changeLog.length > 0 && (
                      <div className="change-log">
                        <h3>Change Details:</h3>
                        <div className="log-display-options">
                          <button
                            onClick={() => setShowAllLogs((prev) => !prev)}
                            className="toggle-logs-button"
                          >
                            {showAllLogs
                              ? "Show Filtered Logs"
                              : "Show All Logs"}
                          </button>
                          {showAllLogs && (
                            <p className="small-note">
                              Showing all {step3Data.changeLog.length} log
                              entries
                            </p>
                          )}
                        </div>

                        <div className="change-log-container">
                          {showAllLogs ? (
                            // Show all logs without filtering when showAllLogs is true
                            step3Data.changeLog.map((log, idx) => {
                              // Determine what type of entry this is
                              let entryClass = "";
                              let icon = "";
                              let message = "";

                              if (
                                log.type === "match" ||
                                log.type === "company_match"
                              ) {
                                entryClass = "match";
                                icon = "✓";
                                message = `Updated <strong>${log.buyer}</strong> with anniversary date: ${log.newValue}`;
                              } else if (
                                log.type === "no_match" ||
                                log.type === "no_match_company"
                              ) {
                                entryClass = "no-match";
                                icon = "❌";
                                message = `No match found for <strong>${log.buyer}</strong> (anniversary date: ${log.anniversaryDate})`;
                              } else if (log.type === "skip") {
                                entryClass = "skip";
                                icon = "⚠️";
                                message = `Skipped <strong>${log.buyer}</strong>: ${log.reason}`;
                              } else if (
                                log.type === "skipped_single_name" ||
                                log.type === "skipped_incomplete"
                              ) {
                                entryClass = "skip";
                                icon = "⏭️";
                                message = `Safely skipped <strong>${log.buyer}</strong>: ${log.reason}`;
                              } else if (
                                log.type === "no_match_added" ||
                                log.type === "no_match_company_added" ||
                                log.type === "single_name_added"
                              ) {
                                entryClass = "info";
                                icon = "➕";
                                message = `Added new contact <strong>${log.buyer}</strong> with anniversary date: ${log.anniversaryDate}`;
                              } else {
                                entryClass = "other";
                                icon = "ℹ️";
                                message = `${log.type}: <strong>${log.buyer}</strong>`;
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`change-entry ${entryClass}`}
                                >
                                  <p
                                    dangerouslySetInnerHTML={{
                                      __html: `${icon} ${message}`,
                                    }}
                                  ></p>
                                  {log.address && (
                                    <p className="small">
                                      Address: {log.address}
                                    </p>
                                  )}
                                  {log.matchType && (
                                    <p className="match-details">
                                      <span className="match-type">
                                        {log.matchType}
                                      </span>
                                      {log.matchDetails && (
                                        <span className="match-explanation">
                                          {" "}
                                          - {log.matchDetails}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            // Original filtered log display
                            <>
                              {step3Data.changeLog
                                .filter(
                                  (log) =>
                                    log.type === "match" ||
                                    log.type === "company_match"
                                )
                                .map((log, idx) => (
                                  <div key={idx} className="change-entry match">
                                    <p>
                                      ✓ Updated{" "}
                                      <strong>
                                        {log.contactName || log.buyer}
                                      </strong>{" "}
                                      with anniversary date: {log.newValue}
                                    </p>
                                    <p className="small">
                                      Address: {log.address}
                                    </p>
                                    {log.matchType && (
                                      <p className="match-details">
                                        <span className="match-type">
                                          {log.matchType}
                                        </span>
                                        {log.matchDetails && (
                                          <span className="match-explanation">
                                            {" "}
                                            - {log.matchDetails}
                                          </span>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ))}

                              {step3Data.changeLog
                                .filter(
                                  (log) =>
                                    log.type === "no_match" ||
                                    log.type === "no_match_company"
                                )
                                .map((log, idx) => (
                                  <div
                                    key={idx}
                                    className="change-entry no-match"
                                  >
                                    <p>
                                      ❌ No match found for{" "}
                                      <strong>{log.buyer}</strong> (anniversary
                                      date: {log.anniversaryDate})
                                    </p>
                                    <p className="small">
                                      Address: {log.address}
                                    </p>
                                  </div>
                                ))}

                              {step3Data.changeLog
                                .filter((log) => log.type === "skip")
                                .map((log, idx) => (
                                  <div key={idx} className="change-entry skip">
                                    <p>
                                      ⚠️ Skipped <strong>{log.buyer}</strong>:{" "}
                                      {log.reason}
                                    </p>
                                  </div>
                                ))}

                              {/* Show skipped entries for safety */}
                              {step3Data.changeLog
                                .filter(
                                  (log) =>
                                    log.type === "skipped_single_name" ||
                                    log.type === "skipped_incomplete"
                                )
                                .map((log, idx) => (
                                  <div key={idx} className="change-entry skip">
                                    <p>
                                      ⏭️ Safely skipped{" "}
                                      <strong>{log.buyer}</strong>: {log.reason}
                                    </p>
                                    <p className="small">
                                      Address: {log.address} | Anniversary:{" "}
                                      {log.anniversaryDate}
                                    </p>
                                  </div>
                                ))}

                              {/* Show new entries added */}
                              {step3Data.changeLog
                                .filter(
                                  (log) =>
                                    log.type === "no_match_added" ||
                                    log.type === "no_match_company_added" ||
                                    log.type === "single_name_added"
                                )
                                .map((log, idx) => (
                                  <div key={idx} className="change-entry info">
                                    <p>
                                      ➕ Added new contact{" "}
                                      <strong>{log.buyer}</strong> with
                                      anniversary date: {log.anniversaryDate}
                                    </p>
                                    <p className="small">
                                      Address: {log.address}
                                    </p>
                                  </div>
                                ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={downloadProcessedCSV}
                      className="download-button"
                    >
                      📥 Download Updated Compass Contacts
                    </button>

                    <button
                      onClick={generateClosedTransactionLog}
                      className="download-button secondary"
                      style={{
                        marginTop: "10px",
                        backgroundColor: "#28a745",
                        borderColor: "#28a745",
                      }}
                    >
                      📋 Generate Closed Transaction Log
                    </button>
                  </div>
                )}
              </div>

              <div className="step-actions">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="back-button"
                >
                  ← Back
                </button>

                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setShowAllLogs(false);
                    setStep1Data({
                      csvFile: null,
                      sellingAgent: "",
                      filteredData: null,
                      downloadReady: false,
                    });
                    setStep2Data({
                      homeAnniversaryCsv: null,
                      streamAppCsv: null,
                      mainSellingAgent: "",
                    });
                    setStep3Data({
                      processedData: null,
                      downloadReady: false,
                      matchedCount: 0,
                      newEntriesCount: 0,
                      totalBuyersProcessed: 0,
                      totalSellersProcessed: 0,
                      changeLog: [],
                    });
                  }}
                  className="restart-button"
                >
                  🔄 Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CsvFormatter;
