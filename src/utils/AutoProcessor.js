/**
 * AutoProcessor - Mirrors the exact logic from SimpleDuplicateTagger and ContactCategorizer
 * WITHOUT modifying the original components
 */

import Papa from "papaparse";

/**
 * DUPLICATE TAGGING LOGIC - Mirrors SimpleDuplicateTagger.jsx
 */
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
    return "";
  }

  return `${first} ${last}`.trim();
};

const tagDuplicates = (rows) => {
  // Group records by normalized name (same logic as SimpleDuplicateTagger)
  const nameGroups = new Map();

  for (let i = 0; i < rows.length; i++) {
    const record = rows[i];
    const normalizedName = normalizeName(
      record["First Name"],
      record["Last Name"],
    );

    if (!normalizedName) {
      continue;
    }

    if (!nameGroups.has(normalizedName)) {
      nameGroups.set(normalizedName, []);
    }
    nameGroups.get(normalizedName).push({
      index: i,
      record: record,
    });
  }

  // Process duplicates - create a deep copy
  const processedData = rows.map((record) => ({ ...record }));

  // Tag all records in duplicate groups
  for (const [name, records] of nameGroups.entries()) {
    if (records.length > 1) {
      // Sort by Created At date - latest becomes master (reference only)
      records.sort((a, b) => {
        const dateA = new Date(a.record["Created At"] || "1900-01-01");
        const dateB = new Date(b.record["Created At"] || "1900-01-01");
        return dateB - dateA;
      });

      // Tag ALL records in the group as duplicates (including master)
      for (let j = 0; j < records.length; j++) {
        const recordIndex = records[j].index;
        const record = processedData[recordIndex];

        const existingTags = record["Tags"] || "";
        if (!existingTags.includes("CRM:Duplicate")) {
          record["Tags"] = existingTags
            ? `${existingTags},CRM:Duplicate`
            : "CRM:Duplicate";
        }

        // Always add change tracking for duplicates (same as SimpleDuplicateTagger)
        const existingChanges = record["Changes Made"] || "";
        const newChange = "Tagged as CRM:Duplicate";
        record["Changes Made"] = existingChanges
          ? `${existingChanges}; ${newChange}`
          : newChange;
      }
    }
  }

  return processedData;
};

/**
 * CATEGORIZATION LOGIC - Mirrors ContactCategorizer.jsx
 */

// Get all email domains from brokerage list (from ContactCategorizer)
const BROKERAGE_DOMAINS = new Set([
  "compass.com",
  "elliman.com",
  "corcoran.com",
  "bhhs.com",
  "coldwellbanker.com",
  "sothebys.com",
  "sothebysrealty.com",
  "sir.com",
  "remax.com",
  "century21.com",
  "c21.com",
  "kw.com",
  "exprealty.com",
  "weichert.com",
  "redfin.com",
  "propertyshark.com",
  "nestseekers.com",
  "halstead.com",
  "stribling.com",
  "bondnewyork.com",
  "exrny.com",
]);

const AGENT_KEYWORDS = [
  "realty",
  "realtor",
  "realestate",
  "real estate",
  "broker",
  "agent",
  "properties",
];

const VENDOR_KEYWORDS = [
  "escrow",
  "title",
  "attorney",
  "lawyer",
  "mortgage",
  "bank",
  "appraiser",
  "inspector",
  "insurance",
  "contractor",
  "architect",
  "designer",
  "accountant",
  "tax",
  "financial",
];

// Extract all emails (mirrors getAllEmails from ContactCategorizer)
const getAllEmails = (contact) => {
  const emailFields = [
    "Personal Email",
    "Email",
    "Work Email",
    "Email 2",
    "Email 3",
    "Primary Personal Email",
    "Custom Email",
  ];

  return emailFields
    .map((field) => contact[field])
    .filter((email) => email && email.toString().trim() && email.includes("@"))
    .map((email) => email.toString().trim().toLowerCase());
};

