import Papa from "papaparse";

/**
 * Automated Processing Pipeline
 * Orchestrates: PhoneConsolidator -> CsvFormatter -> SimpleDuplicateTagger -> ContactCategorizer -> LeadTagger
 */

export class ProcessingPipeline {
  constructor(onProgress) {
    this.onProgress = onProgress;
    this.logs = [];
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    this.onProgress?.({ type: "log", message: logEntry });
  }

  // ==================== STAGE 1: Phone Consolidator ====================
  async stage1PhoneConsolidation(followupbossFile, phoneFile) {
    this.log("🔄 STAGE 1: Phone Consolidation Starting...");
    this.onProgress?.({ type: "stage", stage: 1, total: 5 });

    return new Promise((resolve) => {
      Papa.parse(followupbossFile, {
        header: true,
        complete: (followupbossResults) => {
          Papa.parse(phoneFile, {
            header: true,
            complete: (phoneResults) => {
              try {
                const consolidatedData = this._consolidatePhones(
                  followupbossResults.data,
                  phoneResults.data,
                );
                this.log(
                  `✅ Stage 1 Complete: ${consolidatedData.length} contacts`,
                );
                resolve(consolidatedData);
              } catch (error) {
                this.log(`❌ Stage 1 Error: ${error.message}`);
                resolve([]);
              }
            },
            error: (error) => {
              this.log(`❌ Phone file parse error: ${error.message}`);
              resolve([]);
            },
          });
        },
        error: (error) => {
          this.log(`❌ FollowUpBoss file parse error: ${error.message}`);
          resolve([]);
        },
      });
    });
  }

  _consolidatePhones(followupbossData, phoneData) {
    this.log(`📊 Processing ${followupbossData.length} FollowUpBoss contacts`);
    this.log(`📊 Processing ${phoneData.length} phone contacts`);

    // Create lookup maps
    const nameMap = new Map();
    const emailMap = new Map();

    // Build maps from phone data
    for (const contact of phoneData) {
      const firstName = (contact["First Name"] || "").trim();
      const lastName = (contact["Last Name"] || "").trim();
      const normalizedName =
        `${firstName.toLowerCase()} ${lastName.toLowerCase()}`.trim();

      if (normalizedName) {
        if (!nameMap.has(normalizedName)) {
          nameMap.set(normalizedName, []);
        }
        nameMap.get(normalizedName).push(contact);
      }

      // Extract emails from phone contact
      const emails = this._getAllEmails(contact);
      for (const email of emails) {
        const normalizedEmail = email.toLowerCase();
        if (!emailMap.has(normalizedEmail)) {
          emailMap.set(normalizedEmail, contact);
        }
      }
    }

    let phonesAdded = 0;
    const result = followupbossData.map((contact) => {
      const contactCopy = { ...contact };
      const hasPhones = this._getAllPhoneNumbers(contactCopy).length > 0;

      if (!hasPhones) {
        const firstName = (contactCopy["First Name"] || "").trim();
        const lastName = (contactCopy["Last Name"] || "").trim();
        const normalizedName =
          `${firstName.toLowerCase()} ${lastName.toLowerCase()}`.trim();

        // Try name match first
        if (normalizedName && nameMap.has(normalizedName)) {
          const phoneContacts = nameMap.get(normalizedName);
          const phoneNumbers = this._getAllPhoneNumbers(phoneContacts[0]);
          if (phoneNumbers.length > 0) {
            contactCopy["Mobile Phone"] = phoneNumbers[0];
            phonesAdded++;
          }
        } else {
          // Try email match
          const contactEmails = this._getAllEmails(contactCopy);
          for (const email of contactEmails) {
            if (emailMap.has(email.toLowerCase())) {
              const phoneContact = emailMap.get(email.toLowerCase());
              const phoneNumbers = this._getAllPhoneNumbers(phoneContact);
              if (phoneNumbers.length > 0) {
                contactCopy["Mobile Phone"] = phoneNumbers[0];
                phonesAdded++;
                break;
              }
            }
          }
        }
      }

      return contactCopy;
    });

    this.log(`📞 Added phone numbers to ${phonesAdded} contacts`);
    return result;
  }

