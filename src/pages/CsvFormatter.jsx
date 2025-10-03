import React, { useState } from "react";
import Papa from "papaparse";
import Navbar from "../components/Navbar";
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
  const processAndMergeData = () => {
    if (!step2Data.homeAnniversaryCsv || !step2Data.streamAppCsv) {
      alert("Please upload both CSV files before processing.");
      return;
    }

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

    // Ensure 'Groups', 'Tags', and 'Notes' columns are added to headers
    if (!saHeaders.includes("Groups")) {
      saHeaders.push("Groups");
    }
    if (!saHeaders.includes("Tags")) {
      saHeaders.push("Tags");
    }
    if (!saHeaders.includes("Notes")) {
      saHeaders.push("Notes");
    }

    // Initialize Notes column for all existing rows
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
    });

    // Helper function to detect if a name is likely a company name
    // Function to clean names for output - remove initials completely
    const cleanNameForOutput = (name, isFirstName = true) => {
      if (!name || typeof name !== "string") return name;

      // For first names, get just the first word (ignoring middle names/initials)
      if (isFirstName) {
        // If it contains multiple words, just take the first one
        const parts = name.trim().split(/\s+/);
        return parts[0];
      }
      // For last names, handle initials that might appear at the beginning
      else {
        const parts = name.trim().split(/\s+/);

        // If there's only one part, just return it
        if (parts.length <= 1) return name;

        // Check if the first part is an initial (single letter possibly with period)
        if (
          parts[0].length === 1 ||
          (parts[0].length === 2 && parts[0].endsWith("."))
        ) {
          // Remove the initial and return the rest
          return parts.slice(1).join(" ");
        }

        return name;
      }
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

    // Process each row in home anniversaries CSV
    haRows.forEach((haRow, rowIndex) => {
      const buyerNameRaw = haRow[haBuyerNameCol];
      const sellerNameRaw = haSellerNameCol ? haRow[haSellerNameCol] : null;
      const anniversaryDate = haRow[haAnnivCol] || "";
      const address = haRow[haAddressCol] || "";
      const sellingAgent = haRow[haSellingAgentCol] || "";

      // Get the main agent name we saved in step 2
      const mainAgentName = step2Data.mainSellingAgent.toLowerCase();

      // Determine if this is a buyer or seller based on whether selling agent matches main agent
      const isBuyer =
        sellingAgent.trim() !== "" &&
        sellingAgent.toLowerCase().includes(mainAgentName);

      // Choose which name to process based on agent matching
      const nameToProcess = isBuyer ? buyerNameRaw : sellerNameRaw;

      if (!nameToProcess || !anniversaryDate) return; // Skip if no appropriate name or anniversary date

      // Parse names - they may have multiple people separated by &
      // Format: "Last Name, First Name & Last Name, First Name" or "Company Name & Company Name"
      const contactNames = preprocessBuyerName(nameToProcess);

      if (isBuyer) {
        totalBuyersProcessed += contactNames.length;
      } else {
        // Count as seller
        totalSellersProcessed += contactNames.length;
      }

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
          const parts = normalizedName.split(",").map((part) => part.trim());

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
                // First letter matching for nicknames
                {
                  type: "firstletter",
                  firstLetter: firstName.toLowerCase().charAt(0),
                  lastName: lastName.toLowerCase(),
                },
                // Full name format
                { type: "fullname", fullName: buyerName.trim().toLowerCase() },
                // Full name reversed
                {
                  type: "fullname-reversed",
                  fullName: `${lastName} ${firstName}`.toLowerCase(),
                },
                // Last name only for uncommon last names
                { type: "lastname-only", lastName: lastName.toLowerCase() },
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

        // Create simplified versions of the names (without middle names/initials)
        const saFullName = `${saFirstName} ${saLastName}`;
        const saSimplifiedName = simplifyName(saFullName).toLowerCase();
        const saSimplifiedParts = saSimplifiedName.split(/\s+/);
        const saSimplifiedFirstName = saSimplifiedParts[0];
        const saSimplifiedLastName =
          saSimplifiedParts.length > 1
            ? saSimplifiedParts[saSimplifiedParts.length - 1]
            : "";

        // Generate different initial variations for more flexible matching
        // This creates both first initial + last name and first name + last initial patterns
        const firstInitial = saFirstName.charAt(0).toLowerCase();
        const lastInitial = saLastName.charAt(0).toLowerCase();
        const initialVariations = [
          `${firstInitial} ${saLastName}`.toLowerCase(), // First initial + last name
          `${saFirstName} ${lastInitial}`.toLowerCase(), // First name + last initial
          `${firstInitial}${saLastName}`.toLowerCase(), // First initial attached to last name
          `${saFirstName}${lastInitial}`.toLowerCase(), // First name with attached last initial
        ];

        // If it's a company, do company matching
        if (nameInfo.isCompany) {
          const companyName = nameInfo.companyName.toLowerCase();

          // Normalized versions for company name matching
          const normalizedCompanyName = companyName.replace(/[^\w\s]/g, "");
          const normalizedFullName = `${saFirstName} ${saLastName}`.replace(
            /[^\w\s]/g,
            ""
          );
          const normalizedSaCompany = saCompany.replace(/[^\w\s]/g, "");

          // Check for strict boundary match - MUCH more precise
          const boundaryMatch =
            new RegExp(`\\b${companyName}\\b`).test(
              `${saFirstName} ${saLastName}`
            ) ||
            (saCompany && new RegExp(`\\b${companyName}\\b`).test(saCompany));

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
          saLastParts.length > 1 ? saLastParts.slice(1, -1).join(" ") : "";
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
          // 1. Exact match on both first and last - highest confidence
          const exactMatch =
            saPrimaryFirst === nameInfo.firstName.toLowerCase() &&
            (saPrimaryLast === nameInfo.lastName.toLowerCase() ||
              saActualLast === nameInfo.lastName.toLowerCase());

          // If we have an exact match, return immediately - no need to try less confident methods
          if (exactMatch) {
            return {
              matched: true,
              matchType: "exact-name-match",
              details: `Exact match: "${nameInfo.firstName} ${nameInfo.lastName}" with "${saPrimaryFirst} ${saLastName}"`,
            };
          }

          // Simplified name match - using the simplifyName function to handle middle names/initials
          const simplifiedBuyerName = simplifyName(
            `${nameInfo.firstName} ${nameInfo.lastName}`
          ).toLowerCase();
          const simplifiedBuyerParts = simplifiedBuyerName.split(/\s+/);
          const simplifiedBuyerFirst = simplifiedBuyerParts[0];
          const simplifiedBuyerLast =
            simplifiedBuyerParts.length > 1
              ? simplifiedBuyerParts[simplifiedBuyerParts.length - 1]
              : "";

          // Standard simplified match
          const simplifiedMatch =
            simplifiedBuyerFirst === saSimplifiedFirstName &&
            simplifiedBuyerLast === saSimplifiedLastName;

          if (simplifiedMatch) {
            return {
              matched: true,
              matchType: "simplified-name-match",
              details: `Simplified name match (ignoring middle names/initials): "${simplifiedBuyerFirst} ${simplifiedBuyerLast}" matches "${saSimplifiedFirstName} ${saSimplifiedLastName}"`,
            };
          }

          // Generate buyer initial variations
          const buyerFirstInitial = nameInfo.firstName.charAt(0).toLowerCase();
          const buyerLastInitial = nameInfo.lastName.charAt(0).toLowerCase();
          const buyerInitialVariations = [
            `${buyerFirstInitial} ${nameInfo.lastName}`.toLowerCase(), // First initial + last name
            `${nameInfo.firstName} ${buyerLastInitial}`.toLowerCase(), // First name + last initial
            `${buyerFirstInitial}${nameInfo.lastName}`.toLowerCase(), // First initial attached to last name
            `${nameInfo.firstName}${buyerLastInitial}`.toLowerCase(), // First name with attached last initial
          ];

          // Check if any initial variations match
          for (const variation of buyerInitialVariations) {
            for (const saVariation of initialVariations) {
              if (variation === saVariation) {
                return {
                  matched: true,
                  matchType: "initial-variation-match",
                  details: `Matched using initial variation: "${variation}" with "${saVariation}"`,
                };
              }
            }
          }

          // Also try direct comparison of simplified names
          if (simplifiedBuyerName === saSimplifiedName) {
            return {
              matched: true,
              matchType: "direct-simplified-match",
              details: `Direct simplified name match: "${simplifiedBuyerName}" with "${saSimplifiedName}"`,
            };
          }

          // Handle special case where an initial is part of the first or last name
          // For example: "John A Smith" vs "John Smith" or "Smith J" vs "Smith"
          const firstNameWithInitial = saFirstName.match(
            /^(\w+)\s+[A-Za-z]\.?$/i
          );
          const lastNameWithInitial = saLastName.match(
            /^[A-Za-z]\.?\s+(\w+)$/i
          );

          let initialMatch = false;
          let initialMatchDetails = null;

          if (
            firstNameWithInitial &&
            firstNameWithInitial[1].toLowerCase() ===
              nameInfo.firstName.toLowerCase()
          ) {
            initialMatch = true;
            initialMatchDetails = `Matched name with initial in first name: "${firstNameWithInitial[1]}" extracted from "${saFirstName}" matched with "${nameInfo.firstName}"`;
          }

          if (
            !initialMatch &&
            lastNameWithInitial &&
            lastNameWithInitial[1].toLowerCase() ===
              nameInfo.lastName.toLowerCase()
          ) {
            initialMatch = true;
            initialMatchDetails = `Matched name with initial in last name: "${lastNameWithInitial[1]}" extracted from "${saLastName}" matched with "${nameInfo.lastName}"`;
          }

          if (initialMatch) {
            return {
              matched: true,
              matchType: "name-with-initial-match",
              details: initialMatchDetails,
            };
          }

          // NEW: First+Last core name match - ignores middle names completely
          // This helps with cases like "Ethan Goldstein" vs "Ethan Gutmann Goldstein"
          const coreNameMatch =
            saBasicFirstName === nameInfo.firstName.toLowerCase() &&
            saBasicLastName === nameInfo.lastName.toLowerCase();

          if (coreNameMatch) {
            return {
              matched: true,
              matchType: "core-name-match",
              details: `Core name match ignoring middle names: "${nameInfo.firstName} ${nameInfo.lastName}" matches "${saBasicFirstName} ${saBasicLastName}" in "${saFirstName} ${saLastName}"`,
            };
          }

          // 2. Middle name handling in last name - for cases like "Smith" vs "Smith Jones" or "Goldstein" vs "Gutmann Goldstein"
          const lastNameMiddleMatch =
            saPrimaryFirst === nameInfo.firstName.toLowerCase() && // Exact first name match required
            saLastName
              .toLowerCase()
              .includes(nameInfo.lastName.toLowerCase()) &&
            // Ensure the last name is a complete word OR at the end of the string (boundary matching)
            (new RegExp(`\\b${nameInfo.lastName.toLowerCase()}\\b`).test(
              saLastName.toLowerCase()
            ) ||
              // Also match if it's at the end of the string (e.g., "Gutmann Goldstein" should match "Goldstein")
              new RegExp(`\\b${nameInfo.lastName.toLowerCase()}$`).test(
                saLastName.toLowerCase()
              ));

          if (lastNameMiddleMatch) {
            return {
              matched: true,
              matchType: "last-name-with-middle",
              details: `First name exact match "${nameInfo.firstName}" and last name "${nameInfo.lastName}" found within compound last name "${saLastName}" (using improved boundary matching)`,
            };
          }

          // 3. Handle first name with middle - e.g., "John" vs "John Michael"
          const firstNameMiddleMatch =
            saLastName.toLowerCase() === nameInfo.lastName.toLowerCase() && // Exact last name match required
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

          // 4. Hyphenated last name handling - e.g., "Smith" vs "Smith-Jones"
          const hyphenatedLastNameMatch =
            saPrimaryFirst === nameInfo.firstName.toLowerCase() && // Exact first name match required
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

        // Check each format for specific matching patterns - MUCH STRICTER NOW
        for (const format of nameInfo.formats) {
          if (format.type === "standard") {
            // Standard matching (Last, First)
            const lastNameMatch =
              format.lastName === saPrimaryLast ||
              format.lastName === saActualLast;

            // First name matching - prefer exact matches
            const exactFirstNameMatch = format.firstName === saPrimaryFirst;

            // If we have an exact match on both first and last name, return immediately
            if (lastNameMatch && exactFirstNameMatch) {
              return {
                matched: true,
                matchType: "standard-exact-match",
                details: `Standard format exact match: "${format.firstName} ${format.lastName}" with "${saPrimaryFirst} ${saLastName}"`,
              };
            }

            // NEW: First+Last core name match for standard format - ignores middle names
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

            // Middle name handling - requires exact first name match and last name must be a complete word or at the end
            const middleNameMatch =
              exactFirstNameMatch &&
              saLastName.toLowerCase().includes(format.lastName) &&
              (new RegExp(`\\b${format.lastName}\\b`).test(
                saLastName.toLowerCase()
              ) ||
                // Also match if it's at the end of the string (e.g., "Gutmann Goldstein" should match "Goldstein")
                new RegExp(`\\b${format.lastName}$`).test(
                  saLastName.toLowerCase()
                ));

            if (middleNameMatch) {
              return {
                matched: true,
                matchType: "standard-middle-name",
                details: `Standard format with middle/compound name: exact first name "${format.firstName}" and last name "${format.lastName}" found in "${saLastName}" (using improved boundary matching)`,
              };
            }

            // Hyphenated or compound last name handling
            if (
              exactFirstNameMatch &&
              (saLastName.includes("-") || saLastName.includes(" ")) &&
              saLastName.toLowerCase().split(/[-\s]/).includes(format.lastName)
            ) {
              return {
                matched: true,
                matchType: "standard-compound-last",
                details: `Standard format with compound last name: exact first name "${format.firstName}" and last name "${format.lastName}" found in "${saLastName}"`,
              };
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

      contactNames.forEach((contactName) => {
        // Skip empty contact names
        if (!contactName.trim()) {
          return;
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

              // Update the Home Anniversary field
              const oldValue = saRow[saHomeAnnivCol] || "";
              updatedSaRows[saIndex][saHomeAnnivCol] = anniversaryDate;

              // Extract year from anniversary date for the sold date tag
              const anniversaryYear = anniversaryDate
                ? new Date(anniversaryDate).getFullYear()
                : "";

              // Create different tags based on whether this is a buyer or seller
              const tagsToAdd = isBuyer
                ? [
                    "CRM Refresh: Home Anniversary",
                    "Buyer",
                    anniversaryYear ? `${anniversaryYear}` : null,
                  ].filter(Boolean) // Remove null values
                : [
                    "CRM REFRESH CLOSED DATE",
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

              updatedSaRows[saIndex]["Tags"] = existingTagsArray.join(", ");

              // Add notes about what was done
              const contactType = isBuyer ? "buyer" : "seller";
              const notes = `Updated existing contact as ${contactType}: Added home anniversary date (${anniversaryDate}). Tags added: ${addedTags.join(
                ", "
              )}`;
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
            const contactType = isBuyer ? "buyer" : "seller";
            const newEntryTags = isBuyer
              ? [
                  "CRM Refresh: Home Anniversary",
                  "Buyer",
                  anniversaryYear ? `${anniversaryYear}` : null,
                ]
                  .filter(Boolean)
                  .join(", ")
              : [
                  "CRM REFRESH CLOSED DATE",
                  "Seller",
                  anniversaryYear ? `${anniversaryYear}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");

            // Add the company as a new row - preserve address components
            const newRow = {
              [saFirstNameCol]: companyName || "", // First Name (we'll put the company name here)
              [saLastNameCol]: "", // Last Name
              // Preserve address components from the original row if they exist
              ["Home Address Line 1"]: haRow["Home Address Line 1"] || address || "",
              ["Home Address Line 2"]: haRow["Home Address Line 2"] || "",
              ["Home Address City"]: haRow["Home Address City"] || "",
              ["Home Address State"]: haRow["Home Address State"] || "",
              ["Home Address Zip"]: haRow["Home Address Zip"] || "",
              [saHomeAnnivCol]: anniversaryDate || "", // Home Anniversary Date
              ["Groups"]: "Past clients", // Groups column value
              ["Tags"]: newEntryTags, // Tags column value
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
            contactType: isBuyer ? "buyer" : "seller",
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
              contactType: isBuyer ? "buyer" : "seller",
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
              contactType: isBuyer ? "buyer" : "seller",
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
          const matchResult = isNameMatch(nameInfo, saFirstName, saLastName);
          if (matchResult.matched) {
            matchFound = true;

            // Only count this as a match if we haven't updated this contact before
            const contactKey = `${saFirstName}-${saLastName}`;
            if (!uniqueContactsUpdated.has(contactKey)) {
              uniqueContactsUpdated.add(contactKey);
              matchedCount++;
            }

            // Update the Home Anniversary field
            const oldValue = saRow[saHomeAnnivCol] || "";
            updatedSaRows[saIndex][saHomeAnnivCol] = anniversaryDate;

            // Extract year from anniversary date for the sold date tag
            const anniversaryYear = anniversaryDate
              ? new Date(anniversaryDate).getFullYear()
              : "";

            // Create different tags based on whether this is a buyer or seller
            const tagsToAdd = isBuyer
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

            // Add notes about what was done
            const contactType = isBuyer ? "buyer" : "seller";
            const notes = `Updated existing contact as ${contactType}: Added home anniversary date (${anniversaryDate}). Tags added: ${addedTags.join(
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
          const contactType = isBuyer ? "buyer" : "seller";
          const newEntryTags = isBuyer
            ? [
                "CRM Refresh: Home Anniversary",
                "Buyer",
                anniversaryYear ? `${anniversaryYear}` : null,
              ]
                .filter(Boolean)
                .join(", ")
            : [
                "CRM REFRESH CLOSED DATE",
                "Seller",
                anniversaryYear ? `${anniversaryYear}` : null,
              ]
                .filter(Boolean)
                .join(", ");

          // Clean first and last names - remove any middle initials/names
          const cleanedFirstName = cleanNameForOutput(firstName, true);
          const cleanedLastName = cleanNameForOutput(lastName, false);

          const newRow = {
            [saFirstNameCol]: cleanedFirstName || "", // First Name (without middle names/initials)
            [saLastNameCol]: cleanedLastName || "", // Last Name (without initials at beginning)
            // Preserve address components from the original row if they exist
            ["Home Address Line 1"]: haRow["Home Address Line 1"] || address || "",
            ["Home Address Line 2"]: haRow["Home Address Line 2"] || "",
            ["Home Address City"]: haRow["Home Address City"] || "",
            ["Home Address State"]: haRow["Home Address State"] || "",
            ["Home Address Zip"]: haRow["Home Address Zip"] || "",
            [saHomeAnnivCol]: anniversaryDate || "", // Home Anniversary Date
            ["Groups"]: "Past clients", // Groups column value
            ["Tags"]: newEntryTags, // Tags column value
            ["Notes"]: `New ${contactType} contact added: ${firstName} ${lastName} (cleaned to ${cleanedFirstName} ${cleanedLastName}). Anniversary date: ${anniversaryDate}. Tags added: ${newEntryTags}`,
          };
          updatedSaRows.push(newRow);

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

    // Track which entries from the home anniversaries file were processed
    const processedEntries = new Set();
    changeLog.forEach((log) => {
      if (log.address && log.anniversaryDate) {
        processedEntries.add(`${log.address}-${log.anniversaryDate}`);
      }
    });

    // Make sure all entries from the home anniversaries file are included
    // If any were missed during the matching process, add them as new entries
    haRows.forEach((haRow) => {
      const buyerNameRaw = haRow[haBuyerNameCol];
      const sellerNameRaw = haSellerNameCol ? haRow[haSellerNameCol] : null;
      const anniversaryDate = haRow[haAnnivCol] || "";
      const address = haRow[haAddressCol] || "";
      const sellingAgent = haRow[haSellingAgentCol] || "";

      // Skip if no anniversary date or address
      if (!anniversaryDate || !address) return;

      // Check if this entry was already processed
      const entryKey = `${address}-${anniversaryDate}`;
      if (processedEntries.has(entryKey)) return;

      // If we get here, this entry wasn't processed yet
      // Get the main agent name we saved in step 2
      const mainAgentName = step2Data.mainSellingAgent.toLowerCase();

      // Determine if this is a buyer or seller based on whether selling agent matches main agent
      const isBuyer =
        sellingAgent.trim() !== "" &&
        sellingAgent.toLowerCase().includes(mainAgentName);

      // Choose which name to process based on agent matching
      const nameToProcess = isBuyer ? buyerNameRaw : sellerNameRaw;
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
            "CRM Refresh: Home Anniversary",
            "Buyer",
            anniversaryYear ? `${anniversaryYear}` : null,
          ]
            .filter(Boolean)
            .join(", ")
        : [
            "CRM REFRESH CLOSED DATE",
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
        ["Home Address Line 1"]: haRow["Home Address Line 1"] || address || "",
        ["Home Address Line 2"]: haRow["Home Address Line 2"] || "",
        ["Home Address City"]: haRow["Home Address City"] || "",
        ["Home Address State"]: haRow["Home Address State"] || "",
        ["Home Address Zip"]: haRow["Home Address Zip"] || "",
        [saHomeAnnivCol]: anniversaryDate || "",
        ["Groups"]: "Past clients",
        ["Tags"]: newEntryTags,
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

    setStep3Data({
      processedData: processedData,
      downloadReady: true,
      matchedCount: matchedCount,
      newEntriesCount: newEntriesCount,
      totalBuyersProcessed: totalBuyersProcessed,
      totalSellersProcessed: totalSellersProcessed,
      changeLog: changeLog,
    });
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

  return (
    <>
      <Navbar />
      <div className="csv-formatter">
        <header className="page-header">
          <h1>📊 CSV Formatter</h1>
          <p>Process and merge your CSV data in 3 easy steps</p>

          {/* Step indicator */}
          <div className="step-indicator">
            <div
              className={`step ${
                currentStep === 1
                  ? "active"
                  : currentStep > 1
                  ? "completed"
                  : ""
              }`}
            >
              <span>1</span>
              <label>Format & Filter</label>
            </div>
            <div
              className={`step ${
                currentStep === 2
                  ? "active"
                  : currentStep > 2
                  ? "completed"
                  : ""
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
                    Upload your CSV file with home anniversaries, format all
                    names correctly, and optionally filter by selling agent.
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
                          Extract contact names from home anniversary CSV
                          (format: "Last Name, First Name" or company names)
                        </li>
                        <li>
                          Handle multiple buyers/sellers separated by "&"
                          symbols
                        </li>
                        <li>
                          Search for matching names in the Compass contacts
                          database
                        </li>
                        <li>
                          Tag contacts as "Buyer" with "CRM Refresh: Home
                          Anniversary" if the selling agent matches the main
                          agent
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
                            Contacts with this agent will be tagged as Buyers,
                            all others as Sellers
                          </em>
                        </p>
                      </div>

                      <button
                        onClick={processAndMergeData}
                        className="process-button"
                        disabled={!step2Data.mainSellingAgent.trim()}
                      >
                        🔄 Process Data
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
                          ✓ {step3Data.matchedCount} unique contacts updated
                          with home anniversary dates
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
                            ). This may indicate over-matching with flexible
                            name matching.
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
                            {step3Data.matchedCount}) is much higher than
                            expected for {step3Data.totalBuyersProcessed} buyers
                            processed. This may indicate over-matching with
                            company names or duplicates.
                          </p>
                        )}
                      </div>

                      {step3Data.changeLog &&
                        step3Data.changeLog.length > 0 && (
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
                                      <div
                                        key={idx}
                                        className="change-entry match"
                                      >
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
                                          <strong>{log.buyer}</strong>{" "}
                                          (anniversary date:{" "}
                                          {log.anniversaryDate})
                                        </p>
                                        <p className="small">
                                          Address: {log.address}
                                        </p>
                                      </div>
                                    ))}

                                  {step3Data.changeLog
                                    .filter((log) => log.type === "skip")
                                    .map((log, idx) => (
                                      <div
                                        key={idx}
                                        className="change-entry skip"
                                      >
                                        <p>
                                          ⚠️ Skipped{" "}
                                          <strong>{log.buyer}</strong>:{" "}
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
                                      <div
                                        key={idx}
                                        className="change-entry skip"
                                      >
                                        <p>
                                          ⏭️ Safely skipped{" "}
                                          <strong>{log.buyer}</strong>:{" "}
                                          {log.reason}
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
                                      <div
                                        key={idx}
                                        className="change-entry info"
                                      >
                                        <p>
                                          ➕ Added new contact{" "}
                                          <strong>{log.buyer}</strong> with
                                          anniversary date:{" "}
                                          {log.anniversaryDate}
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
    </>
  );
}

export default CsvFormatter;