const categorizeContact = (contact) => {
  let agentConfidence = 0;
  let vendorConfidence = 0;
  let category = "Contact"; // Default (matches ContactCategorizer)
  let reasons = [];

  // Extract all emails
  const emails = getAllEmails(contact);

  // Extract key fields
  const company = (contact["Company"] || "").toLowerCase();
  const title = (contact["Title"] || contact["Job Title"] || "").toLowerCase();
  const tags = (contact["Tags"] || "").toLowerCase();
  const groups = (contact["Groups"] || contact["Group"] || "").toLowerCase();

  // Check for past client classification (matches ContactCategorizer)
  const isPastClient =
    contact["Client Classification"] === "Past Client" ||
    contact["Client Classification"] === "past buyer" ||
    groups.includes("past client") ||
    groups.includes("past clients") ||
    tags.includes("past client") ||
    tags.includes("past clients") ||
    tags.includes("past buyer") ||
    tags.includes("past seller");

  // Check all contact fields for specific vendor keywords
  let directVendorMatch = false;
  for (const [key, value] of Object.entries(contact)) {
    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      if (
        lowerValue.includes("chartwellescrow.com") ||
        lowerValue.includes("modustitle.com") ||
        lowerValue.includes("krislaw") ||
        (lowerValue.includes("escrow") && lowerValue.includes("chartwell")) ||
        (lowerValue.includes("title") && lowerValue.includes("modus"))
      ) {
        vendorConfidence += 100;
        reasons.push(`Direct vendor match: ${key}`);
        directVendorMatch = true;
        break;
      }
    }
  }

  if (directVendorMatch) {
    return {
      category: "Vendor",
      vendorConfidence,
      agentConfidence: 0,
      reasons,
    };
  }

  // AGENT CLASSIFICATION SIGNALS (mirrors ContactCategorizer)

  // Check email domains for brokerage matches
  const domains = emails
    .map((email) => {
      const match = email.match(/@([\w.-]+)$/);
      return match ? match[1] : "";
    })
    .filter(Boolean);

  for (const domain of domains) {
    if (BROKERAGE_DOMAINS.has(domain)) {
      agentConfidence += 50;
      reasons.push(`Brokerage email domain: ${domain}`);
    } else {
      for (const keyword of AGENT_KEYWORDS) {
        if (domain.includes(keyword)) {
          agentConfidence += 45;
          reasons.push(`Agent keyword in domain: ${keyword}`);
          break;
        }
      }

      // Special case for Gmail/generic domains with real estate company/title
      if (
        (domain === "gmail.com" ||
          domain === "icloud.com" ||
          domain === "yahoo.com") &&
        (company.includes("compass") ||
          company.includes("realty") ||
          company.includes("real estate") ||
          title.includes("agent") ||
          title.includes("realtor"))
      ) {
        agentConfidence += 45;
        reasons.push("Generic domain + real estate company/title");
      }
    }
  }

  // Agent keywords in emails
  for (const email of emails) {
    const lowerEmail = email.toLowerCase();
    if (
      lowerEmail.includes("realtor") ||
      lowerEmail.includes("realestate") ||
      (lowerEmail.includes("agent") && !lowerEmail.includes("mortgage")) ||
      (lowerEmail.includes("broker") && !lowerEmail.includes("mortgage"))
    ) {
      agentConfidence += 45;
      reasons.push(`Direct agent keyword in email: ${email}`);
    }
  }

  // Company name analysis
  const companyKeywords = [
    "realty",
    "real estate",
    "sotheby",
    "coldwell banker",
    "keller williams",
    "century 21",
    "berkshire hathaway",
    "re/max",
    "remax",
    "douglas elliman",
    "compass",
    "corcoran",
    "exp realty",
    "weichert",
  ];

  let hasDirectRealEstateMatch = false;
  companyKeywords.forEach((keyword) => {
    if (company.includes(keyword)) {
      agentConfidence += 40;
      reasons.push(`Real estate company: ${keyword}`);
      hasDirectRealEstateMatch = true;
    }
  });

  // Job title analysis for agents
  const agentTitles = [
    "real estate agent",
    "realtor",
    "broker",
    "real estate",
    "property manager",
    "sales associate",
    "listing agent",
    "buyer agent",
  ];

  agentTitles.forEach((titleKeyword) => {
    if (title.includes(titleKeyword)) {
      agentConfidence += 40;
      reasons.push(`Real estate title: ${titleKeyword}`);
    }
  });

  // Existing tags/groups for agents
  if (tags.includes("agent")) {
    agentConfidence += 40;
    reasons.push("Existing agent tags");
  }
  if (groups.includes("agent")) {
    agentConfidence += 40;
    reasons.push("Existing agent groups");
  }

  // VENDOR CLASSIFICATION SIGNALS (mirrors ContactCategorizer)

  // Direct vendor email analysis
  for (const email of emails) {
    const lowerEmail = email.toLowerCase();
    if (
      lowerEmail.includes("@chartwellescrow.com") ||
      lowerEmail.includes("@krislaw") ||
      lowerEmail.includes("@modustitle.com") ||
      lowerEmail.includes("escrow") ||
      lowerEmail.includes("title") ||
      lowerEmail.includes("law.com")
    ) {
      vendorConfidence += 100;
      reasons.push(`Direct vendor email: ${email}`);
    }

    VENDOR_KEYWORDS.forEach((keyword) => {
      if (lowerEmail.includes(keyword)) {
        vendorConfidence += 15;
        reasons.push(`Vendor keyword in email: ${keyword}`);
      }
    });
  }

  // Vendor keywords in business fields
  const businessFieldsOnly = `${emails.join(
    " ",
  )} ${company} ${title} ${tags} ${groups}`.toLowerCase();
  VENDOR_KEYWORDS.forEach((keyword) => {
    if (businessFieldsOnly.includes(keyword)) {
      vendorConfidence += 30;
      reasons.push(`Vendor keyword found: ${keyword}`);
    }
  });

  // Business patterns for vendors
  const businessPatterns = [
    " inc",
    " llc",
    " corp",
    "title",
    "escrow",
    "law",
    "mortgage",
    "bank",
    "insurance",
    "lending",
  ];

  businessPatterns.forEach((pattern) => {
    if (company.includes(pattern)) {
      // Don't apply "bank" if already matched real estate company
      if (pattern === "bank" && hasDirectRealEstateMatch) {
        return;
      }
      vendorConfidence += 30;
      reasons.push(`Business entity pattern: ${pattern}`);
    }
  });

  // Vendor domains
  const knownVendorDomains = [
    "modustitle.com",
    "chartwellescrow.com",
    "krisslawatlantic.com",
    "escrow.com",
  ];

  for (const domain of domains) {
    for (const keyword of VENDOR_KEYWORDS) {
      if (domain.includes(keyword)) {
        vendorConfidence += 40;
        reasons.push(`Vendor keyword in domain: ${keyword}`);
        break;
      }
    }
    if (knownVendorDomains.includes(domain)) {
      vendorConfidence += 50;
      reasons.push(`Known vendor domain: ${domain}`);
    }
  }

  // Vendor job titles
  const vendorTitles = [
    "escrow officer",
    "title officer",
    "closing attorney",
    "real estate attorney",
    "loan officer",
    "mortgage broker",
    "appraiser",
    "home inspector",
    "insurance agent",
    "contractor",
    "architect",
    "attorney",
    "lawyer",
  ];

  vendorTitles.forEach((titleKeyword) => {
    if (title.includes(titleKeyword)) {
      vendorConfidence += 50;
      reasons.push(`Professional service title: ${titleKeyword}`);
    }
  });

  // Vendor tags and groups
  if (tags.includes("vendor")) {
    vendorConfidence += 40;
    reasons.push("Existing vendor tags");
  }
  if (groups.includes("vendor")) {
    vendorConfidence += 40;
    reasons.push("Existing vendor groups");
  }

  // Apply past client penalty (matches ContactCategorizer)
  if (isPastClient) {
    vendorConfidence -= 50;
    agentConfidence -= 50;
    reasons.push("Past client detected - confidence reduced");
  }

  // DECISION LOGIC (matches ContactCategorizer exactly)
  const AGENT_THRESHOLD = 35;
  const VENDOR_THRESHOLD = 40;

  // Direct indicators override scoring
  if (groups.includes("agent")) {
    return {
      category: "Agent",
      agentConfidence: 100,
      vendorConfidence,
      reasons: ["Existing agent group"],
    };
  }

  // Check for known agent domains and keywords
  for (const email of emails) {
    const lowerEmail = email.toLowerCase();

    if (
      lowerEmail.includes("@compass.com") ||
      lowerEmail.includes("@elliman.com") ||
      lowerEmail.includes("@corcoran.com") ||
      lowerEmail.includes("realtor") ||
      lowerEmail.includes("realestate") ||
      (lowerEmail.includes("agent") && !lowerEmail.includes("mortgage"))
    ) {
      return {
        category: "Agent",
        agentConfidence: 100,
        vendorConfidence,
        reasons: [`Direct indicator: ${email}`],
      };
    }
  }

  // Check for direct company match
  const exactCompanyMatches = [
    "compass",
    "corcoran",
    "douglas elliman",
    "berkshire hathaway",
    "keller williams",
    "re/max",
    "remax",
    "sotheby's",
    "sothebys",
    "coldwell banker",
    "century 21",
  ];

  for (const exactMatch of exactCompanyMatches) {
    if (company === exactMatch) {
      return {
        category: "Agent",
        agentConfidence: 100,
        vendorConfidence,
        reasons: [`Direct company match: ${company}`],
      };
    }
  }

  // Use confidence scoring
  if (
    agentConfidence >= AGENT_THRESHOLD &&
    vendorConfidence >= VENDOR_THRESHOLD
  ) {
    category = agentConfidence > vendorConfidence ? "Agent" : "Vendor";
  } else if (agentConfidence >= AGENT_THRESHOLD) {
    category = "Agent";
  } else if (vendorConfidence >= VENDOR_THRESHOLD) {
    category = "Vendor";
  }

  // Override to Contact if past client
  if (isPastClient && (category === "Agent" || category === "Vendor")) {
    const originalCategory = category;
    category = "Contact";
    reasons = [
      `Maintained as Contact (overriding ${originalCategory} because past client)`,
    ];
  }

  return {
    category,
    agentConfidence,
    vendorConfidence,
    reasons: reasons.slice(0, 3),
  };
};