  // ==================== STAGE 2: CSV Formatter ====================
  async stage2CsvFormatter(consolidatedData, homeAnniversaryFile) {
    this.log("🔄 STAGE 2: CSV Formatting Starting...");
    this.onProgress?.({ type: "stage", stage: 2, total: 5 });

    return new Promise((resolve) => {
      Papa.parse(homeAnniversaryFile, {
        header: true,
        complete: (results) => {
          try {
            const mergedData = this._mergeWithHomeAnniversaries(
              consolidatedData,
              results.data,
            );
            this.log(
              `✅ Stage 2 Complete: ${mergedData.length} contacts with anniversaries`,
            );
            resolve(mergedData);
          } catch (error) {
            this.log(`❌ Stage 2 Error: ${error.message}`);
            resolve(consolidatedData);
          }
        },
        error: (error) => {
          this.log(`❌ Home anniversary file parse error: ${error.message}`);
          resolve(consolidatedData);
        },
      });
    });
  }

  _mergeWithHomeAnniversaries(contacts, anniversaries) {
    this.log(
      `🏠 Merging with ${anniversaries.length} home anniversary records`,
    );

    // Create lookup by address
    const addressMap = new Map();
    for (const anniversary of anniversaries) {
      const address = (anniversary["Address"] || "").toLowerCase().trim();
      if (address) {
        if (!addressMap.has(address)) {
          addressMap.set(address, []);
        }
        addressMap.get(address).push(anniversary);
      }
    }

    let matched = 0;
    const result = contacts.map((contact) => {
      const contactCopy = { ...contact };
      const contactAddress = (contactCopy["Address"] || "")
        .toLowerCase()
        .trim();

      if (contactAddress && addressMap.has(contactAddress)) {
        const anniversaryData = addressMap.get(contactAddress)[0];
        // Add anniversary fields
        if (anniversaryData["Anniversary Date"]) {
          contactCopy["Anniversary Date"] = anniversaryData["Anniversary Date"];
          matched++;
        }
        if (anniversaryData["Property Type"]) {
          contactCopy["Property Type"] = anniversaryData["Property Type"];
        }
      }

      return contactCopy;
    });

    this.log(`🔗 Matched ${matched} contacts with anniversary data`);
    return result;
  }

  // ==================== STAGE 3: Simple Duplicate Tagger ====================
  async stage3DuplicateTagger(formattedData) {
    this.log("🔄 STAGE 3: Duplicate Detection Starting...");
    this.onProgress?.({ type: "stage", stage: 3, total: 5 });

    return new Promise((resolve) => {
      try {
        const dedupedData = this._identifyDuplicates(formattedData);
        this.log(
          `✅ Stage 3 Complete: ${dedupedData.length} deduplicated contacts`,
        );
        resolve(dedupedData);
      } catch (error) {
        this.log(`❌ Stage 3 Error: ${error.message}`);
        resolve(formattedData);
      }
    });
  }

  _identifyDuplicates(contacts) {
    const nameMap = new Map();
    const emailMap = new Map();
    let duplicateGroupsFound = 0;

    // Build maps and identify duplicates
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const firstName = (contact["First Name"] || "").trim().toLowerCase();
      const lastName = (contact["Last Name"] || "").trim().toLowerCase();
      const normalizedName = `${firstName} ${lastName}`.trim();

      // Tag by name
      if (normalizedName && normalizedName !== " ") {
        if (!nameMap.has(normalizedName)) {
          nameMap.set(normalizedName, []);
        }
        nameMap.get(normalizedName).push(i);
      }

      // Tag by email
      const emails = this._getAllEmails(contact);
      for (const email of emails) {
        const normalizedEmail = email.toLowerCase();
        if (!emailMap.has(normalizedEmail)) {
          emailMap.set(normalizedEmail, []);
        }
        emailMap.get(normalizedEmail).push(i);
      }
    }

