import Papa from "papaparse";
import Fuse from "fuse.js";
import * as XLSX from "xlsx";

// Comprehensive list of real estate brokerage domains
const BROKERAGE_DOMAINS = new Set([
  "compass.com",
  "coldwellbanker.com",
  "century21.com",
  "kw.com",
  "remax.com",
  "sothebysrealty.com",
  "berkshirehathaway.com",
  "howardhanna.com",
  "elliman.com",
  "elegran.com",

  "weichert.com",
  "windermere.com",
  "johnlscott.com",
  "realogy.com",
  "anywhere.re",
  "cbmoves.com",
  "era.com",
  "bhhsamb.com",
  "bhhsnw.com",
  "bhhsne.com",
  "sirmove.com",
  "kellerwilliams.com",
  "kwrealty.com",
  "kwcom.com",
  "kwconnect.com",
  "remax.net",
  "remaxagent.com",
  "remaxresults.com",
  "remaxnow.com",
  "c21.com",
  "century21.net",
  "c21global.com",
  "century21global.com",
  "prudentialrealestate.com",
  "prudential.com",
  "pru.com",
  "exitrealty.com",
  "exitrealtygroup.com",
  "exitrealtycorp.com",
  "realtyone.com",
  "realtyonegroup.com",
  "rog.com",
  "exprealty.com",
  "exprealtyworld.com",
  "expresidenitalrealty.com",
  "nexthome.com",
  "nexthomerealty.com",
  "nexthomefranchise.com",
  "redfin.com",
  "redfinagent.com",
  "redfinnow.com",
  "zillow.com",
  "zillowgroup.com",
  "trulia.com",
  "opendoor.com",
  "opendoorgroup.com",
  "opendoorlabs.com",
  "offerpad.com",
  "offerpadnow.com",
  "offerpadgroup.com",
  "homevestors.com",
  "homevestorsfranchise.com",
  "better.com",
  "bettercom.com",
  "bettermortgage.com",
  "rocketmortgage.com",
  "quickenloans.com",
  "rocketcompanies.com",
  "loanDepot.com",
  "loandepotbank.com",
  "ldi.com",
  "caliberhomeloans.com",
  "caliberloans.com",
  "fairwaymc.com",
  "fairwaymortgage.com",
  "fairwayindependentmc.com",
  "movimento.com",
  "movementmortgage.com",
  "guildmortgage.com",
  "guildloans.com",
  // Adding additional common realtor domains
  "flowrealty.com",
  "bhhs.com",
  "corcoran.com",
  "longandfoster.com",
  "homesmart.com",
  "realtrends.com",
  "cbhomes.com",
  "bhgre.com",
  "erares.com",
  "cbredirect.com",
  "nar.realtor",
  "sothebys.com",
  "realestateone.com",
  "realtyfirst.com",
  "realliving.com",
  "realtyexecutives.com",
  "unitedrealestate.com",
  // Adding missed domains from our analysis
  "exrny.com",
  "bondnewyork.com",
  "thenextsteprealty.com",
  "nextstopny.com",
  "djsoucygroup.com",
  "herzwurmhomes.com",
  "bhsusa.com",
  "realnewyork.com",
  "cushwake.com",
  "raveis.com",
]);

// Keywords that strongly indicate a real estate agent in email addresses or domains
const AGENT_KEYWORDS = [
  "realtor",
  "realty",
  "properties",
  "homes",
  "broker",
  "realestate",
  "homesales",
  "homesforsale",
  "listings",
  "residence",
  "residential",
  "agent",
  "real estate",
  "re/max",
  "century21",
  "sothebys",
  "coldwell",
  "keller",
  "williams",
  "berkshire",
  "hathaway",
  "douglas",
  "elliman",
  "compass",
  "corcoran",
  "weichert",
  "christie",
  "bhhs",
  "exp",
  "redfin",
  "zillow",
  "trulia",
  "homesmart",
  "associates",
  "realtors",
  "property",
  "flow",
  "harrynorman",
  "dorseyalston",
  "ansleyre",
  "ansley",
  "atlantafinehomes",
  "evatlanta",
  "heritageselect",
  "anchorny",
  "serhant",
  "citihabitats",
  "bondnewyork",
  "nestseekers",
  "halstead",
  "cbrealty",
  "cbwalburg",
  "rutenbert",
  "stribling",
  "opgny",
  "corenyc",
  // Additional keywords for better matching
  "exrny",
  "bond",
  "newyorkrealty",
];

// Keywords for vendor classification
const VENDOR_KEYWORDS = [
  "title",
  "escrow",
  "mortgage",
  "lending",
  "loan",
  "bank",
  "credit",
  "insurance",
  "home warranty",
  "inspection",
  "appraisal",
  "appraiser",
  "appraisals",
  "attorney",
  "architects",
  "law",
  "legal",
  "notary",
  "staging",
  "photography",
  "marketing",
  "repair",
  "contractor",
  "contractors",
  "handyman",
  "cleaning",
  "moving",
  "modus",
  "chartwell",
  "krisslaw",
  "modustitle",
  "chartwellescrow",
  "storage",
  "funding",
  // "estate", // Removed because it matches "real estate"
  "construction",
  "plumbing",
  // "associates", // Removed because many real estate companies have "associates" in their name
  "capital",
  "firm",
  "design",
  "designer",
  "architect",
  "renovations",
  "interiors",
  "furnace",
  "duct cleaning",
  "air conditioning",
  "hvac",
  "property management",
  "landscaping",
  "gardening",
  "flooring",
  "carpentry",
  "painter",
  "painting",
  "roofing",
  "electrical",
  "electrician",
  // "agent", // Removed because it matches "real estate agent"
  // "broker", // Removed because it matches "real estate broker"
  // "realty", // Removed because it matches real estate companies
  "financial",
  "finance",
  "advisor",
  "investment",
  "investing",
  "accounting",
  "accountant",
  "tax",
  "inspection",
  "inspector",
  "business development",
  "studio", // Added for design studios, photography studios, etc.
  "build", // Added for builders and construction professionals
];

class RealEstateProcessor {
  constructor() {
    this.resetProcessor();
  }

  resetProcessor() {
    this.compassData = [];
    this.phoneData = [];
    this.mlsAddresses = [];
    this.processedData = [];
    this.contactsMovedToLeads = 0; // Initialize counter for contacts moved to Leads
    this.phonesAddedCount = 0; // Initialize counter for phones added from phone data
    this.emailsAddedCount = 0; // Initialize counter for emails added during merging
    this.stats = {
      totalRecords: 0,
      mergedRecords: 0,
      duplicatesRemoved: 0,
      duplicatesTagged: 0, // New stat for tracking tagged duplicates
      agents: 0,
      vendors: 0,
      pastClients: 0,
      changedRecords: 0,
    };
    console.log("Processor reset with fresh stats:", this.stats);
  }