const applyCategories = (rows) => {
  return rows.map((row) => {
    const result = categorizeContact(row);

    // Get existing groups
    const originalGroups = (row["Groups"] || "")
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g !== "");

    const newGroups = [...originalGroups];

    // Add group based on category
    if (
      result.category === "Agent" &&
      !originalGroups.some((g) => g.toLowerCase() === "agents")
    ) {
      newGroups.push("Agents");
    } else if (
      result.category === "Vendor" &&
      !originalGroups.some((g) => g.toLowerCase() === "vendors")
    ) {
      newGroups.push("Vendors");
    } else if (
      result.category === "Contact" &&
      !originalGroups.some((g) => g.toLowerCase() === "leads")
    ) {
      newGroups.push("Leads");
    }

    return {
      ...row,
      Category: result.category,
      Groups: newGroups.join(", "),
    };
  });
};

/**
 * Full auto-processing pipeline
 * Takes compass formatted data and runs it through exact duplicate tagging and categorization logic
 */
export const autoProcessCompassData = (compassData) => {
  // Step 1: Tag duplicates (exact SimpleDuplicateTagger logic)
  const withDuplicates = tagDuplicates(compassData);

  // Step 2: Categorize contacts (exact ContactCategorizer logic)
  const withCategories = applyCategories(withDuplicates);

  return withCategories;
};

/**
 * Download processed data as CSV
 * If hideCategoryColumn is true, removes the Category column from output
 */
export const downloadProcessedCSV = (
  data,
  filename = "processed_contacts.csv",
  hideCategoryColumn = false,
) => {
  let dataToExport = data;

  // Remove Category column if specified
  if (hideCategoryColumn) {
    dataToExport = data.map((row) => {
      const { Category, ...rest } = row;
      return rest;
    });
  }

  const csv = Papa.unparse(dataToExport);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    filename || `processed_${new Date().toISOString().split("T")[0]}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