    // Apply duplicate tags
    const result = contacts.map((contact, index) => {
      const contactCopy = { ...contact };
      let duplicateGroup = null;

      const firstName = (contactCopy["First Name"] || "").trim().toLowerCase();
      const lastName = (contactCopy["Last Name"] || "").trim().toLowerCase();
      const normalizedName = `${firstName} ${lastName}`.trim();

      if (normalizedName && nameMap.has(normalizedName)) {
        const indices = nameMap.get(normalizedName);
        if (indices.length > 1) {
          duplicateGroup = normalizedName;
        }
      }

      if (duplicateGroup) {
        contactCopy["Duplicate Group"] = duplicateGroup;
        contactCopy["Record Status"] = "Duplicate";
        duplicateGroupsFound++;
      }

      return contactCopy;
    });

    this.log(`🔀 Found ${duplicateGroupsFound} duplicate records`);
    return result;
  }

  // ==================== STAGE 4: Contact Categorizer ====================
  async stage4ContactCategorizer(dedupedData) {
    this.log("🔄 STAGE 4: Contact Categorization Starting...");
    this.onProgress?.({ type: "stage", stage: 4, total: 5 });

    return new Promise((resolve) => {
      try {
        const categorizedData = this._categorizeContacts(dedupedData);
        this.log(
          `✅ Stage 4 Complete: ${categorizedData.filter((c) => c.Category).length} categorized contacts`,
        );
        resolve(categorizedData);
      } catch (error) {
        this.log(`❌ Stage 4 Error: ${error.message}`);
        resolve(dedupedData);
      }
    });
  }

  _categorizeContacts(contacts) {
    const vendorKeywords = [
      "realtor",
      "broker",
      "agent",
      "mls",
      "mortgage",
      "title",
      "escrow",
      "loan",
      "banker",
      "lender",
      "inspector",
      "appraiser",
      "contractor",
      "vendor",
      "realestateagent",
      "realestatebusiness",
      "realestate",
    ];

    const agentDomains = [
      "zillow.com",
      "redfin.com",
      "realtor.com",
      "compass.com",
      "keller.com",
      "kw.com",
      "coldwellbanker.com",
      "century21.com",
      "trulia.com",
      "mls.com",
    ];

    let agents = 0;
    let vendors = 0;
    let contacts_count = 0;

    const result = contacts.map((contact) => {
      const contactCopy = { ...contact };

      // Skip if already categorized
      if (contactCopy["Category"] || contactCopy["CRM: Ungrouped > Agent"]) {
        return contactCopy;
      }

      let category = "Contact";
      const email = (contactCopy["Email"] || "").toLowerCase();
      const company = (contactCopy["Company"] || "").toLowerCase();
      const jobTitle = (contactCopy["Job Title"] || "").toLowerCase();

      // Check for agent indicators
      if (agentDomains.some((domain) => email.includes(domain))) {
        category = "Agent";
        agents++;
      } else if (
        company &&
        vendorKeywords.some((keyword) => company.includes(keyword))
      ) {
        category = "Vendor";
        vendors++;
      } else if (
        jobTitle &&
        vendorKeywords.some((keyword) => jobTitle.includes(keyword))
      ) {
        category = "Vendor";
        vendors++;
      } else if (
        email &&
        vendorKeywords.some((keyword) => email.includes(keyword))
      ) {
        category = "Vendor";
        vendors++;
      } else {
        category = "Contact";
        contacts_count++;
      }

      contactCopy["Category"] = category;
      return contactCopy;
    });

    this.log(
      `👤 Categorized: ${agents} Agents, ${vendors} Vendors, ${contacts_count} Contacts`,
    );
    return result;
  }

  // ==================== STAGE 5: Lead Tagger ====================
  async stage5LeadTagger(categorizedData) {
    this.log("🔄 STAGE 5: Lead Tagging Starting...");
    this.onProgress?.({ type: "stage", stage: 5, total: 5 });

    return new Promise((resolve) => {
      try {
        const taggedData = this._applyLeadTags(categorizedData);
        this.log(`✅ Stage 5 Complete: All contacts processed`);
        resolve(taggedData);
      } catch (error) {
        this.log(`❌ Stage 5 Error: ${error.message}`);
        resolve(categorizedData);
      }
    });
  }

  _applyLeadTags(contacts) {
    let businessEmailCount = 0;
    let personalEmailCount = 0;

    const result = contacts.map((contact) => {
      const contactCopy = { ...contact };
      const emails = this._getAllEmails(contactCopy);

      // Check email quality
      const businessEmailPatterns = [
        "@company.com",
        "@business.com",
        "@work.com",
        "@corp.com",
      ];
      const personalEmailPatterns = [
        "@gmail.com",
        "@yahoo.com",
        "@outlook.com",
      ];

      const hasBusinessEmail = emails.some((email) =>
        businessEmailPatterns.some((pattern) => email.includes(pattern)),
      );
      const hasPersonalEmail = emails.some((email) =>
        personalEmailPatterns.some((pattern) => email.includes(pattern)),
      );

      if (hasBusinessEmail) {
        contactCopy["Lead Type"] = "Business";
        businessEmailCount++;
      } else if (hasPersonalEmail) {
        contactCopy["Lead Type"] = "Personal";
        personalEmailCount++;
      } else if (emails.length > 0) {
        contactCopy["Lead Type"] = "Mixed";
      }

      // Add processing date
      contactCopy["Processed Date"] = new Date().toISOString().split("T")[0];

      return contactCopy;
    });

    this.log(
      `🏷️ Tagged: ${businessEmailCount} Business, ${personalEmailCount} Personal leads`,
    );
    return result;
  }

  // ==================== Helper Methods ====================
  _getAllPhoneNumbers(contact) {
    const phoneFields = [
      "Home Phone",
      "Mobile Phone",
      "Work Phone",
      "Phone",
      "Primary Home Phone",
      "Phone : mobile",
      "Phone : home",
      "Phone : work",
    ];

    const phones = [];
    for (const field of phoneFields) {
      const phone = (contact[field] || "").trim();
      if (phone && !phones.includes(phone)) {
        phones.push(phone);
      }
    }
    return phones;
  }

  _getAllEmails(contact) {
    const emailFields = [
      "Email",
      "Personal Email",
      "Work Email",
      "Business Email",
      "Email 2",
      "Email 3",
    ];

    const emails = [];
    for (const field of emailFields) {
      const email = (contact[field] || "").trim().toLowerCase();
      if (email && !emails.includes(email)) {
        emails.push(email);
      }
    }
    return emails;
  }

  /**
   * Execute the complete pipeline
   */
  async execute(followupbossFile, phoneFile, homeAnniversaryFile) {
    try {
      this.log("🚀 Starting Complete Processing Pipeline...");
      this.log(
        "Pipeline: Phone Consolidation → CSV Formatting → Duplicate Detection → Categorization → Lead Tagging",
      );

      // Stage 1: Phone Consolidation
      const stage1Result = await this.stage1PhoneConsolidation(
        followupbossFile,
        phoneFile,
      );
      if (!stage1Result.length) throw new Error("Stage 1 failed");

      // Stage 2: CSV Formatter
      const stage2Result = await this.stage2CsvFormatter(
        stage1Result,
        homeAnniversaryFile,
      );
      if (!stage2Result.length) throw new Error("Stage 2 failed");

      // Stage 3: Duplicate Tagger
      const stage3Result = await this.stage3DuplicateTagger(stage2Result);
      if (!stage3Result.length) throw new Error("Stage 3 failed");

      // Stage 4: Contact Categorizer
      const stage4Result = await this.stage4ContactCategorizer(stage3Result);
      if (!stage4Result.length) throw new Error("Stage 4 failed");

      // Stage 5: Lead Tagger
      const stage5Result = await this.stage5LeadTagger(stage4Result);
      if (!stage5Result.length) throw new Error("Stage 5 failed");

      this.log(
        "✅ PIPELINE COMPLETE - All processing stages finished successfully",
      );
      this.onProgress?.({ type: "complete", data: stage5Result });

      return stage5Result;
    } catch (error) {
      this.log(`❌ PIPELINE FAILED: ${error.message}`);
      this.onProgress?.({ type: "error", error: error.message });
      throw error;
    }
  }
}

/**
 * Convert array of objects to CSV
 */
export function convertToCSV(data) {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || "";
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        })
        .join(","),
    ),
  ].join("\n");

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent, filename = "processed_contacts.csv") {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