  // Parse CSV files with chunked processing for large files
  async parseCSVChunked(file, onLog = null) {
    return new Promise((resolve, reject) => {
      const results = [];
      let isHeaderProcessed = false;
      let headers = [];

      Papa.parse(file, {
        header: false, // We'll handle headers manually for better control
        skipEmptyLines: true,
        encoding: "UTF-8",
        chunk: (chunk, parser) => {
          // Process in chunks to avoid blocking the UI
          if (!isHeaderProcessed) {
            headers = chunk.data[0].map((h) => h.trim());
            isHeaderProcessed = true;
            chunk.data = chunk.data.slice(1); // Remove header row
            console.log("CSV Headers found:", headers);
            if (onLog)
              onLog(`CSV Headers: ${headers.slice(0, 10).join(", ")}...`);
          }

          // Convert rows to objects
          const chunkObjects = chunk.data.map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });

          results.push(...chunkObjects);

          // Yield control back to the browser periodically
          if (results.length % 1000 === 0) {
            setTimeout(() => parser.resume(), 0);
            parser.pause();
          }
        },
        complete: () => {
          console.log(`Parsed ${results.length} records from ${file.name}`);
          console.log("Sample record:", results[0]);
          if (onLog) onLog(`Parsing complete: ${results.length} records`);
          if (onLog && results.length > 0) {
            onLog(
              `Sample record: ${results[0]["First Name"]} ${
                results[0]["Last Name"]
              } - ${
                results[0]["Personal Email"] ||
                results[0]["Email"] ||
                "no email"
              }`
            );
          }
          resolve(results);
        },
        error: (error) => reject(error),
      });
    });
  }

  // Enhanced email normalization for better duplicate detection
  normalizeEmail(email) {
    if (!email || typeof email !== "string") return "";

    return email
      .toLowerCase()
      .trim()
      .replace(/\./g, "") // Remove dots
      .replace(/\+.*@/, "@") // Remove plus aliases (user+alias@domain.com -> user@domain.com)
      .replace(/(\d+)$/, ""); // Remove trailing numbers from username part
  }

  // Check if two names are similar enough to potentially be the same person
  areNamesSimilar(name1, name2) {
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
    const distance = this.getLevenshteinDistance(name1, name2);

    // Calculate similarity as a ratio
    const similarity = 1 - distance / maxLength;

    // Consider similar if 80% or more similar (allows for 1-2 character differences in typical names)
    return similarity >= 0.8;
  }

  // Calculate Levenshtein distance between two strings
  getLevenshteinDistance(a, b) {
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
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // Calculate similarity between two contacts
  calculateContactSimilarity(contact1, contact2) {
    const name1 = this.normalizeName(
      contact1["First Name"],
      contact1["Last Name"]
    );
    const name2 = this.normalizeName(
      contact2["First Name"],
      contact2["Last Name"]
    );

    // Use Fuse.js for name similarity
    const fuse = new Fuse([{ name: name2 }], {
      keys: ["name"],
      threshold: 0.3, // More lenient for name matching
      includeScore: true,
    });

    const nameResult = fuse.search(name1);
    const nameSimilarity = nameResult.length > 0 ? 1 - nameResult[0].score : 0;

    // Get emails and phones for comparison
    const emails1 = this.getAllEmails(contact1).map((e) =>
      this.normalizeEmail(e)
    );
    const emails2 = this.getAllEmails(contact2).map((e) =>
      this.normalizeEmail(e)
    );
    const phones1 = this.getAllPhoneNumbers(contact1);
    const phones2 = this.getAllPhoneNumbers(contact2);

    // Check for email overlap
    let emailSimilarity = 0;
    if (emails1.length > 0 && emails2.length > 0) {
      const emailOverlap = emails1.some((e1) =>
        emails2.some((e2) => e1 === e2)
      );
      emailSimilarity = emailOverlap ? 1 : 0;
    }

    // Check for phone overlap
    let phoneSimilarity = 0;
    if (phones1.length > 0 && phones2.length > 0) {
      const phoneOverlap = phones1.some((p1) =>
        phones2.some((p2) => p1 === p2)
      );
      phoneSimilarity = phoneOverlap ? 1 : 0;
    }

    // Calculate weighted similarity
    // High name similarity + any email/phone match = likely duplicate
    if (nameSimilarity > 0.8) {
      if (emailSimilarity > 0 || phoneSimilarity > 0) {
        return 0.95; // Very high confidence
      }
      return nameSimilarity * 0.7; // Name similarity only
    }

    // Exact email match with decent name similarity
    if (emailSimilarity > 0 && nameSimilarity > 0.6) {
      return 0.9;
    }

    // Exact phone match with decent name similarity
    if (phoneSimilarity > 0 && nameSimilarity > 0.6) {
      return 0.85;
    }

    return nameSimilarity * 0.5; // Low confidence
  }

  // Deduplicate data within a single file using optimized fuzzy matching
  deduplicateData(data, source = "compass", onLog = null) {
    try {
      console.log(
        `[DEDUP] Starting optimized deduplication of ${data.length} records from ${source}...`
      );
      if (onLog)
        onLog(
          `[DEDUP] Starting optimized deduplication of ${data.length} records from ${source}...`
        );

      if (!data || data.length === 0) {
        console.log(`[DEDUP] No data to deduplicate for ${source}`);
        if (onLog) onLog(`[DEDUP] No data to deduplicate for ${source}`);
        return data;
      }

      // For very large datasets, use chunked deduplication approach
      if (data.length > 50000) {
        console.log(
          `[DEDUP] Large dataset detected (${data.length} records), using chunked deduplication`
        );
        if (onLog)
          onLog(
            `[DEDUP] Large dataset detected, using chunked approach for better performance`
          );

        return this.deduplicateDataChunked(data, source, onLog);
      }

      const seen = new Map();
      const duplicates = [];
      let duplicateExamples = [];
      let fuzzyMatches = 0;
      const result = []; // We'll keep all records but tag duplicates

      for (let i = 0; i < data.length; i++) {
        const record = data[i];

        // Initialize changes array if it doesn't exist
        if (!record.changes) record.changes = [];

        const firstName = (record["First Name"] || "").trim();
        const lastName = (record["Last Name"] || "").trim();

        // Skip records without proper names, but allow email-only contacts to be processed
        if (!firstName && !lastName) {
          // Check if this contact has at least an email
          const emails = this.getAllEmails(record).map((e) =>
            this.normalizeEmail(e)
          );
          if (emails.length === 0) {
            if (onLog && i < 5)
              onLog(`[DEDUP] Skipping record ${i + 1} with no name or email`);
            result.push(record);
            continue;
          }
          // For email-only contacts, we'll process them below
        }

        const normalizedName = this.normalizeName(firstName, lastName);
        const emails = this.getAllEmails(record).map((e) =>
          this.normalizeEmail(e)
        );
        const phones = this.getAllPhoneNumbers(record);

        // Create multiple keys for different matching strategies
        const keys = [];

        // Exact email matches (always create these if emails exist)
        for (const email of emails) {
          if (email) {
            keys.push(`email|${email}`);
          }
        }

        // Exact phone matches
        for (const phone of phones) {
          if (phone) {
            keys.push(`phone|${phone}`);
          }
        }

        // Only create name-based keys if we have a meaningful name
        if (normalizedName && normalizedName.length > 1) {
          // FIRST: Add exact name match key (case-insensitive)
          keys.push(`name|${normalizedName}`);

          // Enhanced name+email combinations
          for (const email of emails) {
            if (email && normalizedName) {
              const normalizedEmail = this.normalizeEmail(email);
              keys.push(`name-email|${normalizedName}|${normalizedEmail}`);

              // Also try with just first name for fuzzy matching
              const firstNameOnly = (firstName || "")
                .toLowerCase()
                .trim()
                .replace(/[^\w\s]/g, "");
              if (firstNameOnly.length > 1) {
                keys.push(`first-email|${firstNameOnly}|${normalizedEmail}`);
              }
            }
          }

          // Name+phone combinations
          for (const phone of phones) {
            if (phone && normalizedName) {
              keys.push(`name-phone|${normalizedName}|${phone}`);
            }
          }
        }

        // Check if any key already exists
        let existingRecord = null;
        let matchType = "";

        for (const key of keys) {
          if (seen.has(key)) {
            existingRecord = seen.get(key);
            matchType = key.split("|")[0];
            break;
          }
        }

        if (existingRecord) {
          // Check for completely different names to prevent merging unrelated contacts
          const existingFirstName = (existingRecord["First Name"] || "")
            .toLowerCase()
            .trim();
          const existingLastName = (existingRecord["Last Name"] || "")
            .toLowerCase()
            .trim();
          const recordFirstName = (record["First Name"] || "")
            .toLowerCase()
            .trim();
          const recordLastName = (record["Last Name"] || "")
            .toLowerCase()
            .trim();

          // Check if this is an exact name match (both first and last names are the same)
          const isExactNameMatch =
            existingFirstName &&
            recordFirstName &&
            existingLastName &&
            recordLastName &&
            existingFirstName === recordFirstName &&
            existingLastName === recordLastName;

          // Check if match was based on exact name key
          const isNameBasedMatch = keys.some(
            (key) => key.startsWith("name|") && seen.has(key)
          );

          // For exact name matches or name-based matches, always proceed with duplicate detection
          if (!isExactNameMatch && !isNameBasedMatch) {
            // Only check for different names if it's NOT an exact name match
            const isDifferentName =
              existingFirstName &&
              recordFirstName &&
              existingFirstName !== recordFirstName;

            if (isDifferentName) {
              // Don't merge records with different first names
              // Check if they might be family members (same last name, shared contact info)
              if (
                existingLastName &&
                recordLastName &&
                existingLastName === recordLastName
              ) {
                // These are likely family members - add a note but don't merge
                record.changes = record.changes || [];
                record.changes.push(
                  `Potential family member of ${existingFirstName} ${existingLastName} (shared contact info)`
                );
              }

              // Add this record as unique
              for (const key of keys) {
                seen.set(key, record);
              }
              result.push(record);
              continue;
            }
          }

          // If names are not completely different, proceed with normal merging
          // Determine which record should be the master (prioritize Compass contacts over Phone contacts)
          let masterRecord, duplicateRecord;

          // Check if either record is from Compass
          const recordIsCompass = record.source === "compass";
          const existingIsCompass = existingRecord.source === "compass";

          if (existingIsCompass && !recordIsCompass) {
            // Existing record is from Compass, current record is not - keep Compass as master
            masterRecord = existingRecord;
            duplicateRecord = record;
          } else if (!existingIsCompass && recordIsCompass) {
            // Current record is from Compass, existing record is not - make Compass the master
            masterRecord = record;
            duplicateRecord = existingRecord;
            // Update the seen map to point to the new master
            for (const key of keys) {
              seen.set(key, record);
            }
          } else {
            // Both are from same source or neither is from Compass - keep existing as master
            masterRecord = existingRecord;
            duplicateRecord = record;
          }

          // Add the duplicate tag to the duplicate record
          if (!duplicateRecord["Tags"]) {
            duplicateRecord["Tags"] = "CRMDuplicate";
          } else if (
            !duplicateRecord["Tags"].toLowerCase().includes("crmduplicate")
          ) {
            // Before adding duplicate tag, make sure to remove merged tag if it exists
            let tags = duplicateRecord["Tags"].split(",").map((t) => t.trim());
            // Remove any merged tag variants
            tags = tags.filter(
              (tag) =>
                tag.toLowerCase() !== "merged" &&
                tag.toLowerCase() !== "crmmerged"
            );
            // Add the duplicate tag
            tags.push("CRMDuplicate");
            duplicateRecord["Tags"] = tags.join(",");
          } // Add "CRMMERGED" tag to the master record and REMOVE any CRMDuplicate tag
          // A record cannot be both a CRMMERGED (master) and a CRMDuplicate
          if (!masterRecord["Tags"]) {
            masterRecord["Tags"] = "CRMMERGED";
          } else {
            // Remove CRMDuplicate tag if it exists
            let tags = masterRecord["Tags"].split(",").map((t) => t.trim());
            // Remove any duplicate tag variants
            tags = tags.filter(
              (tag) =>
                tag.toLowerCase() !== "duplicate" &&
                tag.toLowerCase() !== "crmduplicate"
            );
            // Add "CRMMERGED" tag if it doesn't exist
            if (
              !tags.some(
                (tag) =>
                  tag.toLowerCase() === "merged" ||
                  tag.toLowerCase() === "crmmerged"
              )
            ) {
              tags.push("CRMMERGED");
            }
            masterRecord["Tags"] = tags.join(",");
          }

          // Note the original record this is a duplicate of
          const originalName = `${masterRecord["First Name"] || ""} ${
            masterRecord["Last Name"] || ""
          }`.trim();
          duplicateRecord.changes.push(
            `Marked as duplicate of ${originalName} (${matchType} match)`
          );

          // Add a note to the master record about the merge
          masterRecord.changes = masterRecord.changes || [];
          masterRecord.changes.push(
            `Merged with duplicate record: ${
              duplicateRecord["First Name"] || ""
            } ${duplicateRecord["Last Name"] || ""} (${matchType} match)`
          );

          // Still merge data to ensure we capture all information
          this.mergeContactData(masterRecord, duplicateRecord);

          duplicates.push(duplicateRecord);
          this.stats.duplicatesTagged++; // Using new stat field instead of duplicatesRemoved
          fuzzyMatches++;

          // Track duplicate examples
          if (duplicateExamples.length < 10) {
            duplicateExamples.push(
              `${duplicateRecord["First Name"]} ${duplicateRecord["Last Name"]} (${matchType} match) is duplicate of ${masterRecord["First Name"]} ${masterRecord["Last Name"]}`
            );
          }

          console.log(
            `[DEDUP] Found duplicate: ${duplicateRecord["First Name"]} ${duplicateRecord["Last Name"]} (${matchType} match) - tagged as duplicate`
          );
          if (onLog && duplicateExamples.length <= 10) {
            onLog(
              `[DEDUP] Found duplicate: ${duplicateRecord["First Name"]} ${duplicateRecord["Last Name"]} (${matchType} match) - tagged as duplicate`
            );
          }

          // Add both records to result since we're keeping duplicates now
          if (!result.includes(masterRecord)) {
            result.push(masterRecord);
          }
          result.push(duplicateRecord);
        } else {
          // No match found - add as unique and register all keys
          for (const key of keys) {
            seen.set(key, record);
          }
          result.push(record);
        }

        // Progress update for large datasets
        if ((i + 1) % 500 === 0 && onLog) {
          onLog(`[DEDUP] Processed ${i + 1}/${data.length} records...`);
        }
      }

      console.log(
        `[DEDUP] ${source}: Tagged ${duplicates.length} duplicates, total records: ${result.length}`
      );
      console.log(`[DEDUP] Enhanced matches found: ${fuzzyMatches}`);
      console.log(`[DEDUP] Duplicate examples:`, duplicateExamples);

      if (onLog) {
        onLog(
          `[DEDUP] ${source}: Tagged ${duplicates.length} duplicates as "CRMDuplicate", total records: ${result.length}`
        );
        onLog(`[DEDUP] Enhanced matches: ${fuzzyMatches}`);
        if (duplicateExamples.length > 0) {
          onLog(
            `[DEDUP] Examples of duplicates found: ${duplicateExamples
              .slice(0, 3)
              .join("; ")}`
          );
        }
      }

      return result;
    } catch (error) {
      console.error("[DEDUP] Error in deduplication:", error);
      if (onLog) onLog(`[DEDUP] Error in deduplication: ${error.message}`);
      // Return original data if there's an error
      return Array.isArray(data) ? data : [];
    }
  }

  // Parse Excel files
  async parseExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Deduplicate large datasets in chunks to prevent browser from freezing
  deduplicateDataChunked(data, source = "compass", onLog = null) {
    console.log(
      `[DEDUP] Starting chunked deduplication for large dataset (${data.length} records)`
    );
    if (onLog)
      onLog(
        `[DEDUP] Processing large dataset in chunks to prevent browser from freezing...`
      );

    // Process in chunks of 10,000 records to avoid memory issues
    const chunkSize = 10000;
    const totalChunks = Math.ceil(data.length / chunkSize);

    // Create progress indicator
    const progressDiv = document.createElement("div");
    progressDiv.style.position = "fixed";
    progressDiv.style.top = "50%";
    progressDiv.style.left = "50%";
    progressDiv.style.transform = "translate(-50%, -50%)";
    progressDiv.style.padding = "20px";
    progressDiv.style.background = "white";
    progressDiv.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    progressDiv.style.borderRadius = "5px";
    progressDiv.style.zIndex = "9999";
    progressDiv.innerHTML = `
      <h3>Processing Large Dataset</h3>
      <div style="margin-bottom: 10px;">Deduplicating: Chunk <span id="chunk-count">0</span> of ${totalChunks}</div>
      <div style="width: 300px; height: 20px; background: #eee; border-radius: 10px; overflow: hidden;">
        <div id="dedup-progress-bar" style="width: 0%; height: 100%; background: #4CAF50;"></div>
      </div>
    `;
    document.body.appendChild(progressDiv);

    // Global lookup map for all chunks
    const seen = new Map();
    const result = [];
    let duplicateCount = 0;
    let fuzzyMatches = 0;

    // Process data in chunks using promises for better UI responsiveness
    const processChunk = (startIdx, chunkNum) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Update progress UI
          document.getElementById("chunk-count").textContent = chunkNum;
          document.getElementById(
            "dedup-progress-bar"
          ).style.width = `${Math.round((chunkNum / totalChunks) * 100)}%`;

          const endIdx = Math.min(startIdx + chunkSize, data.length);
          const chunkData = data.slice(startIdx, endIdx);

          // Process each record in the chunk
          for (const record of chunkData) {
            // Initialize changes array if it doesn't exist
            if (!record.changes) record.changes = [];

            const firstName = (record["First Name"] || "").trim();
            const lastName = (record["Last Name"] || "").trim();

            // Skip records without proper names and emails
            if (!firstName && !lastName) {
              const emails = this.getAllEmails(record).map((e) =>
                this.normalizeEmail(e)
              );
              if (emails.length === 0) {
                result.push(record);
                continue;
              }
            }

            const normalizedName = this.normalizeName(firstName, lastName);
            const emails = this.getAllEmails(record).map((e) =>
              this.normalizeEmail(e)
            );
            const phones = this.getAllPhoneNumbers(record);

            // Create lookup keys
            const keys = [];

            // Email keys
            for (const email of emails) {
              if (email) keys.push(`email|${email}`);
            }

            // Phone keys
            for (const phone of phones) {
              if (phone) keys.push(`phone|${phone}`);
            }

            // Name-based keys
            if (normalizedName && normalizedName.length > 1) {
              // FIRST: Add exact name match key (case-insensitive)
              keys.push(`name|${normalizedName}`);

              // Name+email combinations
              for (const email of emails) {
                if (email) {
                  const normalizedEmail = this.normalizeEmail(email);
                  keys.push(`name-email|${normalizedName}|${normalizedEmail}`);
                }
              }

              // Name+phone combinations
              for (const phone of phones) {
                if (phone) keys.push(`name-phone|${normalizedName}|${phone}`);
              }
            }

            // Check if this record matches any existing record
            let existingRecord = null;
            let matchType = "";

            for (const key of keys) {
              if (seen.has(key)) {
                existingRecord = seen.get(key);
                matchType = key.split("|")[0];
                break;
              }
            }

            if (existingRecord) {
              // Check for completely different names to prevent merging unrelated contacts
              const existingFirstName = (existingRecord["First Name"] || "")
                .toLowerCase()
                .trim();
              const existingLastName = (existingRecord["Last Name"] || "")
                .toLowerCase()
                .trim();
              const recordFirstName = (record["First Name"] || "")
                .toLowerCase()
                .trim();
              const recordLastName = (record["Last Name"] || "")
                .toLowerCase()
                .trim();

              // Check if this is an exact name match (both first and last names are the same)
              const isExactNameMatch =
                existingFirstName &&
                recordFirstName &&
                existingLastName &&
                recordLastName &&
                existingFirstName === recordFirstName &&
                existingLastName === recordLastName;

              // Check if match was based on exact name key
              const isNameBasedMatch = keys.some(
                (key) => key.startsWith("name|") && seen.has(key)
              );

              // For exact name matches or name-based matches, always proceed with duplicate detection
              if (!isExactNameMatch && !isNameBasedMatch) {
                // Check for name similarity
                let isDifferentName = false;

                // Different last names - almost certainly different people
                if (
                  existingLastName &&
                  recordLastName &&
                  existingLastName !== recordLastName &&
                  !this.areNamesSimilar(existingLastName, recordLastName)
                ) {
                  isDifferentName = true;
                }

                // Simple rule: If first names are different, don't merge - regardless of last name
                else if (
                  existingFirstName &&
                  recordFirstName &&
                  existingFirstName !== recordFirstName
                ) {
                  isDifferentName = true;
                }

                if (isDifferentName) {
                  // Don't merge records with different first names
                  // Check if they might be family members (same last name, shared contact info)
                  if (
                    existingLastName &&
                    recordLastName &&
                    existingLastName === recordLastName &&
                    existingFirstName &&
                    recordFirstName &&
                    existingFirstName !== recordFirstName
                  ) {
                    // These are likely family members - add a note but don't merge
                    record.changes = record.changes || [];
                    record.changes.push(
                      `Potential family member of ${existingFirstName} ${existingLastName} (shared contact info)`
                    );
                  }

                  // Add this record as unique
                  for (const key of keys) {
                    seen.set(key, record);
                  }
                  result.push(record);
                  continue;
                }
              }

              // Determine which record should be the master (prioritize Compass contacts over Phone contacts)
              let masterRecord, duplicateRecord;

              // Check if either record is from Compass
              const recordIsCompass = record.source === "compass";
              const existingIsCompass = existingRecord.source === "compass";

              if (existingIsCompass && !recordIsCompass) {
                // Existing record is from Compass, current record is not - keep Compass as master
                masterRecord = existingRecord;
                duplicateRecord = record;
              } else if (!existingIsCompass && recordIsCompass) {
                // Current record is from Compass, existing record is not - make Compass the master
                masterRecord = record;
                duplicateRecord = existingRecord;
                // Update the seen map to point to the new master
                for (const key of keys) {
                  seen.set(key, record);
                }
              } else {
                // Both are from same source or neither is from Compass - keep existing as master
                masterRecord = existingRecord;
                duplicateRecord = record;
              }

              // Add the duplicate tag to the duplicate record
              if (!duplicateRecord["Tags"]) {
                duplicateRecord["Tags"] = "CRMDuplicate";
              } else if (
                !duplicateRecord["Tags"].toLowerCase().includes("crmduplicate")
              ) {
                // Before adding duplicate tag, make sure to remove merged tag if it exists
                let tags = duplicateRecord["Tags"]
                  .split(",")
                  .map((t) => t.trim());
                // Remove any merged tag variants
                tags = tags.filter(
                  (tag) =>
                    tag.toLowerCase() !== "merged" &&
                    tag.toLowerCase() !== "crmmerged"
                );
                // Add the duplicate tag
                tags.push("CRMDuplicate");
                duplicateRecord["Tags"] = tags.join(",");
              }

              // Add "CRMMERGED" tag to the master record and REMOVE any CRMDuplicate tag
              if (!masterRecord["Tags"]) {
                masterRecord["Tags"] = "CRMMERGED";
              } else {
                // Remove CRMDuplicate tag if it exists
                let tags = masterRecord["Tags"].split(",").map((t) => t.trim());
                // Remove any duplicate tag variants
                tags = tags.filter(
                  (tag) =>
                    tag.toLowerCase() !== "duplicate" &&
                    tag.toLowerCase() !== "crmduplicate"
                );
                // Add "CRMMERGED" tag if it doesn't exist
                if (
                  !tags.some(
                    (tag) =>
                      tag.toLowerCase() === "merged" ||
                      tag.toLowerCase() === "crmmerged"
                  )
                ) {
                  tags.push("CRMMERGED");
                }
                masterRecord["Tags"] = tags.join(",");
              }

              // Note which record this is a duplicate of
              const originalName = `${masterRecord["First Name"] || ""} ${
                masterRecord["Last Name"] || ""
              }`.trim();
              duplicateRecord.changes.push(
                `Marked as duplicate of ${originalName} (${matchType} match)`
              );

              // Add a note to the master record about the merge
              masterRecord.changes = masterRecord.changes || [];
              masterRecord.changes.push(
                `Merged with duplicate record: ${
                  duplicateRecord["First Name"] || ""
                } ${duplicateRecord["Last Name"] || ""} (${matchType} match)`
              );

              // Merge data for completeness
              this.mergeContactData(masterRecord, duplicateRecord);

              duplicateCount++;
              if (matchType.includes("name")) fuzzyMatches++;

              // Keep duplicates in result
              result.push(record);
            } else {
              // No match - add as unique
              for (const key of keys) {
                seen.set(key, record);
              }
              result.push(record);
            }
          }

          // Chunk processing complete
          if (onLog && chunkNum % 5 === 0) {
            onLog(
              `[DEDUP] Processed chunk ${chunkNum}/${totalChunks}, found ${duplicateCount} duplicates so far`
            );
          }

          resolve();
        }, 0); // yield to browser UI
      });
    };

    // Process all chunks sequentially
    const processAllChunks = async () => {
      try {
        for (
          let i = 0, chunkNum = 1;
          i < data.length;
          i += chunkSize, chunkNum++
        ) {
          await processChunk(i, chunkNum);
        }

        // Cleanup and return result
        document.body.removeChild(progressDiv);

        console.log(
          `[DEDUP] ${source}: Tagged ${duplicateCount} duplicates, total records: ${result.length}`
        );
        console.log(
          `[DEDUP] Enhanced matches found in chunked processing: ${fuzzyMatches}`
        );

        if (onLog) {
          onLog(
            `[DEDUP] ${source}: Tagged ${duplicateCount} duplicates as "CRMDuplicate", total records: ${result.length}`
          );
          onLog(`[DEDUP] Enhanced matches: ${fuzzyMatches}`);
        }

        return result;
      } catch (error) {
        console.error("[DEDUP] Error in chunked deduplication:", error);
        if (onLog)
          onLog(`[DEDUP] Error in chunked processing: ${error.message}`);

        // Clean up UI even if there's an error
        try {
          if (document.body.contains(progressDiv)) {
            document.body.removeChild(progressDiv);
          }
        } catch (cleanupError) {
          console.error("Error cleaning up progress UI:", cleanupError);
        }

        // Return original data if there's an error
        return data;
      }
    };

    // Start processing
    return processAllChunks();
  }

  // Normalize names for matching
  normalizeName(firstName, lastName) {
    const first = (firstName || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " "); // Replace multiple spaces with single space
    const last = (lastName || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " "); // Replace multiple spaces with single space

    // Handle cases like "Werner H" where last name is just an initial
    const normalizedName = `${first} ${last}`.trim();

    // If the result is just initials or very short, include more context
    if (normalizedName.length <= 3) {
      return normalizedName;
    }

    return normalizedName;
  }

  // Enhanced fuzzy matching for multi-file processing with optimization
  findNameMatch(targetName, searchData, threshold = 0.03) {
    if (!targetName || !searchData.length) return null;

    // Get the target contact details for enhanced matching
    const targetContact = searchData.find(
      (item) => item.normalizedName === targetName
    );
    if (!targetContact) {
      // Fallback to original Fuse.js matching for edge cases
      const fuse = new Fuse(searchData, {
        keys: ["normalizedName"],
        threshold: threshold,
        includeScore: true,
        ignoreLocation: true,
        findAllMatches: false,
        distance: 30,
        minMatchCharLength: 3,
      });

      const results = fuse.search(targetName);
      return results.length > 0 && results[0].score <= threshold
        ? results[0]
        : null;
    }

    // Use enhanced matching similar to single-file deduplication
    const targetEmails = this.getAllEmails(targetContact).map((e) =>
      this.normalizeEmail(e)
    );
    const targetPhones = this.getAllPhoneNumbers(targetContact);
    const targetNormalizedName = this.normalizeName(
      targetContact["First Name"] || "",
      targetContact["Last Name"] || ""
    );

    // Search through all contacts for matches using multiple strategies
    for (const contact of searchData) {
      if (contact === targetContact) continue; // Skip self

      const contactEmails = this.getAllEmails(contact).map((e) =>
        this.normalizeEmail(e)
      );
      const contactPhones = this.getAllPhoneNumbers(contact);
      const contactNormalizedName = this.normalizeName(
        contact["First Name"] || "",
        contact["Last Name"] || ""
      );

      // Check for exact email matches
      const emailMatch = targetEmails.some((e1) =>
        contactEmails.some((e2) => e1 === e2 && e1.length > 0)
      );

      // Check for exact phone matches
      const phoneMatch = targetPhones.some((p1) =>
        contactPhones.some((p2) => p1 === p2 && p1.length >= 10)
      );

      // Check for name similarity using Fuse.js
      const fuse = new Fuse([{ name: contactNormalizedName }], {
        keys: ["name"],
        threshold: 0.3,
        includeScore: true,
      });

      const nameResult = fuse.search(targetNormalizedName);
      const nameSimilarity =
        nameResult.length > 0 ? 1 - nameResult[0].score : 0;

      // Determine if this is a match using same logic as single-file
      let isMatch = false;
      let matchScore = 0;

      // Check for completely different names to prevent merging unrelated contacts
      const targetFirstName = (targetContact["First Name"] || "")
        .toLowerCase()
        .trim();
      const targetLastName = (targetContact["Last Name"] || "")
        .toLowerCase()
        .trim();
      const contactFirstName = (contact["First Name"] || "")
        .toLowerCase()
        .trim();
      const contactLastName = (contact["Last Name"] || "").toLowerCase().trim();

      // Simple rule: If first names are different, don't merge - regardless of last name
      const isDifferentName =
        targetFirstName &&
        contactFirstName &&
        targetFirstName !== contactFirstName;

      if (isDifferentName) {
        // Don't match records with different first names
        isMatch = false;

        // Check if they might be family members (same last name, shared contact info)
        if (
          targetLastName &&
          contactLastName &&
          targetLastName === contactLastName &&
          (emailMatch || phoneMatch)
        ) {
          // These are likely family members - track this relationship but don't merge
          if (!contact.changes) contact.changes = [];
          contact.changes.push(
            `Potential family member of ${targetFirstName} ${targetLastName} (shared contact info)`
          );
        }
      } else if (emailMatch && nameSimilarity > 0.6) {
        isMatch = true;
        matchScore = 0.95; // High confidence - email + name match
      } else if (phoneMatch && nameSimilarity > 0.6) {
        isMatch = true;
        matchScore = 0.9; // Good confidence - phone + name match
      }
      // Name-only matching has been removed to improve accuracy

      if (isMatch && matchScore >= 1 - threshold) {
        return {
          item: contact,
          score: 1 - matchScore, // Convert back to Fuse.js score format (lower is better)
          refIndex: searchData.indexOf(contact),
        };
      }
    }

    return null; // No match found
  }

  // Sleep function to yield control back to the browser
  sleep(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Chunked processing for large datasets (Python-style: merge first, then deduplicate)
  async mergeAndClassifyChunked(onProgress = null, onLog = null) {
    console.log("Starting merge and classification...");
    if (onLog) onLog("Starting merge and classification...");

    // Start with Compass data or create empty array
    let workingData = this.compassData.length > 0 ? [...this.compassData] : [];

    // Add normalized names for matching
    const compassWithNames = workingData.map((row, index) => ({
      ...row,
      normalizedName: this.normalizeName(row["First Name"], row["Last Name"]),
      originalIndex: index,
      changes: [],
      source: "compass",
    }));

    // If there are no Phone contacts, just process the Compass data
    if (this.phoneData.length === 0) {
      console.log("No phone data provided, processing only Compass data");
      if (onLog) onLog("No phone data provided, processing only Compass data");
      workingData = compassWithNames;
    }
    // If no Compass data but we have Phone data, use Phone data as the source
    else if (compassWithNames.length === 0 && this.phoneData.length > 0) {
      const phoneWithNames = this.phoneData.map((row, index) => ({
        ...row,
        normalizedName: this.normalizeName(row["First Name"], row["Last Name"]),
        originalIndex: index,
        changes: ["Contact added from phone data"],
        source: "phone-only",
      }));
      workingData = phoneWithNames;
      console.log(
        "No Compass data provided, using phone data as primary source"
      );
      if (onLog)
        onLog("No Compass data provided, using phone data as primary source");
    }
    // If we have both Compass and Phone data, update Compass contacts with phone numbers
    else {
      // First deduplicate the Compass data
      if (onLog) onLog("Deduplicating Compass data first...");
      console.log("Deduplicating Compass data first...");

      // Now prepare the phone data for matching
      const phoneWithNames = this.phoneData.map((row, index) => ({
        ...row,
        normalizedName: this.normalizeName(row["First Name"], row["Last Name"]),
        originalIndex: index,
        source: "phone",
      }));

      console.log(
        "Using optimized matching for adding phone numbers to Compass contacts"
      );
      if (onLog)
        onLog(
          "Using optimized matching for adding phone numbers to Compass contacts"
        );

      // First, identify Compass contacts that need phone numbers
      const compassContactsMissingPhones = compassWithNames.filter(
        (contact) => {
          return this.getAllPhoneNumbers(contact).length === 0;
        }
      );

      console.log(
        `Found ${compassContactsMissingPhones.length} Compass contacts missing phone numbers`
      );
      if (onLog)
        onLog(
          `Found ${compassContactsMissingPhones.length} Compass contacts missing phone numbers`
        );

      // Only proceed with indexing if we have Compass contacts missing phone numbers
      if (compassContactsMissingPhones.length === 0) {
        console.log(
          "No Compass contacts missing phone numbers, skipping phone data processing"
        );
        if (onLog)
          onLog(
            "No Compass contacts missing phone numbers, skipping phone data processing"
          );
        return workingData; // Return early if no work to do
      }

      // Create a set of lookup keys from the Compass contacts that need phone numbers
      const keysToLookFor = new Set();
      const keyToContactMap = new Map();

      // Build lookup keys from Compass contacts needing phone numbers
      for (const compassContact of compassContactsMissingPhones) {
        const firstName = (compassContact["First Name"] || "")
          .toLowerCase()
          .trim();
        const lastName = (compassContact["Last Name"] || "")
          .toLowerCase()
          .trim();

        if (!firstName || !lastName) continue;

        const emails = this.getAllEmails(compassContact).map((e) =>
          this.normalizeEmail(e)
        );

        for (const email of emails) {
          if (email) {
            const key = `${firstName}|${lastName}|${email}`;
            keysToLookFor.add(key);
            keyToContactMap.set(key, compassContact);
          }
        }
      }

      console.log(
        `Created ${keysToLookFor.size} lookup keys from Compass contacts missing phones`
      );
      if (onLog)
        onLog(
          `Created ${keysToLookFor.size} lookup keys from Compass contacts missing phones`
        );

      // If no valid keys were created, exit early
      if (keysToLookFor.size === 0) {
        console.log(
          "No valid lookup keys created, skipping phone data processing"
        );
        if (onLog)
          onLog("No valid lookup keys created, skipping phone data processing");
        return workingData;
      }

      // Now only process Phone contacts that might match our needed keys
      let contactsUpdated = 0;
      let phoneContactsChecked = 0;

      // Process phone contacts in chunks to maintain responsiveness
      const chunkSize = 500;

      // Process Phone contacts in chunks
      for (let i = 0; i < phoneWithNames.length; i += chunkSize) {
        const chunk = phoneWithNames.slice(i, i + chunkSize);
        let chunkUpdates = 0;

        for (const phoneContact of chunk) {
          phoneContactsChecked++;

          // Only process phone contacts that have phone numbers
          const phoneNumbers = this.getAllPhoneNumbers(phoneContact);
          if (phoneNumbers.length === 0) continue;

          const phoneFirstName = (phoneContact["First Name"] || "")
            .toLowerCase()
            .trim();
          const phoneLastName = (phoneContact["Last Name"] || "")
            .toLowerCase()
            .trim();

          // Skip if no name
          if (!phoneFirstName || !phoneLastName) continue;

          // Get emails
          const phoneEmails = this.getAllEmails(phoneContact).map((e) =>
            this.normalizeEmail(e)
          );

          // Check if this phone contact matches any of our lookup keys
          for (const email of phoneEmails) {
            if (!email) continue;

            const key = `${phoneFirstName}|${phoneLastName}|${email}`;

            // Check if this is one of the keys we're looking for
            if (keysToLookFor.has(key)) {
              // Get the corresponding Compass contact
              const compassContact = keyToContactMap.get(key);

              // Add the phone number to the Compass contact
              if (phoneNumbers.length > 0) {
                const phoneNumber = phoneNumbers[0];

                // Find first empty phone field
                const phoneFields = [
                  "Mobile Phone",
                  "Home Phone",
                  "Work Phone",
                  "Phone",
                  "Primary Mobile Phone",
                  "Primary Home Phone",
                ];

                for (const field of phoneFields) {
                  if (!compassContact[field]) {
                    compassContact[field] = phoneNumber;
                    // Initialize changes array if needed
                    compassContact.changes = compassContact.changes || [];
                    compassContact.changes.push(
                      `Added phone number from phone data: ${phoneNumber}`
                    );

                    // Use "Changes Made" field instead of a tag
                    compassContact["Changes Made"] =
                      "Got phone # from Phone export";

                    contactsUpdated++;
                    this.phonesAddedCount++; // Increment phone numbers added counter
                    chunkUpdates++;

                    // Remove this key from the set so we don't process it again
                    keysToLookFor.delete(key);
                    break;
                  }
                }
              }

              // Break out of email loop since we found a match
              break;
            }
          }
        }

        // Update progress and yield control
        if (onProgress) {
          const progress = Math.round((i / phoneWithNames.length) * 30) + 30; // 30-60% range
          onProgress({
            step: 3,
            totalSteps: 6,
            progress: progress,
            message: `Adding phone numbers... Checked ${phoneContactsChecked}/${phoneWithNames.length} phone contacts (${contactsUpdated} updates)`,
          });
        }

        if (onLog) {
          onLog(
            `Updated ${chunkUpdates} contacts in chunk ${
              Math.floor(i / chunkSize) + 1
            }`
          );
        }

        // If we've matched all the keys we're looking for, we can stop processing
        if (keysToLookFor.size === 0) {
          console.log(
            "All Compass contacts have been updated with phone numbers. Stopping phone processing early."
          );
          if (onLog)
            onLog(
              "All Compass contacts have been updated with phone numbers. Stopping phone processing early."
            );
          break;
        }

        // Yield control back to browser every chunk
        await this.sleep(1);
      }

      console.log(
        `Updated ${contactsUpdated} Compass contacts with phone numbers from phone data (checked ${phoneContactsChecked} of ${phoneWithNames.length} phone contacts)`
      );
      if (onLog)
        onLog(
          `Updated ${contactsUpdated} Compass contacts with phone numbers from phone data (checked ${phoneContactsChecked} of ${phoneWithNames.length} phone contacts)`
        );

      if (keysToLookFor.size > 0) {
        console.log(
          `${keysToLookFor.size} Compass contacts still missing phone numbers after processing all phone data`
        );
        if (onLog)
          onLog(
            `${keysToLookFor.size} Compass contacts still missing phone numbers after processing all phone data`
          );

        // Now implement name-based matching (for contacts that could use more phone numbers)
        console.log("Starting name-based phone number matching...");
        if (onLog) onLog("Starting name-based phone number matching...");

        // We'll match to contacts with 0-1 phone numbers to ensure better coverage
        const contactsNeedingMorePhones = compassWithNames.filter((contact) => {
          const phoneCount = this.getAllPhoneNumbers(contact).length;
          return phoneCount < 2; // Match to contacts with 0 or 1 phone numbers
        });

        console.log(
          `Found ${contactsNeedingMorePhones.length} contacts with 0-1 phone numbers that could use more`
        );
        if (onLog)
          onLog(
            `Found ${contactsNeedingMorePhones.length} contacts with 0-1 phone numbers that could use more`
          );

        // Create maps for exact name matching only
        const exactNameToContactMap = new Map();
        let duplicateNameCount = 0;

        // First pass: Build maps for different matching strategies
        for (const compassContact of contactsNeedingMorePhones) {
          const firstName = (compassContact["First Name"] || "")
            .toLowerCase()
            .trim();
          const lastName = (compassContact["Last Name"] || "")
            .toLowerCase()
            .trim();

          if (!firstName && !lastName) continue;

          // Create exact name key
          if (firstName && lastName) {
            const exactNameKey = `${firstName}|${lastName}`;

            // Store ALL contacts with the same name in an array
            if (exactNameToContactMap.has(exactNameKey)) {
              const contacts = exactNameToContactMap.get(exactNameKey);
              contacts.push(compassContact);
              duplicateNameCount++;
            } else {
              exactNameToContactMap.set(exactNameKey, [compassContact]);
            }
          }
        }

        console.log(
          `Found ${duplicateNameCount} duplicate names in Compass contacts`
        );
        if (onLog)
          onLog(
            `Found ${duplicateNameCount} duplicate names in Compass contacts`
          );

        // Create maps for phone contacts as well
        const exactPhoneNameMap = new Map();
        let phoneNameDuplicates = 0;

        // First pass: Build maps for phone contacts
        for (const phoneContact of phoneWithNames) {
          // Only consider phone contacts that have phone numbers
          const phoneNumbers = this.getAllPhoneNumbers(phoneContact);
          if (phoneNumbers.length === 0) continue;

          const firstName = (phoneContact["First Name"] || "")
            .toLowerCase()
            .trim();
          const lastName = (phoneContact["Last Name"] || "")
            .toLowerCase()
            .trim();

          if (!firstName && !lastName) continue;

          // Create exact name key
          if (firstName && lastName) {
            const exactNameKey = `${firstName}|${lastName}`;

            // Store ALL phone contacts with the same name in an array
            if (exactPhoneNameMap.has(exactNameKey)) {
              const contacts = exactPhoneNameMap.get(exactNameKey);
              contacts.push(phoneContact);
              phoneNameDuplicates++;
            } else {
              exactPhoneNameMap.set(exactNameKey, [phoneContact]);
            }
          }
        }

        console.log(
          `Found ${phoneNameDuplicates} duplicate names in Phone contacts`
        );
        if (onLog)
          onLog(
            `Found ${phoneNameDuplicates} duplicate names in Phone contacts`
          );

        // Now match names using exact matching only
        let exactNameMatches = 0;
        let totalPhonesAdded = 0;

        // Try exact name matches
        console.log("Performing exact name matches...");
        for (const [
          nameKey,
          compassContacts,
        ] of exactNameToContactMap.entries()) {
          // Skip if this name has no compass contacts
          if (compassContacts === null || compassContacts.length === 0)
            continue;

          // Check if this name exists in Phone data
          if (exactPhoneNameMap.has(nameKey)) {
            const phoneContacts = exactPhoneNameMap.get(nameKey);

            // Skip if no phone contacts found
            if (phoneContacts === null || phoneContacts.length === 0) continue;

            // Get all phone numbers from all phone contacts with this name
            const allPhoneNumbers = new Set();
            for (const phoneContact of phoneContacts) {
              const phoneNumbers = this.getAllPhoneNumbers(phoneContact);
              for (const num of phoneNumbers) {
                allPhoneNumbers.add(num);
              }
            }

            if (allPhoneNumbers.size > 0) {
              console.log(
                `Found ${allPhoneNumbers.size} phone numbers for exact match: ${nameKey}`
              );
              exactNameMatches++;

              // Process each Compass contact with this name
              for (const compassContact of compassContacts) {
                // Get existing phones to avoid duplicates
                const existingPhones = this.getAllPhoneNumbers(compassContact);

                // Skip if this contact already has enough phone numbers
                if (existingPhones.length >= 3) {
                  console.log(
                    `Skipping contact ${compassContact["First Name"]} ${compassContact["Last Name"]} - already has ${existingPhones.length} phones`
                  );
                  continue;
                }

                // Find empty phone fields and add phone numbers
                const phoneFields = [
                  "Mobile Phone",
                  "Home Phone",
                  "Work Phone",
                  "Phone",
                  "Primary Mobile Phone",
                  "Primary Home Phone",
                  "Mobile Phone 2",
                  "Home Phone 2",
                  "Work Phone 2",
                ];

                let phonesAdded = 0;
                // Try to add each unique phone number
                for (const phoneNumber of allPhoneNumbers) {
                  // Skip if this phone already exists in the contact
                  if (existingPhones.includes(phoneNumber)) continue;

                  // Find an empty field
                  let phoneAdded = false;
                  for (const field of phoneFields) {
                    if (!compassContact[field]) {
                      compassContact[field] = phoneNumber;
                      // Initialize changes array if needed
                      compassContact.changes = compassContact.changes || [];
                      compassContact.changes.push(
                        `Added phone number from phone data via exact name match: ${phoneNumber}`
                      );

                      // Use "Changes Made" field
                      compassContact["Changes Made"] = compassContact[
                        "Changes Made"
                      ]
                        ? compassContact["Changes Made"] +
                          "; Got phone # from Phone export (exact name match)"
                        : "Got phone # from Phone export (exact name match)";

                      phonesAdded++;
                      totalPhonesAdded++;
                      this.phonesAddedCount++; // Increment phone numbers added counter
                      console.log(
                        `Added phone ${phoneNumber} to contact ${compassContact["First Name"]} ${compassContact["Last Name"]} in field ${field}`
                      );
                      phoneAdded = true;
                      break;
                    }
                  }

                  // If we couldn't find an empty field, stop trying with this contact
                  if (!phoneAdded) {
                    console.log(
                      `Could not find empty phone field for ${compassContact["First Name"]} ${compassContact["Last Name"]}`
                    );
                    break;
                  }

                  // Stop after adding up to 3 phone numbers
                  if (phonesAdded >= 3) break;
                }
              }
            }
          }
        }

        console.log(
          `Added ${totalPhonesAdded} phone numbers via exact name matching`
        );
        if (onLog)
          onLog(
            `Added ${totalPhonesAdded} phone numbers via exact name matching`
          );
        console.log(`Found ${exactNameMatches} exact name matches`);
        if (onLog) onLog(`Found ${exactNameMatches} exact name matches`);

        console.log("Name-based phone matching complete.");
        if (onLog) onLog("Name-based phone matching complete.");
      }

      // We don't add any Phone contacts to the workingData
      // Only Compass contacts will be processed further
      workingData = compassWithNames;
    }

    // NOW deduplicate the workingData
    if (onProgress) {
      onProgress({
        step: 4,
        totalSteps: 6,
        progress: 90,
        message: "Identifying and tagging duplicates...",
      });
    }
    if (onLog) onLog("Starting duplicate detection in data...");

    // Find and tag duplicates in the data
    const dedupResult = this.deduplicateData(workingData, "compass", onLog);

    // Make sure we have an array (defensive programming)
    if (Array.isArray(dedupResult)) {
      workingData = dedupResult;
    } else {
      console.error(
        "[ERROR] Deduplication did not return an array:",
        dedupResult
      );
      if (onLog)
        onLog("[ERROR] Deduplication failed - continuing with original data");
      // Keep the original data if deduplication failed
    }

    if (onLog)
      onLog(
        `Duplicate detection complete. Total records: ${workingData.length} records`
      );

    // Classify and assign groups in chunks
    const classificationChunkSize = 50;

    for (let i = 0; i < workingData.length; i += classificationChunkSize) {
      const chunk = workingData.slice(i, i + classificationChunkSize);

      for (const contact of chunk) {
        this.classifyAndAssignGroups(contact);
      }

      // Update progress and yield control
      if (onProgress) {
        const progress = 90 + Math.round((i / workingData.length) * 10); // 90-100% range
        onProgress({
          step: 5,
          totalSteps: 6,
          progress: progress,
          message: `Classifying contacts... ${i + chunk.length}/${
            workingData.length
          }`,
        });
      }

      // Yield control back to browser every chunk
      await this.sleep(1);
    }

    this.stats.totalRecords = workingData.length;

    // Add safety check to prevent errors if workingData is not an array
    if (Array.isArray(workingData)) {
      this.stats.changedRecords = workingData.filter(
        (c) => c.changes && c.changes.length > 0
      ).length;
    } else {
      console.error(
        "[ERROR] workingData is not an array in mergeAndClassifyChunked:",
        workingData
      );
      this.stats.changedRecords = 0;
    }

    this.processedData = workingData;
    console.log("Processing complete:", this.stats);

    return workingData;
  }

  // Extract email domain
  getEmailDomain(email) {
    if (!email || typeof email !== "string") return "";
    const match = email.toLowerCase().match(/@([\w.-]+)$/);
    return match ? match[1] : "";
  }

  // Check if all emails are from personal email providers
  hasOnlyPersonalEmailDomains(emails) {
    if (!emails || emails.length === 0) return false;

    // List of common personal email domains
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "aol.com",
      "icloud.com",
      "mail.com",
      "zoho.com",
      "protonmail.com",
      "msn.com",
      "live.com",
      "comcast.net",
      "verizon.net",
      "att.net",
      "sbcglobal.net",
      "gmx.com",
      "me.com",
      "ymail.com",
      "mac.com",
      "cox.net",
      "charter.net",
    ];

    // Check each email domain
    for (const email of emails) {
      const domain = this.getEmailDomain(email);
      if (!domain) continue;

      // If any email is not from a personal domain, return false
      const isPersonalDomain = personalDomains.some(
        (pd) => domain === pd || domain.endsWith("." + pd)
      );

      if (!isPersonalDomain) {
        return false;
      }
    }

    // All emails are from personal domains
    return emails.length > 0;
  }

  // Get all phone numbers from a contact (updated to match Compass fields and phone export formats)
  getAllPhoneNumbers(contact) {
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
      .map((phone) => this.normalizePhoneNumber(phone)) // Use normalizePhoneNumber helper
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
        const cleanedPhone = this.normalizePhoneNumber(contact[key]);
        if (cleanedPhone && cleanedPhone.length >= 10) {
          phoneExportNumbers.push(cleanedPhone);
        }
      }
    }

    // Combine both types of phone numbers and remove duplicates
    const allPhones = [...standardPhoneNumbers, ...phoneExportNumbers];
    const uniquePhones = [...new Set(allPhones)];

    return uniquePhones;
  }

  // Helper method to normalize phone numbers consistently
  normalizePhoneNumber(phone) {
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
  }

  // Get all emails from a contact (updated to match Compass fields)
  getAllEmails(contact) {
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
        // Skip fields we've already checked or non-string values
        if (emailFields.includes(key) || !value || typeof value !== "string") {
          continue;
        }

        // Look for strings that contain @ and look like emails
        const valueStr = value.toString().toLowerCase();
        if (valueStr.includes("@") && /\S+@\S+\.\S+/.test(valueStr)) {
          // It might be an email address - extract it
          // This handles cases where emails might be in Notes or other free-text fields
          const emailMatches = valueStr.match(/\S+@\S+\.\S+/g);
          if (emailMatches) {
            emails.push(...emailMatches);
          }
        }
      }
    }

    // Return unique emails only
    return [...new Set(emails)];
  }

  // Classify contact type based on email domains, company, name, job title and other fields
  classifyContact(emails, contact = null) {
    if (!emails || emails.length === 0) return "Contact";

    // Debug check for chartwell, escrow or title in any field if we have contact data
    if (contact) {
      // Check for chartwell, escrow or title in any field
      for (const [key, value] of Object.entries(contact)) {
        if (!value || typeof value !== "string") continue;

        const valueStr = value.toString().toLowerCase();
        if (
          valueStr.includes("chartwell") ||
          valueStr.includes("escrow") ||
          valueStr.includes("title company") ||
          valueStr.includes("krislaw")
        ) {
          console.log(
            `DEBUG: Found vendor keyword in field ${key}: ${valueStr}`
          );
          // If we have a direct match in any field, this is likely a vendor
          // But we'll continue with regular classification to get confidence scores
        }
      }
    }

    // Track classification confidence level
    let agentConfidence = 0;
    let vendorConfidence = 0;

    const domains = emails
      .map((email) => this.getEmailDomain(email))
      .filter(Boolean);

    // Special case direct matches for known vendor emails
    for (const email of emails) {
      const lowerEmail = email.toLowerCase();

      // Immediate classification for specific known vendor emails
      if (
        lowerEmail.includes("@chartwellescrow.com") ||
        lowerEmail.includes("@krislaw") ||
        lowerEmail.includes("@modustitle.com") ||
        lowerEmail.includes("escrow") ||
        lowerEmail.includes("title") ||
        lowerEmail.includes("@chartwell") || // More flexible matching for chartwell
        lowerEmail.includes("@modus") || // More flexible matching for modus
        lowerEmail.includes("@escrow") || // Direct escrow domain
        lowerEmail.includes("law.com") // Law domains
      ) {
        console.log(`Direct vendor match found for email: ${lowerEmail}`);
        return "Vendor"; // Immediately classify as vendor without further checks
      }

      // Direct classification for obvious agent keywords in email username (before the @)
      if (
        lowerEmail.includes("realtor") ||
        lowerEmail.includes("realestate") ||
        lowerEmail.includes("homesales") ||
        (lowerEmail.includes("agent") && !lowerEmail.includes("mortgage")) ||
        (lowerEmail.includes("broker") && !lowerEmail.includes("mortgage"))
      ) {
        console.log(`Direct agent keyword match in email: ${lowerEmail}`);
        return "Agent"; // Immediately classify as agent without further checks
      }
    }

    // Check for real estate agent email patterns in full email addresses
    for (const email of emails) {
      const lowerEmail = email.toLowerCase();

      // Enhanced matching for agent-specific patterns using the AGENT_KEYWORDS
      let hasAgentKeyword = false;
      for (const keyword of AGENT_KEYWORDS) {
        // More aggressive checking for variations and partial matches
        if (lowerEmail.includes(keyword)) {
          hasAgentKeyword = true;
          break;
        }
      }

      if (hasAgentKeyword) {
        agentConfidence += 45; // Increased from 30 to 45 for stronger signal
      }

      // Look for vendor-specific patterns in email address
      let hasVendorKeyword = false;
      for (const keyword of VENDOR_KEYWORDS) {
        if (lowerEmail.includes(keyword)) {
          hasVendorKeyword = true;
          break;
        }
      }

      if (hasVendorKeyword) {
        vendorConfidence += 30; // Strong signal
      }
    }

    // Check for real estate agent by email domain
    for (const domain of domains) {
      // Check if domain is in our explicit brokerage domains list
      if (BROKERAGE_DOMAINS.has(domain)) {
        agentConfidence += 50; // Very strong signal
      }
      // Check if domain contains any agent keywords
      else {
        // More aggressive keyword matching for domains
        for (const keyword of AGENT_KEYWORDS) {
          if (domain.includes(keyword)) {
            agentConfidence += 45; // Increased from 40 to 45 for stronger signal
            break;
          }
        }

        // Special case for Compass agents using Gmail or other generic domains
        if (
          (domain === "gmail.com" ||
            domain === "icloud.com" ||
            domain === "yahoo.com") &&
          contact &&
          ((contact["Company"] || "").toLowerCase().includes("compass") ||
            (contact["Company"] || "").toLowerCase().includes("realty") ||
            (contact["Company"] || "").toLowerCase().includes("real estate") ||
            (contact["Title"] || "").toLowerCase().includes("agent") ||
            (contact["Title"] || "").toLowerCase().includes("realtor"))
        ) {
          agentConfidence += 45; // Increased from 40 to 45 for stronger signal
        }
      }

      // Check for vendor by email domain - use a more thorough approach
      let hasVendorDomainKeyword = false;
      for (const keyword of VENDOR_KEYWORDS) {
        if (domain.includes(keyword)) {
          hasVendorDomainKeyword = true;
          vendorConfidence += 40; // Strong signal
          break;
        }
      }

      // Check for specific vendor domains we know about
      const knownVendorDomains = [
        "modustitle.com",
        "chartwellescrow.com",
        "krisslawatlantic.com",
        "escrow.com",
        "chartwell.com",
        "modus.com",
        "titlecompany.com",
        "escrowservice.com",
        "titleservice.com",
        "lawfirm.com",
        "krislaw.com",
      ];

      if (knownVendorDomains.includes(domain)) {
        vendorConfidence += 50; // Very strong signal for known vendor domains
      }
    }

    // Additional checks for real estate companies/agents if contact data is provided
    if (contact) {
      const companyName = (contact["Company"] || "").toLowerCase();
      const jobTitle = (
        contact["Title"] ||
        contact["Job Title"] ||
        ""
      ).toLowerCase();
      const tags = (contact["Tags"] || "").toLowerCase();
      const groups = (
        contact["Groups"] ||
        contact["Group"] ||
        ""
      ).toLowerCase();
      const notes = (contact["Notes"] || contact["Note"] || "").toLowerCase();
      const keyInfo = (contact["Key Background Info"] || "").toLowerCase();

      // Check existing tags for agent or vendor indicators
      if (tags.includes("agent")) {
        agentConfidence += 40; // Strong signal from existing tags
      }

      if (tags.includes("vendor")) {
        vendorConfidence += 40; // Strong signal from existing tags
      }

      // Check existing groups for agent or vendor indicators
      if (groups.includes("agent")) {
        agentConfidence += 40; // Strong signal from existing groups
      }

      if (groups.includes("vendor")) {
        vendorConfidence += 40; // Strong signal from existing groups
      }

      // Check if this is a real estate company/agent by company name
      if (
        // Real estate company name patterns
        companyName.includes("realty") ||
        companyName.includes("real estate") ||
        companyName.includes("sotheby") ||
        companyName.includes("coldwell banker") ||
        companyName.includes("keller williams") ||
        companyName.includes("century 21") ||
        companyName.includes("berkshire hathaway") ||
        companyName.includes("re/max") ||
        companyName.includes("remax") ||
        companyName.includes("douglas elliman") ||
        companyName.includes("compass") ||
        companyName.includes("corcoran") ||
        companyName.includes("exp realty") ||
        companyName.includes("weichert") ||
        companyName.includes("better homes") ||
        companyName.includes("christie") ||
        companyName.includes("vanguard properties") ||
        companyName.includes("redfin") ||
        companyName.includes("zillow") ||
        companyName.includes("trulia") ||
        companyName.includes("flow realty") || // Added for Alexandra Hung's company
        // Check for common real estate company patterns
        /\brealty\b/i.test(companyName) ||
        /\brealtors\b/i.test(companyName) ||
        /\brealtor\b/i.test(companyName) ||
        /\bproperties\b/i.test(companyName) ||
        /\bhomes\b/i.test(companyName) ||
        /\breal estate\b/i.test(companyName) ||
        /\bbroker\b/i.test(companyName) ||
        // These common brokerage indicators in company name
        /\bsir\b/i.test(companyName) || // Sotheby's International Realty abbreviation
        /\bre\/max\b/i.test(companyName) ||
        /\bkw\b/i.test(companyName) || // Keller Williams abbreviation
        /\bbhhs\b/i.test(companyName) // Berkshire Hathaway HomeServices abbreviation
      ) {
        agentConfidence += 40; // Strong signal
      }

      // Check job title for real estate agent indicators
      if (
        jobTitle.includes("real estate agent") ||
        jobTitle.includes("realtor") ||
        jobTitle.includes("broker") ||
        jobTitle.includes("real estate") ||
        jobTitle.includes("property manager") ||
        (jobTitle.includes("sales associate") &&
          (companyName.includes("real estate") ||
            companyName.includes("realty") ||
            companyName.includes("properties"))) ||
        (jobTitle.includes("agent") &&
          (companyName.includes("real estate") ||
            companyName.includes("realty") ||
            companyName.includes("properties")))
      ) {
        agentConfidence += 40; // Strong signal
      }

      // Check notes and key info for real estate agent signals
      if (
        notes.includes("realtor") ||
        keyInfo.includes("realtor") ||
        notes.includes("real estate agent") ||
        keyInfo.includes("real estate agent") ||
        (notes.includes("broker") &&
          !notes.includes("mortgage broker") &&
          !keyInfo.includes("mortgage broker"))
      ) {
        agentConfidence += 20; // Moderate signal
      }

      // Special job title checks for specific vendor roles
      if (
        jobTitle.includes("escrow") ||
        jobTitle.includes("title officer") ||
        jobTitle.includes("attorney") ||
        jobTitle.includes("lawyer") ||
        companyName.includes("escrow") ||
        companyName.includes("title") ||
        companyName.includes("law")
      ) {
        vendorConfidence += 50; // Very strong signal for specific vendor job titles
        console.log(
          `Found vendor job title: ${jobTitle} or company: ${companyName}`
        );
      }

      // Don't classify past clients as vendors or agents
      const existingGroups = contact["Groups"] || contact["Group"] || "";
      const isPastClient =
        existingGroups.toLowerCase().includes("past client") ||
        contact["Client Classification"] === "Past Client";

      if (isPastClient) {
        // Past clients get a bonus to stay as Contacts
        vendorConfidence -= 50;
        agentConfidence -= 50; // Also reduce agent confidence for past clients
        console.log(
          `Past client detected: ${contact["First Name"]} ${contact["Last Name"]} - reducing agent and vendor confidence`
        );
      } else {
        // Get all fields that might contain vendor information
        const firstName = (contact["First Name"] || "").toLowerCase();
        const lastName = (contact["Last Name"] || "").toLowerCase();

        // For Phone contacts, sometimes company info is in the Last Name field with the format "LAST NAME - COMPANY"
        let possibleCompanyInLastName = "";
        if (lastName.includes("-")) {
          possibleCompanyInLastName = lastName
            .split("-")[1]
            .trim()
            .toLowerCase();
        }

        // Create a combined text to check for vendor keywords
        const allText =
          `${companyName} ${jobTitle} ${possibleCompanyInLastName} ${notes} ${keyInfo}`.toLowerCase();

        // Check if any vendor keyword exists in the combined text with exact matching
        for (const keyword of VENDOR_KEYWORDS) {
          if (allText.includes(keyword)) {
            // Skip if this is a real estate company containing the word "estate"
            if (
              keyword === "estate" &&
              (allText.includes("real estate") ||
                companyName.includes("real estate") ||
                jobTitle.includes("real estate"))
            ) {
              continue;
            }

            // Skip if this is a real estate company containing the word "realty"
            if (
              keyword === "realty" &&
              (companyName.includes("realty") ||
                companyName.includes("realtor") ||
                jobTitle.includes("realtor"))
            ) {
              continue;
            }

            // Skip if this is a real estate agent or broker
            if (
              (keyword === "agent" || keyword === "broker") &&
              (jobTitle.includes("real estate agent") ||
                jobTitle.includes("real estate broker") ||
                jobTitle.includes("realtor"))
            ) {
              continue;
            }

            // Skip if this contains the word "associates" in a real estate context
            if (
              keyword === "associates" &&
              (companyName.includes("real estate") ||
                companyName.includes("realty") ||
                companyName.includes("properties"))
            ) {
              continue;
            }

            vendorConfidence += 30; // Moderate signal for keyword match
          }
        }

        // Special case handling for specific patterns
        if (
          // Check for company names that sound like businesses but don't have exact keyword matches
          companyName.includes(" inc") ||
          companyName.includes(" llc") ||
          companyName.includes(" corp") ||
          companyName.includes(" co.") ||
          companyName.includes(" company") ||
          companyName.includes(" service") ||
          companyName.includes(" professional") ||
          companyName.includes(" & ") ||
          // Company name has capital letters and is more than one word
          (companyName.length > 0 &&
            companyName !== companyName.toLowerCase() &&
            companyName.includes(" ")) ||
          // Job title indicates professional service provider
          jobTitle.includes("specialist") ||
          jobTitle.includes("manager") ||
          jobTitle.includes("director") ||
          jobTitle.includes("consultant") ||
          jobTitle.includes("professional") ||
          // Look for patterns like "COMPANY - SERVICE" in name fields
          possibleCompanyInLastName.length > 0
        ) {
          // Check for real estate signals first
          if (
            companyName.includes("real estate") ||
            companyName.includes("realty") ||
            companyName.includes("realtor") ||
            companyName.includes("properties") ||
            companyName.includes("homes") ||
            companyName.includes("sotheby") ||
            companyName.includes("coldwell") ||
            jobTitle.includes("real estate") ||
            jobTitle.includes("realtor") ||
            jobTitle.includes("broker")
          ) {
            agentConfidence += 30; // Moderate signal
          } else {
            // Additional check: if we have a potential business, make sure it's not just a person's name
            // Most vendor business names aren't just two simple words like personal names
            if (
              companyName &&
              (companyName.split(" ").length > 2 || // More than 2 words
                companyName.includes("&") || // Contains ampersand
                companyName.includes("-") || // Contains hyphen
                companyName.includes(".") || // Contains period
                /[0-9]/.test(companyName)) // Contains numbers
            ) {
              // Final check to exclude real estate companies
              if (
                !companyName.includes("real estate") &&
                !companyName.includes("realty") &&
                !companyName.includes("properties")
              ) {
                vendorConfidence += 30; // Moderate signal
              }
            }

            // Apply fuzzy matching for vendor keywords using Fuse.js
            // This helps catch misspellings and variations
            const fuse = new Fuse([allText], {
              includeScore: true,
              threshold: 0.4, // Lower threshold means stricter matching
              minMatchCharLength: 4,
            });

            for (const keyword of VENDOR_KEYWORDS) {
              // Skip real estate related keywords for fuzzy matching
              if (
                keyword === "estate" ||
                keyword === "realty" ||
                keyword === "agent" ||
                keyword === "broker" ||
                keyword === "associates"
              ) {
                continue;
              }

              // Only apply fuzzy matching for keywords of sufficient length
              if (keyword.length >= 4) {
                const results = fuse.search(keyword);
                if (results.length > 0 && results[0].score < 0.4) {
                  vendorConfidence += 20; // Moderate signal for fuzzy matches
                }
              }
            }

            // Check if the contact appears to be a business rather than an individual
            if (
              possibleCompanyInLastName.length > 0 ||
              (companyName &&
                companyName.length > 0 &&
                jobTitle &&
                jobTitle.length > 0)
            ) {
              // Skip real estate businesses
              if (
                !companyName.includes("real estate") &&
                !companyName.includes("realty") &&
                !companyName.includes("properties") &&
                !jobTitle.includes("real estate") &&
                !jobTitle.includes("realtor") &&
                !jobTitle.includes("broker")
              ) {
                vendorConfidence += 20; // Moderate signal
              }
            }
          }
        }
      }
    }

    // Make the classification decision based on confidence scores
    // Lower threshold for Agent classification to catch more valid agents
    const AGENT_THRESHOLD = 35; // Reduced from 40 to catch more agents
    const VENDOR_THRESHOLD = 40;

    // FIRST: Check for direct indicators (override confidence scoring)
    // If a contact is already in the "Agents" group, they should be classified as an Agent
    if (
      contact &&
      (contact["Groups"] || contact["Group"] || "")
        .toLowerCase()
        .includes("agent")
    ) {
      return "Agent";
    }

    // SECOND: Check for known agent domains based on email patterns
    if (emails && emails.length > 0) {
      for (const email of emails) {
        const lowerEmail = email.toLowerCase();

        // Direct classification for emails at known real estate brokerages
        if (
          lowerEmail.includes("@compass.com") ||
          lowerEmail.includes("@elliman.com") ||
          lowerEmail.includes("@corcoran.com") ||
          lowerEmail.includes("@bhhs") ||
          lowerEmail.includes("@coldwellbanker") ||
          lowerEmail.includes("@sothebys") ||
          lowerEmail.includes("@sothebysrealty") ||
          lowerEmail.includes("@sir.com") ||
          lowerEmail.includes("@remax.com") ||
          lowerEmail.includes("@century21") ||
          lowerEmail.includes("@c21") ||
          lowerEmail.includes("@kw.com") ||
          lowerEmail.includes("@exprealty") ||
          lowerEmail.includes("@weichert.com") ||
          lowerEmail.includes("@redfin.com") ||
          lowerEmail.includes("@propertyshark") ||
          lowerEmail.includes("@nestseekers") ||
          lowerEmail.includes("@halstead") ||
          lowerEmail.includes("@stribling.com") ||
          lowerEmail.includes("@bondnewyork") ||
          lowerEmail.includes("@exrny.com") // Adding EXR domain that was missed
        ) {
          return "Agent"; // Immediately classify as agent without further checks
        }

        // NEW: Check for obvious agent keywords in email username (before the @)
        if (
          lowerEmail.includes("realtor") ||
          lowerEmail.includes("realestate") ||
          lowerEmail.includes("agent") ||
          lowerEmail.includes("broker")
        ) {
          return "Agent"; // Immediately classify if email username contains agent keywords
        }
      }
    }

    // Check for company name that directly indicates real estate agent
    if (contact) {
      const companyName = (contact["Company"] || "").toLowerCase();
      if (
        companyName === "compass" ||
        companyName === "corcoran" ||
        companyName === "compass " || // Note the space
        companyName === "corcoran group" ||
        companyName === "douglas elliman" ||
        companyName === "berkshire hathaway" ||
        companyName === "keller williams" ||
        companyName === "re/max" ||
        companyName === "remax" ||
        companyName === "sotheby's" ||
        companyName === "sothebys" ||
        companyName === "coldwell banker" ||
        companyName === "century 21" ||
        companyName === "exit realty" ||
        companyName === "exp realty" ||
        companyName === "bond new york" ||
        companyName === "nest seekers" ||
        companyName === "weichert"
      ) {
        return "Agent"; // Direct match on major brokerage names
      }
    }

    // If both agent and vendor have high confidence, go with the higher one
    if (
      agentConfidence >= AGENT_THRESHOLD &&
      vendorConfidence >= VENDOR_THRESHOLD
    ) {
      return agentConfidence > vendorConfidence ? "Agent" : "Vendor";
    }

    // If only one category has high confidence, use that
    if (agentConfidence >= AGENT_THRESHOLD) {
      return "Agent";
    }

    if (vendorConfidence >= VENDOR_THRESHOLD) {
      return "Vendor";
    }

    // If neither category has high confidence, leave as Contact
    return "Contact";
  }

  // Address matching for past clients
  matchAddress(contactAddress, mlsAddresses, threshold = 0.3) {
    if (!contactAddress || !mlsAddresses.length) return null;

    const cleanAddress = contactAddress.toLowerCase().trim();
    if (!cleanAddress) return null;

    const fuse = new Fuse(mlsAddresses, {
      keys: ["Street Address", "address", "Address", "Property Address"],
      threshold: threshold,
      includeScore: true,
      ignoreLocation: true,
    });

    const results = fuse.search(cleanAddress);
    return results.length > 0 && results[0].score <= threshold
      ? results[0].item
      : null;
  }

  // Debug function to specifically look for vendor emails in any field
  addDebugVendorChecks() {
    // Will be called at the start of processing to add special debugging
    this.onLog("Adding special vendor debug checks");

    // We'll add special detection for vendor emails during classification
  }

  // Main processing function with progress tracking
  async processFiles(
    compassFile,
    phoneFile,
    mlsFiles = [],
    onProgress = null,
    onLog = null
  ) {
    try {
      if (onLog) onLog("Starting file processing...");
      console.log("Starting file processing...");
      let currentStep = 0;

      // Calculate total steps dynamically based on what files we have
      let totalSteps = 4 + mlsFiles.length; // Base: merging, deduplication, classifying, complete
      if (compassFile) totalSteps += 1; // parsing only
      if (phoneFile) totalSteps += 1; // parsing only

      const updateProgress = (step, message) => {
        if (onProgress) {
          onProgress({
            step: step,
            totalSteps: totalSteps,
            progress: Math.round((step / totalSteps) * 100),
            message: message,
          });
        }
      };

      // Parse Compass file (if provided) - NO individual deduplication
      if (compassFile) {
        updateProgress(++currentStep, "Parsing Compass file...");
        if (onLog) onLog(`Parsing Compass file: ${compassFile.name}`);
        this.compassData = await this.parseCSVChunked(compassFile, onLog);
        if (onLog) onLog(`Parsed ${this.compassData.length} Compass records`);
        console.log(`Parsed ${this.compassData.length} Compass records`);
      }

      // Parse Phone file (if provided) - NO individual deduplication
      if (phoneFile) {
        updateProgress(++currentStep, "Parsing Phone file...");
        if (onLog) onLog(`Parsing Phone file: ${phoneFile.name}`);
        this.phoneData = await this.parseCSVChunked(phoneFile, onLog);
        if (onLog) onLog(`Parsed ${this.phoneData.length} Phone records`);
        console.log(`Parsed ${this.phoneData.length} Phone records`);
      }

      // Parse MLS files for address extraction (optional)
      for (const file of mlsFiles) {
        updateProgress(++currentStep, `Parsing MLS file: ${file.name}...`);

        const ext = file.name.split(".").pop().toLowerCase();
        let data;

        if (ext === "csv") {
          data = await this.parseCSVChunked(file);
        } else if (["xlsx", "xls"].includes(ext)) {
          data = await this.parseExcel(file);
        }

        if (data) {
          this.mlsAddresses.push(...data);
          console.log(`Parsed ${data.length} MLS records from ${file.name}`);
        }
      }

      updateProgress(++currentStep, "Merging and deduplicating contacts...");

      // Process and merge data with chunking (like Python approach)
      const result = await this.mergeAndClassifyChunked(onProgress, onLog);

      updateProgress(++currentStep, "Processing complete!");

      return result;
    } catch (error) {
      console.error("Error processing files:", error);
      throw error;
    }
  }

  mergeAndClassify() {
    // Legacy method - redirect to chunked version
    return this.mergeAndClassifyChunked();
  }

  mergeContactData(existingContact, duplicateContact) {
    // Initialize changes array for existing contact
    if (!existingContact.changes) existingContact.changes = [];

    // Increment the merged records counter
    this.stats.mergedRecords++;

    // Ensure the master record has a "CRMMERGED" tag but NOT a "CRMDuplicate" tag
    if (!existingContact["Tags"]) {
      existingContact["Tags"] = "CRMMERGED";
    } else {
      // Remove Duplicate tag if it exists (handle both old and new tag formats)
      let tags = existingContact["Tags"].split(",").map((t) => t.trim());
      // Remove any duplicate tag variants
      tags = tags.filter(
        (tag) =>
          tag.toLowerCase() !== "duplicate" &&
          tag.toLowerCase() !== "crmduplicate"
      );
      // Add "CRMMERGED" tag if it doesn't exist (handle both old and new tag formats)
      if (
        !tags.some(
          (tag) =>
            tag.toLowerCase() === "merged" || tag.toLowerCase() === "crmmerged"
        )
      ) {
        tags.push("CRMMERGED");
      }
      existingContact["Tags"] = tags.join(",");
    }

    // Merge emails from duplicate contact
    const existingEmails = this.getAllEmails(existingContact);
    const duplicateEmails = this.getAllEmails(duplicateContact);

    // Add emails that don't exist in the existing contact
    for (const email of duplicateEmails) {
      if (
        !existingEmails.some((ee) => ee.toLowerCase() === email.toLowerCase())
      ) {
        // Find first empty email field in Compass format
        const emailFields = [
          "Personal Email",
          "Email",
          "Work Email",
          "Email 2",
          "Email 3",
          "Primary Personal Email",
          "Custom Email",
        ];
        for (const field of emailFields) {
          if (!existingContact[field]) {
            existingContact[field] = email;
            existingContact.changes.push(`Email->${field}: ${email}`);
            this.emailsAddedCount++; // Increment emails added counter
            break;
          }
        }
      }
    }

    // Merge phones from duplicate contact
    const existingPhones = this.getAllPhoneNumbers(existingContact);
    const duplicatePhones = this.getAllPhoneNumbers(duplicateContact);

    // Add phone numbers that don't exist in existing contact
    for (const phone of duplicatePhones) {
      if (!existingPhones.includes(phone)) {
        // Find first empty phone field in Compass format
        const phoneFields = [
          "Mobile Phone",
          "Home Phone",
          "Work Phone",
          "Phone",
          "Primary Mobile Phone",
          "Primary Home Phone",
          "Home Phone 2",
          "Mobile Phone 2",
          "Work Phone 2",
        ];
        for (const field of phoneFields) {
          if (!existingContact[field]) {
            existingContact[field] = phone;
            existingContact.changes.push(`Phone->${field}: ${phone}`);
            this.phonesAddedCount++; // Increment phone numbers added counter
            console.log(
              `Added phone ${phone} to contact ${existingContact["First Name"]} ${existingContact["Last Name"]} in field ${field} during merge`
            );
            break;
          }
        }
      }
    } // Merge address if existing contact doesn't have one
    this.mergeAddress(existingContact, duplicateContact);

    // Merge other important fields if they're empty in existing contact
    const fieldsToMerge = [
      "Company",
      "Title",
      "Notes",
      "Tags",
      "Groups",
      "Key Background Info",
      "Home Address Line 1",
      "Home Address City",
      "Home Address State",
      "Home Address Zip",
      "Home Anniversary Date",
      "Home Anniversary",
      "Client Classification",
      "Category",
      "Created At",
      "Last Contacted",
      "Team Assigned To",
      "Name",
      // Address fields
      "Primary Custom Address Line 1",
      "Primary Custom Address Line 2",
      "Primary Custom Address City",
      "Primary Custom Address State",
      "Primary Custom Address Zip",
      "Primary Custom Address Country",
      "Primary Home Address Line 1",
      "Primary Home Address Line 2",
      "Primary Home Address City",
      "Primary Home Address State",
      "Primary Home Address Zip",
      "Primary Home Address Country",
      "Work Address Line 1",
      "Work Address Line 2",
      "Work Address City",
      "Work Address State",
      "Work Address Zip",
      "Work Address Country",
    ];

    for (const field of fieldsToMerge) {
      if (!existingContact[field] && duplicateContact[field]) {
        existingContact[field] = duplicateContact[field];
        existingContact.changes.push(
          `Added ${field.toLowerCase()}: ${duplicateContact[field]}`
        );
      }
    }

    // Special handling for Tags and Groups - merge them instead of replacing
    if (existingContact["Tags"] && duplicateContact["Tags"]) {
      const existingTags = existingContact["Tags"]
        .split(",")
        .map((t) => t.trim());
      const newTags = duplicateContact["Tags"].split(",").map((t) => t.trim());
      const mergedTags = [...new Set([...existingTags, ...newTags])];
      if (mergedTags.length > existingTags.length) {
        existingContact["Tags"] = mergedTags.join(",");
        existingContact.changes.push(
          `Merged tags: added ${newTags
            .filter((t) => !existingTags.includes(t))
            .join(",")}`
        );

        // Fix tag prefixes after merging tags
        this.fixTagPrefixes(existingContact);
      }
    }

    if (existingContact["Groups"] && duplicateContact["Groups"]) {
      const existingGroups = existingContact["Groups"]
        .split(",")
        .map((g) => g.trim());
      const newGroups = duplicateContact["Groups"]
        .split(",")
        .map((g) => g.trim());
      const mergedGroups = [...new Set([...existingGroups, ...newGroups])];
      if (mergedGroups.length > existingGroups.length) {
        existingContact["Groups"] = mergedGroups.join(",");
        existingContact.changes.push(
          `Merged groups: added ${newGroups
            .filter((g) => !existingGroups.includes(g))
            .join(",")}`
        );
      }
    }
  }

  // Helper function to identify buyer contacts
  isBuyerContact(contact) {
    if (!contact) return false;

    // Check in multiple fields for buyer indicators
    const groups = (contact["Groups"] || contact["Group"] || "").toLowerCase();
    const tags = (contact["Tags"] || "").toLowerCase();
    const classification = (
      contact["Client Classification"] || ""
    ).toLowerCase();
    const notes = (contact["Notes"] || "").toLowerCase();
    const keyInfo = (contact["Key Background Info"] || "").toLowerCase();

    // Look for buyer indicators
    return (
      groups.includes("buyer") ||
      tags.includes("buyer") ||
      classification.includes("buyer") ||
      notes.includes("buyer client") ||
      keyInfo.includes("buyer client") ||
      classification === "current buyer" ||
      classification === "past buyer"
    );
  }

  mergeAddress(compassContact, phoneContact) {
    // Define a more comprehensive set of address field mappings
    const addressFields = [
      // Existing mappings
      { compass: "Address Line 1", phone: "Street 1 (Home Address)" },
      { compass: "Address City", phone: "City (Home Address)" },
      { compass: "Address State", phone: "State (Home Address)" },
      { compass: "Address Postal Code", phone: "Postal Code (Home Address)" },

      // Add Compass standard address field formats
      { compass: "Home Address Line 1", phone: "Street 1 (Home Address)" },
      { compass: "Home Address City", phone: "City (Home Address)" },
      { compass: "Home Address State", phone: "State (Home Address)" },
      { compass: "Home Address Zip", phone: "Postal Code (Home Address)" },

      // Add Primary address fields
      {
        compass: "Primary Home Address Line 1",
        phone: "Street 1 (Home Address)",
      },
      { compass: "Primary Home Address City", phone: "City (Home Address)" },
      { compass: "Primary Home Address State", phone: "State (Home Address)" },
      {
        compass: "Primary Home Address Zip",
        phone: "Postal Code (Home Address)",
      },

      // Add custom address fields
      {
        compass: "Primary Custom Address Line 1",
        phone: "Street 1 (Home Address)",
      },
      { compass: "Primary Custom Address City", phone: "City (Home Address)" },
      {
        compass: "Primary Custom Address State",
        phone: "State (Home Address)",
      },
      {
        compass: "Primary Custom Address Zip",
        phone: "Postal Code (Home Address)",
      },
    ];

    // Check if this contact is a buyer by looking at groups, tags, or client classification
    const isBuyer = this.isBuyerContact(compassContact);

    // More aggressive address preservation for buyers, otherwise use normal logic
    let shouldPreserveAddress = isBuyer;

    // For non-buyers, only add address if missing
    if (!shouldPreserveAddress) {
      // Check if compass contact is missing address data
      const hasAddress = addressFields.some(
        ({ compass }) =>
          compassContact[compass] && compassContact[compass].trim() !== ""
      );

      shouldPreserveAddress = !hasAddress;
    }

    // If we should preserve the address, copy all fields
    let addressAdded = false;
    if (shouldPreserveAddress) {
      for (const { compass, phone } of addressFields) {
        if (
          (!compassContact[compass] || compassContact[compass].trim() === "") &&
          phoneContact[phone]
        ) {
          compassContact[compass] = phoneContact[phone];
          addressAdded = true;
        }
      }

      if (addressAdded) {
        compassContact.changes = compassContact.changes || [];
        const message = isBuyer
          ? "Address added from phone data (buyer contact)"
          : "Address added from phone data";
        compassContact.changes.push(message);
      }
    }
  }

  classifyAndAssignGroups(contact) {
    const emails = this.getAllEmails(contact);

    // Special case: Check all contact fields for specific vendor keywords
    let directVendorMatch = false;
    for (const [key, value] of Object.entries(contact)) {
      if (!value || typeof value !== "string") continue;

      const valueStr = value.toString().toLowerCase();
      // Check for direct vendor name matches in any field
      if (
        (valueStr.includes("chartwell") && valueStr.includes("escrow")) ||
        (valueStr.includes("modus") && valueStr.includes("title")) ||
        (valueStr.includes("kris") && valueStr.includes("law")) ||
        valueStr.includes("title company") ||
        valueStr.includes("escrow officer")
      ) {
        console.log(`Direct vendor match in field ${key}: ${valueStr}`);
        contact["Category"] = "Vendor";
        contact.changes = contact.changes || [];
        contact.changes.push("Category=Vendor (direct match)");
        this.stats.vendors++;
        console.log(`Vendor count is now: ${this.stats.vendors}`);
        directVendorMatch = true;
        break;
      }
    }

    // If we already classified as a vendor, no need to continue
    if (directVendorMatch) return;

    // Classify contact type - pass the full contact for additional vendor checks
    const category = this.classifyContact(emails, contact);
    contact["Category"] = category;

    // Add change note for category assignment (matching Python format)
    if (category === "Agent") {
      contact.changes = contact.changes || [];
      contact.changes.push("Category=Agent");
    } else if (category === "Vendor") {
      contact.changes = contact.changes || [];
      contact.changes.push("Category=Vendor");
      console.log(
        `Classified as Vendor: ${contact["First Name"]} ${
          contact["Last Name"]
        } - ${(emails || []).join(", ")}`
      );
    }

    // Update stats
    if (category === "Agent") this.stats.agents++;
    else if (category === "Vendor") {
      this.stats.vendors++;
      console.log(`Vendor count is now: ${this.stats.vendors}`);
    }

    // Check if contact is already marked as past client in Groups column
    const existingGroups = contact["Groups"] || contact["Group"] || "";
    const isPastClientInGroups = existingGroups
      .toLowerCase()
      .includes("past client");

    // Check for past client by address matching (if MLS data available)
    let isPastClientByAddress = false;
    const address =
      contact["Address Line 1"] || contact["Street 1 (Home Address)"] || "";
    if (address && this.mlsAddresses.length > 0) {
      const addressMatch = this.matchAddress(address, this.mlsAddresses);
      if (addressMatch) {
        isPastClientByAddress = true;
        contact["Client Classification"] = "Past Client";
        contact["Home Anniversary Date"] =
          addressMatch["Home Anniversary Date"] ||
          addressMatch["Close Date"] ||
          addressMatch["Closing Date"] ||
          "";
        if (!contact.changes) contact.changes = [];
        contact.changes.push("Identified as past client via address match");
      }
    }

    // Mark as past client if found in groups or by address
    if (isPastClientInGroups || isPastClientByAddress) {
      contact["Client Classification"] = "Past Client";
      this.stats.pastClients++;

      // Add change note if newly identified
      if (isPastClientByAddress && !isPastClientInGroups) {
        if (!contact.changes) contact.changes = [];
        contact.changes.push("Identified as past client");
      }

      // If they're a past client, override any other category classification
      if (category === "Agent" || category === "Vendor") {
        console.log(
          `Overriding ${category} classification for past client: ${contact["First Name"]} ${contact["Last Name"]}`
        );
        contact["Category"] = "Contact";
        if (!contact.changes) contact.changes = [];
        contact.changes.push(
          `Maintained as Contact (overriding ${category} classification because contact is a past client)`
        );
      }
    }

    // Store the original groups for comparison
    const existingGroupsRaw = contact["Groups"] || contact["Group"] || "";
    const originalGroupsArray = existingGroupsRaw
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g !== ""); // Filter out empty strings

    // Check if the contact is truly ungrouped - an empty string or only contains whitespace/commas
    const isTrulyUngrouped = originalGroupsArray.length === 0;

    const originalGroupsSet = new Set(
      originalGroupsArray.map((g) => g.toLowerCase())
    );

    // Assign to groups
    const groups = [];

    // Check if contact is a past client first - takes precedence over other classifications
    if (contact["Client Classification"] === "Past Client") {
      groups.push("Past Clients");
    } else {
      // Only add Agent/Vendor groups if not a past client
      if (category === "Agent") groups.push("Agents");
      if (category === "Vendor") groups.push("Vendors");
    }

    // Add detailed change notes about group assignments
    if (groups.length > 0) {
      if (!contact.changes) contact.changes = [];

      // Check what groups were added
      for (const group of groups) {
        const groupLower = group.toLowerCase();
        if (!originalGroupsSet.has(groupLower)) {
          // This is a new group assignment
          if (isTrulyUngrouped) {
            contact.changes.push(
              `Added to ${group} group (contact was ungrouped)`
            );

            // Add tag showing the group transition
            this.addGroupTransitionTag(contact, "Ungrouped", group);
          } else {
            contact.changes.push(
              `Added to ${group} group (previously in: ${originalGroupsArray.join(
                ", "
              )})`
            );

            // Add tag showing the group transition
            this.addGroupTransitionTag(
              contact,
              originalGroupsArray.join(","),
              group
            );
          }

          // Add more context based on the type of group
          if (group === "Agents" && category === "Agent") {
            contact.changes.push(
              `Classified as real estate agent based on ${this.getClassificationReason(
                contact,
                "agent"
              )}`
            );
          } else if (group === "Vendors" && category === "Vendor") {
            contact.changes.push(
              `Classified as vendor based on ${this.getClassificationReason(
                contact,
                "vendor"
              )}`
            );
          } else if (group === "Past Clients") {
            if (isPastClientByAddress) {
              contact.changes.push(
                `Added to Past Clients group based on address match`
              );

              // Add a note if we overrode another classification
              if (category === "Agent" || category === "Vendor") {
                contact.changes.push(
                  `Past Client classification takes precedence over ${category} classification`
                );
              }
            } else {
              contact.changes.push(`Added to Past Clients group`);

              // Add a note if we overrode another classification
              if (category === "Agent" || category === "Vendor") {
                contact.changes.push(
                  `Past Client classification takes precedence over ${category} classification`
                );
              }
            }
          }
        }
      }
    }

    // Preserve existing groups like Sphere of Influence
    // Add this before the Leads check
    for (const originalGroup of originalGroupsArray) {
      // Skip if this group is something we've already handled (Agents, Vendors, Past Clients)
      // or if it's "Leads" (we'll handle that separately)
      const groupLower = originalGroup.toLowerCase();
      if (
        groupLower === "agents" ||
        groupLower === "vendors" ||
        groupLower === "past clients" ||
        groupLower === "leads"
      ) {
        continue;
      }

      // Preserve Sphere of Influence and any other existing groups
      groups.push(originalGroup);
      if (!contact.changes) contact.changes = [];
      contact.changes.push(`Preserved original group: ${originalGroup}`);
      // Note: We don't add a transition tag here because we're preserving the group, not moving it
    }

    // AFTER all other group assignments are completed, check if contact needs to be in the Leads group
    // This ensures we don't incorrectly assign to Leads when other group assignments are pending
    if (groups.length === 0) {
      // Contact doesn't fit in any predefined groups, so add to Leads
      // Check if they're already in a Leads group (case insensitive)
      const isAlreadyInLeadsGroup = originalGroupsArray.some(
        (group) => group.toLowerCase() === "leads"
      );

      // Only move contacts with personal email domains (not company domains)
      const emails = this.getAllEmails(contact);
      const hasOnlyPersonalEmails = this.hasOnlyPersonalEmailDomains(emails);

      if (!isAlreadyInLeadsGroup && hasOnlyPersonalEmails) {
        // Add to Leads group
        groups.push("Leads");

        // Add change note
        if (!contact.changes) contact.changes = [];
        if (isTrulyUngrouped) {
          contact.changes.push(`Added to Leads group (contact was ungrouped)`);

          // Add tag showing the group transition
          this.addGroupTransitionTag(contact, "Ungrouped", "Leads");
        } else {
          contact.changes.push(
            `Added to Leads group (previously in: ${originalGroupsArray.join(
              ", "
            )})`
          );

          // Only add a transition tag if we're replacing an existing group
          // For Sphere of Influence contacts, we would have preserved that group
          // and they wouldn't reach this code, so this is only for contacts
          // that are truly being moved to Leads
          this.addGroupTransitionTag(
            contact,
            originalGroupsArray.join(","),
            "Leads"
          );
        }

        // Increment the counter for contacts moved to Leads
        this.contactsMovedToLeads = (this.contactsMovedToLeads || 0) + 1;
      }
    }

    // Fix tag prefixes for Home Anniversary and Closed Date
    this.fixTagPrefixes(contact);

    contact["Groups"] = groups.join(",");
    contact["Changes Made"] =
      contact.changes && contact.changes.length > 0
        ? contact.changes.join("; ")
        : "No changes made";
  }

  // Fix tag prefixes for Home Anniversary and Closed Date tags
  fixTagPrefixes(contact) {
    if (!contact["Tags"]) return;

    // Split tags by comma
    const tags = contact["Tags"].split(",").map((tag) => tag.trim());
    let tagsChanged = false;

    // Updated tags array with corrected prefixes
    const updatedTags = tags.map((tag) => {
      // Check for Home Anniversary or Closed Date tags with CRM Refresh: prefix
      if (
        tag.startsWith("CRM Refresh:") &&
        (tag.toLowerCase().includes("home anniversary") ||
          tag.toLowerCase().includes("closed date"))
      ) {
        // Replace prefix with CRM:
        tagsChanged = true;
        const tagContent = tag.substring("CRM Refresh:".length).trim();
        return `CRM: ${tagContent}`;
      }
      return tag;
    });

    // Only update if changes were made
    if (tagsChanged) {
      contact["Tags"] = updatedTags.join(", ");

      // Add change note
      if (!contact.changes) contact.changes = [];
      contact.changes.push(
        "Fixed tag prefix: Changed 'CRM Refresh:' to 'CRM:' for anniversary/closed date tags"
      );
    }
  }

  // Add a tag showing the group transition (from to to)
  addGroupTransitionTag(contact, fromGroup, toGroup) {
    // Create the transition tag - use "to" instead of arrow symbol to avoid CSV encoding issues
    const transitionTag = `Group: ${fromGroup} to ${toGroup}`;

    // Get existing tags
    let tags = contact["Tags"]
      ? contact["Tags"].split(",").map((t) => t.trim())
      : [];

    // Add the transition tag if it doesn't already exist
    if (!tags.some((tag) => tag === transitionTag)) {
      tags.push(transitionTag);
      contact["Tags"] = tags.join(", ");

      // Add a change note
      if (!contact.changes) contact.changes = [];
      contact.changes.push(`Added group transition tag: ${transitionTag}`);
    }
  }

  // Helper method to determine why a contact was classified a certain way
  getClassificationReason(contact, type) {
    const emails = this.getAllEmails(contact);
    const company = (contact["Company"] || "").toLowerCase();

    if (type === "agent") {
      // Check for direct agent indicators
      for (const email of emails) {
        const lowerEmail = email.toLowerCase();

        if (lowerEmail.includes("@compass.com")) return "Compass email domain";
        if (lowerEmail.includes("@elliman.com"))
          return "Douglas Elliman email domain";
        if (lowerEmail.includes("@corcoran.com"))
          return "Corcoran email domain";
        if (lowerEmail.includes("@sothebys")) return "Sotheby's email domain";
        if (lowerEmail.includes("@kw.com"))
          return "Keller Williams email domain";
        if (lowerEmail.includes("@remax.com")) return "RE/MAX email domain";
        if (lowerEmail.includes("realtor") || lowerEmail.includes("realestate"))
          return `email containing "${
            lowerEmail.includes("realtor") ? "realtor" : "realestate"
          }"`;
      }

      // Check for company name
      if (company === "compass") return "Compass affiliation";
      if (company.includes("keller williams"))
        return "Keller Williams affiliation";
      if (
        company.includes("real estate") ||
        company.includes("realty") ||
        company.includes("properties")
      )
        return `company name "${contact["Company"]}"`;

      // Generic reason
      return "email pattern and contact information";
    }

    if (type === "vendor") {
      // Check for direct vendor indicators
      if (company.includes("title")) return "title company affiliation";
      if (company.includes("escrow")) return "escrow company affiliation";
      if (company.includes("law") || company.includes("attorney"))
        return "legal profession";

      const jobTitle = (contact["Title"] || "").toLowerCase();
      if (jobTitle.includes("escrow")) return "escrow officer position";
      if (jobTitle.includes("title")) return "title officer position";
      if (jobTitle.includes("attorney") || jobTitle.includes("lawyer"))
        return "legal profession";

      // Generic reason
      return "contact information pattern";
    }

    return "contact information analysis";
  }

  // Export results to CSV with chunking for large files
  exportToCSV(data, filename = "processed_contacts.csv", excludeColumns = []) {
    console.log("exportToCSV called with:", { data, filename, excludeColumns });
    console.log("Data length:", data ? data.length : "null/undefined");

    if (!data || data.length === 0) {
      console.error("No data to export");
      return;
    }

    // For very large datasets, use chunked export to prevent browser crashes
    if (data.length > 10000) {
      console.log("Large dataset detected, using chunked export");
      return this.exportToCSVChunked(data, filename, excludeColumns);
    }

    // Remove only internal processing fields for main export
    // Processing columns like Category, Changes Made, Groups should be included in main export
    const internalFields = [
      "normalizedName",
      "originalIndex",
      "changes",
      "source",
    ];

    // For main export: only exclude internal fields
    // For import export: exclude both internal fields AND processing columns via excludeColumns parameter
    const fieldsToExclude = [...excludeColumns, ...internalFields];

    const cleanedData = data.map((row) => {
      const cleanRow = { ...row };

      // Add "Closed Date" field with Home Anniversary Date value if the contact has a "closed date" tag
      const tags = row["Tags"] || "";

      // Check for different types of "Closed Date" tags in a case-insensitive way
      const tagsLower = tags.toLowerCase();
      const changesMade = (row["Changes Made"] || "").toLowerCase();

      // More comprehensive check for closed date tags - catch all variations
      const hasClosedDateTag =
        tagsLower.includes("crm: closed date") ||
        tagsLower.includes("crm:closed date") ||
        tagsLower.includes("crm refresh: closed date") ||
        tagsLower.includes("crm refresh closed date") ||
        tagsLower.includes("closed date") ||
        changesMade.includes("anniversary/closed date") ||
        (changesMade.includes("prefix: changed") &&
          changesMade.includes("for anniversary/closed date tags"));

      // Check if the contact has a seller tag
      const hasSellerTag =
        tagsLower.includes("seller") ||
        (row["Client Classification"] &&
          row["Client Classification"].toLowerCase().includes("seller")) ||
        (row["Groups"] && row["Groups"].toLowerCase().includes("seller"));

      // Check if Home Anniversary Date exists
      const homeAnniversaryDate =
        row["Home Anniversary Date"] || row["Home Anniversary"] || "";

      // Only populate Closed Date if the contact has both a closed date tag AND a seller tag
      if (hasClosedDateTag && hasSellerTag && homeAnniversaryDate) {
        cleanRow["Closed Date"] = homeAnniversaryDate;
        console.log(
          `Found closed date and seller tag. Tags: "${tags}", Home Anniversary Date: ${homeAnniversaryDate}`
        );
      } else {
        cleanRow["Closed Date"] = ""; // Ensure the field exists for all records
        if (hasClosedDateTag && !hasSellerTag && homeAnniversaryDate) {
          console.log(
            `Found closed date tag but NO SELLER TAG. Tags: "${tags}"`
          );
        } else if (hasClosedDateTag && hasSellerTag && !homeAnniversaryDate) {
          console.log(
            `Found closed date and seller tags but NO HOME ANNIVERSARY DATE. Tags: "${tags}"`
          );
        }
      }

      fieldsToExclude.forEach((field) => delete cleanRow[field]);
      return cleanRow;
    });

    console.log("Cleaned data sample:", cleanedData[0]);
    console.log("About to generate CSV...");

    // Log how many records should have Closed Date populated
    const recordsWithClosedDate = cleanedData.filter(
      (record) => record["Closed Date"]
    ).length;
    console.log(
      `Records with Closed Date populated: ${recordsWithClosedDate} out of ${cleanedData.length}`
    );

    // Count records with different combinations of tags
    const closedDateTags = cleanedData.filter((record) => {
      const tags = (record["Tags"] || "").toLowerCase();
      const changesMade = (record["Changes Made"] || "").toLowerCase();
      return (
        tags.includes("closed date") ||
        changesMade.includes("anniversary/closed date")
      );
    }).length;

    const sellerTags = cleanedData.filter((record) => {
      const tags = (record["Tags"] || "").toLowerCase();
      const clientClass = (record["Client Classification"] || "").toLowerCase();
      const groups = (record["Groups"] || "").toLowerCase();
      return (
        tags.includes("seller") ||
        clientClass.includes("seller") ||
        groups.includes("seller")
      );
    }).length;

    console.log(`Records with closed date tags: ${closedDateTags}`);
    console.log(`Records with seller tags: ${sellerTags}`);

    // Log field names from first record to verify "Closed Date" field exists
    if (cleanedData.length > 0) {
      console.log(
        "First record fields:",
        Object.keys(cleanedData[0]).join(", ")
      );
      console.log("First record Closed Date:", cleanedData[0]["Closed Date"]);
    }

    const csv = Papa.unparse(cleanedData);
    console.log("CSV generated, length:", csv.length);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    console.log("Download should have started for:", filename);
  }

  // Chunked CSV export for very large datasets to prevent browser crashes
  exportToCSVChunked(
    data,
    filename = "processed_contacts.csv",
    excludeColumns = [],
    chunkSize = 5000
  ) {
    console.log(
      `Starting chunked export of ${data.length} records with chunk size ${chunkSize}`
    );

    // Remove only internal processing fields for main export
    const internalFields = [
      "normalizedName",
      "originalIndex",
      "changes",
      "source",
    ];

    // For main export: only exclude internal fields
    // For import export: exclude both internal fields AND processing columns via excludeColumns parameter
    const fieldsToExclude = [...excludeColumns, ...internalFields];

    // Get headers from first record (after cleaning)
    const firstRecord = { ...data[0] };

    // Add the "Closed Date" field to ensure it's included in headers
    firstRecord["Closed Date"] = "";

    fieldsToExclude.forEach((field) => delete firstRecord[field]);
    const headers = Object.keys(firstRecord);

    // Show progress indicator
    const progressDiv = document.createElement("div");
    progressDiv.style.position = "fixed";
    progressDiv.style.top = "50%";
    progressDiv.style.left = "50%";
    progressDiv.style.transform = "translate(-50%, -50%)";
    progressDiv.style.padding = "20px";
    progressDiv.style.background = "white";
    progressDiv.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
    progressDiv.style.borderRadius = "5px";
    progressDiv.style.zIndex = "9999";
    progressDiv.innerHTML = `
      <h3>Preparing export file...</h3>
      <div style="margin-bottom: 10px;">Processing records: <span id="progress-count">0</span> of ${data.length}</div>
      <div style="width: 300px; height: 20px; background: #eee; border-radius: 10px; overflow: hidden;">
        <div id="progress-bar" style="width: 0%; height: 100%; background: #4CAF50;"></div>
      </div>
    `;
    document.body.appendChild(progressDiv);

    // Create a streaming approach for very large datasets
    try {
      // Use Streams API if available for memory efficiency
      if (
        window.ReadableStream &&
        window.WritableStream &&
        window.TransformStream
      ) {
        console.log("Using Streams API for efficient CSV export");

        let processedCount = 0;

        // Process data in chunks using streams
        const processAllChunksWithStreams = async () => {
          try {
            // Create a header row
            const headerRow = headers.join(",") + "\n";

            // Create a download link for the stream
            const fileStream = new ReadableStream({
              async start(controller) {
                // Add header row
                controller.enqueue(new TextEncoder().encode(headerRow));

                // Process in chunks
                for (let i = 0; i < data.length; i += chunkSize) {
                  const endIdx = Math.min(i + chunkSize, data.length);
                  let chunkContent = "";

                  for (let j = i; j < endIdx; j++) {
                    const row = data[j];
                    const cleanRow = { ...row };

                    // Add "Closed Date" field with Home Anniversary Date value if the contact has a "closed date" tag
                    const tags = row["Tags"] || "";

                    // Check for different types of "Closed Date" tags in a case-insensitive way
                    const tagsLower = tags.toLowerCase();
                    const changesMade = (
                      row["Changes Made"] || ""
                    ).toLowerCase();

                    // More comprehensive check for closed date tags - catch all variations
                    const hasClosedDateTag =
                      tagsLower.includes("crm: closed date") ||
                      tagsLower.includes("crm:closed date") ||
                      tagsLower.includes("crm refresh: closed date") ||
                      tagsLower.includes("crm refresh closed date") ||
                      tagsLower.includes("closed date") ||
                      changesMade.includes("anniversary/closed date") ||
                      (changesMade.includes("prefix: changed") &&
                        changesMade.includes(
                          "for anniversary/closed date tags"
                        ));

                    // Check if the contact has a seller tag
                    const hasSellerTag =
                      tagsLower.includes("seller") ||
                      (row["Client Classification"] &&
                        row["Client Classification"]
                          .toLowerCase()
                          .includes("seller")) ||
                      (row["Groups"] &&
                        row["Groups"].toLowerCase().includes("seller"));

                    // Check if Home Anniversary Date exists
                    const homeAnniversaryDate =
                      row["Home Anniversary Date"] ||
                      row["Home Anniversary"] ||
                      "";

                    // Only populate Closed Date if the contact has both a closed date tag AND a seller tag
                    if (
                      hasClosedDateTag &&
                      hasSellerTag &&
                      homeAnniversaryDate
                    ) {
                      cleanRow["Closed Date"] = homeAnniversaryDate;
                    } else {
                      cleanRow["Closed Date"] = ""; // Ensure the field exists for all records
                    }

                    fieldsToExclude.forEach((field) => delete cleanRow[field]);

                    // Format row values
                    const values = headers.map((header) => {
                      const val = cleanRow[header];
                      if (val === null || val === undefined) return "";
                      const strVal = String(val).replace(/"/g, '""'); // Escape quotes
                      return strVal.includes(",") ||
                        strVal.includes('"') ||
                        strVal.includes("\n")
                        ? `"${strVal}"`
                        : strVal;
                    });

                    chunkContent += values.join(",") + "\n";
                  }

                  // Enqueue this chunk
                  controller.enqueue(new TextEncoder().encode(chunkContent));

                  // Update progress
                  processedCount = endIdx;
                  document.getElementById("progress-count").textContent =
                    processedCount;
                  document.getElementById(
                    "progress-bar"
                  ).style.width = `${Math.round(
                    (processedCount / data.length) * 100
                  )}%`;

                  // Yield to browser to prevent UI freezing
                  await new Promise((resolve) => setTimeout(resolve, 0));
                }

                // Close the stream when done
                controller.close();
              },
            });

            // Create blob from stream
            const response = new Response(fileStream);
            const blob = await response.blob();

            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;

            // Clean up UI
            document.body.removeChild(progressDiv);

            // Trigger download
            link.click();
            URL.revokeObjectURL(url);

            console.log(
              `Stream export complete: ${processedCount} records exported to ${filename}`
            );
          } catch (error) {
            console.error("Error during streaming CSV export:", error);
            document.body.removeChild(progressDiv);
            alert(
              "An error occurred during export. Please try again with a smaller dataset."
            );
          }
        };

        // Start the streaming process
        processAllChunksWithStreams();
        return;
      }
    } catch (streamError) {
      console.error(
        "Streams API not supported or error occurred:",
        streamError
      );
      // Will fall back to chunked approach below
    }

    // Fallback for browsers without Streams API - using an improved chunked approach
    console.log("Using improved chunked approach for CSV export");
    let processedCount = 0;
    let csvParts = [];

    // Add header row to the parts array
    csvParts.push(headers.join(",") + "\n");

    // Process data in chunks
    const processChunk = (startIdx) => {
      return new Promise((resolve) => {
        // Use setTimeout to yield control back to browser UI
        setTimeout(() => {
          const endIdx = Math.min(startIdx + chunkSize, data.length);
          let chunkContent = "";

          for (let i = startIdx; i < endIdx; i++) {
            const row = data[i];
            const cleanRow = { ...row };

            // Add "Closed Date" field with Home Anniversary Date value if the contact has a "closed date" tag
            const tags = row["Tags"] || "";

            // Check for different types of "Closed Date" tags in a case-insensitive way
            const tagsLower = tags.toLowerCase();
            const changesMade = (row["Changes Made"] || "").toLowerCase();

            // More comprehensive check for closed date tags - catch all variations
            const hasClosedDateTag =
              tagsLower.includes("crm: closed date") ||
              tagsLower.includes("crm:closed date") ||
              tagsLower.includes("crm refresh: closed date") ||
              tagsLower.includes("crm refresh closed date") ||
              tagsLower.includes("closed date") ||
              changesMade.includes("anniversary/closed date") ||
              (changesMade.includes("prefix: changed") &&
                changesMade.includes("for anniversary/closed date tags"));

            // Check if the contact has a seller tag
            const hasSellerTag =
              tagsLower.includes("seller") ||
              (row["Client Classification"] &&
                row["Client Classification"]
                  .toLowerCase()
                  .includes("seller")) ||
              (row["Groups"] && row["Groups"].toLowerCase().includes("seller"));

            // Check if Home Anniversary Date exists
            const homeAnniversaryDate =
              row["Home Anniversary Date"] || row["Home Anniversary"] || "";

            // Only populate Closed Date if the contact has both a closed date tag AND a seller tag
            if (hasClosedDateTag && hasSellerTag && homeAnniversaryDate) {
              cleanRow["Closed Date"] = homeAnniversaryDate;
            } else {
              cleanRow["Closed Date"] = ""; // Ensure the field exists for all records
            }

            fieldsToExclude.forEach((field) => delete cleanRow[field]);

            // Format row values (handle commas, quotes, etc.)
            const values = headers.map((header) => {
              const val = cleanRow[header];
              if (val === null || val === undefined) return "";
              const strVal = String(val).replace(/"/g, '""'); // Escape quotes
              return strVal.includes(",") ||
                strVal.includes('"') ||
                strVal.includes("\n")
                ? `"${strVal}"`
                : strVal;
            });

            chunkContent += values.join(",") + "\n";
          }

          // Add this chunk to our parts array
          csvParts.push(chunkContent);

          // Update progress
          processedCount = endIdx;
          document.getElementById("progress-count").textContent =
            processedCount;
          document.getElementById("progress-bar").style.width = `${Math.round(
            (processedCount / data.length) * 100
          )}%`;

          resolve();
        }, 0);
      });
    };

    // Process all chunks and then download
    const processAllChunks = async () => {
      try {
        for (let i = 0; i < data.length; i += chunkSize) {
          await processChunk(i);
        }

        // Create blob only after all chunks are processed
        const blob = new Blob(csvParts, { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        // Cleanup resources before download
        document.body.removeChild(progressDiv);

        // Start download
        link.click();
        URL.revokeObjectURL(link.href);

        // Help garbage collection
        csvParts = null;

        console.log(
          `Chunked export complete: ${processedCount} records exported to ${filename}`
        );
      } catch (error) {
        console.error("Error during chunked CSV export:", error);
        try {
          document.body.removeChild(progressDiv);
        } catch (cleanupError) {
          console.error("Error cleaning up UI:", cleanupError);
        }
        alert(
          "An error occurred during export. Please try again with a smaller dataset."
        );
      }
    };

    // Start processing
    processAllChunks();
  }

  // Get processing statistics
  getStats() {
    return {
      ...this.stats,
      contactsMovedToLeads: this.contactsMovedToLeads || 0,
      phonesAddedCount: this.phonesAddedCount || 0, // Add the new stat for phones added
      emailsAddedCount: this.emailsAddedCount || 0, // Add the new stat for emails added
    };
  }

  // Get processed data
  getProcessedData() {
    return [...this.processedData];
  }

  // Get only changed records for import
  getChangedRecords() {
    return this.processedData.filter(
      (record) =>
        record["Changes Made"] && record["Changes Made"] !== "No changes made"
    );
  }

  // Export only changed records for import (matching Python workflow)
  exportChangedRecordsOnly(filename = "compass_import.csv") {
    // Helper function to check if a record has CRMMERGED tag
    const hasMergeTag = (record) => {
      if (!record["Tags"]) return false;
      const tagsLower = record["Tags"].toLowerCase();
      return tagsLower.includes("crmmerged");
    };

    // Helper function to check if a record has anniversary or closed date tags
    const hasAnniversaryOrClosedDateTag = (tags) => {
      if (!tags) return false;
      const tagsLower = tags.toLowerCase();
      return (
        tagsLower.includes("home anniversary") ||
        tagsLower.includes("closed date")
      );
    };

    // Get all records with CRMMERGED tags
    const mergedTaggedRecords = [
      ...this.processedCompassContacts,
      ...this.processedPhoneContacts,
      ...this.processedExportedContacts,
      ...this.processedZipCodeContacts,
      ...this.processedData,
    ].filter(hasMergeTag);

    console.log(
      `Found ${mergedTaggedRecords.length} records with CRMMERGED tag`
    );

    // Get changed records
    const changedRecords = this.getChangedRecords();

    // Get records with Home Anniversary or Closed Date tags from processed data that aren't already changed
    const processedHomeAnniversaryRecords = this.processedData.filter(
      (record) =>
        record["Tags"] &&
        hasAnniversaryOrClosedDateTag(record["Tags"]) &&
        !(
          record["Changes Made"] && record["Changes Made"] !== "No changes made"
        )
    );

    // Also find records with Home Anniversary or Closed Date tags from original Compass data
    const compassHomeAnniversaryRecords = this.compassData
      .filter(
        (record) =>
          record["Tags"] && hasAnniversaryOrClosedDateTag(record["Tags"])
      )
      .map((record) => {
        // Ensure we have a Changes Made field
        return {
          ...record,
          "Changes Made": "Included for Home Anniversary/Closed Date tag",
        };
      });

    // Also find records with Home Anniversary or Closed Date tags from original Phone data
    const phoneHomeAnniversaryRecords = this.phoneData
      .filter(
        (record) =>
          record["Tags"] && hasAnniversaryOrClosedDateTag(record["Tags"])
      )
      .map((record) => {
        // Ensure we have a Changes Made field
        return {
          ...record,
          "Changes Made": "Included for Home Anniversary/Closed Date tag",
        };
      });

    // Create a map for all unique records using first+last name as the key
    const uniqueRecordsMap = new Map();

    // First add all records with CRMMERGED tags to the map (they take priority)
    let mergeTagsAdded = 0;
    for (const record of mergedTaggedRecords) {
      const firstName = (record["First Name"] || "").toLowerCase().trim();
      const lastName = (record["Last Name"] || "").toLowerCase().trim();

      if (firstName && lastName) {
        const key = `${firstName}|${lastName}`;

        // Add a Changes Made field if it doesn't exist
        if (
          !record["Changes Made"] ||
          record["Changes Made"] === "No changes made"
        ) {
          record["Changes Made"] = "Included for CRMMERGED tag";
        }

        uniqueRecordsMap.set(key, record);
        mergeTagsAdded++;
      }
    }

    console.log(
      `Added ${mergeTagsAdded} merge-tagged records to unique records map`
    );

    // Next add all changed records to the map (if they're not already there)
    let changedRecordsAdded = 0;
    for (const record of changedRecords) {
      const firstName = (record["First Name"] || "").toLowerCase().trim();
      const lastName = (record["Last Name"] || "").toLowerCase().trim();

      if (firstName && lastName) {
        const key = `${firstName}|${lastName}`;
        if (!uniqueRecordsMap.has(key)) {
          uniqueRecordsMap.set(key, record);
          changedRecordsAdded++;
        }
      }
    }

    console.log(
      `Added ${changedRecordsAdded} additional changed records to unique records map`
    );

    // Combine all anniversary records
    const allAnniversaryRecords = [
      ...processedHomeAnniversaryRecords,
      ...compassHomeAnniversaryRecords,
      ...phoneHomeAnniversaryRecords,
    ];

    console.log(
      `Found ${allAnniversaryRecords.length} total anniversary records`
    );

    // Add anniversary records only if they don't already exist in the map
    let anniversaryRecordsAdded = 0;
    for (const record of allAnniversaryRecords) {
      const firstName = (record["First Name"] || "").toLowerCase().trim();
      const lastName = (record["Last Name"] || "").toLowerCase().trim();

      if (firstName && lastName) {
        const key = `${firstName}|${lastName}`;

        // Only add if this name combination isn't already in our map
        if (!uniqueRecordsMap.has(key)) {
          uniqueRecordsMap.set(key, record);
          anniversaryRecordsAdded++;
        }
      }
    }

    console.log(
      `Added ${anniversaryRecordsAdded} additional anniversary records after deduplication`
    );

    // Convert the map values to an array for export
    const recordsToExport = Array.from(uniqueRecordsMap.values());

    console.log(
      `Exporting ${uniqueRecordsMap.size} total records (${mergeTagsAdded} merge-tagged + ${changedRecordsAdded} changed + ${anniversaryRecordsAdded} anniversary)`
    );

    // Add a debug log to verify CRMMERGED tags are present
    const mergedTagsInExport = recordsToExport.filter(
      (r) => r["Tags"] && r["Tags"].includes("CRMMERGED")
    ).length;

    console.log(
      `Number of records with CRMMERGED tag in export: ${mergedTagsInExport}`
    );

    // Use Python-style exclusions for import files (matching the exact exclude_cols from Python)
    const importExclusions = [
      "Created At",
      "Last Contacted",
      "Changes Made",
      "Category",
      "Agent Classification",
      "Client Classification",
      "Vendor Classification",
      // Note: "Home Anniversary Date" and "Groups" are kept for CRM import (like Python)
    ];

    this.exportToCSV(recordsToExport, filename, importExclusions);
  }

  // Export only changed records without including Home Anniversary records
  exportOnlyChangedRecords(filename = "changed_records_only.csv") {
    // Get changed records
    const changedRecords = this.getChangedRecords();

    console.log(`Exporting ${changedRecords.length} changed records only`);

    // Use same exclusions as the other export function
    const importExclusions = [
      "Created At",
      "Last Contacted",
      "Changes Made",
      "Category",
      "Agent Classification",
      "Client Classification",
      "Vendor Classification",
    ];

    this.exportToCSV(changedRecords, filename, importExclusions);
  }

  // Export only Home Anniversary records
  exportOnlyHomeAnniversaryRecords(filename = "home_anniversary_records.csv") {
    console.log("Exporting only home anniversary records to", filename, "...");

    // Helper function to check if a record has a CRMMERGED tag
    const hasMergeTag = (record) => {
      if (!record["Tags"]) return false;
      const tagsLower = record["Tags"].toLowerCase();
      return tagsLower.includes("crmmerged");
    };

    // Helper function to check if a record has anniversary or closed date tags
    const hasAnniversaryOrClosedDateTag = (tags) => {
      if (!tags) return false;
      const tagsLower = tags.toLowerCase();
      return (
        tagsLower.includes("home anniversary") ||
        tagsLower.includes("closed date")
      );
    };

    // Find all records with the CRMMERGED tag from all processed data sources
    const allDataSources = [
      ...(this.processedCompassContacts || []),
      ...(this.processedPhoneContacts || []),
      ...(this.processedExportedContacts || []),
      ...(this.processedZipCodeContacts || []),
      ...(this.processedData || []),
    ];

    // If we don't have the processed arrays, fall back to the original data
    const mergedTaggedRecords = (
      allDataSources.length > 0
        ? allDataSources
        : [...this.compassData, ...this.phoneData, ...this.processedData]
    ).filter(hasMergeTag);

    console.log(
      `Found ${mergedTaggedRecords.length} records with CRMMERGED tag`
    );

    // Get records with Home Anniversary or Closed Date tags from processed data
    const processedHomeAnniversaryRecords = this.processedData.filter(
      (record) =>
        record["Tags"] &&
        hasAnniversaryOrClosedDateTag(record["Tags"]) &&
        // Exclude records tagged as CRMDuplicate
        !record["Tags"].includes("CRMDuplicate")
    );

    // Also find records with Home Anniversary or Closed Date tags from original Compass data
    const compassHomeAnniversaryRecords = this.compassData
      .filter(
        (record) =>
          record["Tags"] &&
          hasAnniversaryOrClosedDateTag(record["Tags"]) &&
          // Exclude records tagged as CRMDuplicate
          (!record["Tags"] || !record["Tags"].includes("CRMDuplicate"))
      )
      .map((record) => {
        // Look for a matching processed record to get any tags like CRMMERGED
        const firstName = (record["First Name"] || "").toLowerCase().trim();
        const lastName = (record["Last Name"] || "").toLowerCase().trim();

        // Create a copy to modify
        const updatedRecord = { ...record };

        if (firstName && lastName) {
          // Try to find a processed version of this record
          const processedRecord = this.processedData.find(
            (pr) =>
              (pr["First Name"] || "").toLowerCase().trim() === firstName &&
              (pr["Last Name"] || "").toLowerCase().trim() === lastName
          );

          if (processedRecord) {
            // Use the processed record's tags if they exist
            if (processedRecord["Tags"]) {
              updatedRecord["Tags"] = processedRecord["Tags"];
            }
          }
        }

        // Ensure we have a Changes Made field
        updatedRecord["Changes Made"] =
          "Included for Home Anniversary/Closed Date tag";

        return updatedRecord;
      });

    // Also find records with Home Anniversary or Closed Date tags from original Phone data
    const phoneHomeAnniversaryRecords = this.phoneData
      .filter(
        (record) =>
          record["Tags"] &&
          hasAnniversaryOrClosedDateTag(record["Tags"]) &&
          // Exclude records tagged as CRMDuplicate
          (!record["Tags"] || !record["Tags"].includes("CRMDuplicate"))
      )
      .map((record) => {
        // Look for a matching processed record to get any tags like CRMMERGED
        const firstName = (record["First Name"] || "").toLowerCase().trim();
        const lastName = (record["Last Name"] || "").toLowerCase().trim();

        // Create a copy to modify
        const updatedRecord = { ...record };

        if (firstName && lastName) {
          // Try to find a processed version of this record
          const processedRecord = this.processedData.find(
            (pr) =>
              (pr["First Name"] || "").toLowerCase().trim() === firstName &&
              (pr["Last Name"] || "").toLowerCase().trim() === lastName
          );

          if (processedRecord) {
            // Use the processed record's tags if they exist
            if (processedRecord["Tags"]) {
              updatedRecord["Tags"] = processedRecord["Tags"];
            }
          }
        }

        // Ensure we have a Changes Made field
        updatedRecord["Changes Made"] =
          "Included for Home Anniversary/Closed Date tag";

        return updatedRecord;
      });

    console.log(
      `Found ${processedHomeAnniversaryRecords.length} processed records with home anniversary`
    );
    console.log(
      `Found ${compassHomeAnniversaryRecords.length} Compass records with home anniversary`
    );
    console.log(
      `Found ${phoneHomeAnniversaryRecords.length} Phone records with home anniversary`
    );

    // Create a map for all unique records using first+last name as the key
    const uniqueRecordsMap = new Map();

    // First add all records with CRMMERGED tags to the map (they take priority)
    let mergeTagsAdded = 0;
    for (const record of mergedTaggedRecords) {
      const firstName = (record["First Name"] || "").toLowerCase().trim();
      const lastName = (record["Last Name"] || "").toLowerCase().trim();

      if (firstName && lastName) {
        const key = `${firstName}|${lastName}`;

        // Add a Changes Made field if it doesn't exist
        if (
          !record["Changes Made"] ||
          record["Changes Made"] === "No changes made"
        ) {
          record["Changes Made"] = "Included for CRMMERGED tag";
        }

        uniqueRecordsMap.set(key, record);
        mergeTagsAdded++;
      }
    }

    console.log(
      `Added ${mergeTagsAdded} merge-tagged records to unique records map`
    );

    // Add processed anniversary records if not already in the map
    let processedAnniversaryAdded = 0;
    for (const record of processedHomeAnniversaryRecords) {
      const firstName = (record["First Name"] || "").toLowerCase().trim();
      const lastName = (record["Last Name"] || "").toLowerCase().trim();

      if (firstName && lastName) {
        const key = `${firstName}|${lastName}`;

        // Only add if this name combination isn't already in our map
        if (!uniqueRecordsMap.has(key)) {
          uniqueRecordsMap.set(key, record);
          processedAnniversaryAdded++;
        }
      }
    }

    console.log(
      `Added ${processedAnniversaryAdded} processed anniversary records to map`
    );

    // Add Compass anniversary records if not already in the map
    let compassAnniversaryAdded = 0;
    for (const record of compassHomeAnniversaryRecords) {
      const firstName = (record["First Name"] || "").toLowerCase().trim();
      const lastName = (record["Last Name"] || "").toLowerCase().trim();

      if (firstName && lastName) {
        const key = `${firstName}|${lastName}`;

        // Only add if this name combination isn't already in our map
        if (!uniqueRecordsMap.has(key)) {
          uniqueRecordsMap.set(key, record);
          compassAnniversaryAdded++;
        }
      }
    }

    console.log(
      `Added ${compassAnniversaryAdded} Compass anniversary records to map`
    );

    // Add Phone anniversary records if not already in the map
    let phoneAnniversaryAdded = 0;
    for (const record of phoneHomeAnniversaryRecords) {
      const firstName = (record["First Name"] || "").toLowerCase().trim();
      const lastName = (record["Last Name"] || "").toLowerCase().trim();

      if (firstName && lastName) {
        const key = `${firstName}|${lastName}`;

        // Only add if this name combination isn't already in our map
        if (!uniqueRecordsMap.has(key)) {
          uniqueRecordsMap.set(key, record);
          phoneAnniversaryAdded++;
        }
      }
    }

    console.log(
      `Added ${phoneAnniversaryAdded} Phone anniversary records to map`
    );

    // Convert the map values to an array for export
    const recordsToExport = Array.from(uniqueRecordsMap.values());

    console.log(
      `Exporting ${
        uniqueRecordsMap.size
      } total records (${mergeTagsAdded} merge-tagged + ${
        processedAnniversaryAdded +
        compassAnniversaryAdded +
        phoneAnniversaryAdded
      } anniversary)`
    );

    // Add a debug log to verify CRMMERGED tags are present
    const mergedTagsInExport = recordsToExport.filter(
      (r) => r["Tags"] && r["Tags"].includes("CRMMERGED")
    ).length;

    console.log(
      `Number of records with CRMMERGED tag in export: ${mergedTagsInExport}`
    );

    // Use same exclusions as the other export functions
    const importExclusions = [
      "Created At",
      "Last Contacted",
      "Changes Made",
      "Category",
      "Agent Classification",
      "Client Classification",
      "Vendor Classification",
    ];

    this.exportToCSV(recordsToExport, filename, importExclusions);
  }
}

export default RealEstateProcessor;
