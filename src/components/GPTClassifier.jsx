import React, { useState } from "react";
import Papa from "papaparse";

const GPTClassifier = () => {
  const [file, setFile] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [ungroupedContacts, setUngroupedContacts] = useState([]);
  const [personalEmailContacts, setPersonalEmailContacts] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState(0);
  // Store original complete dataset for full export
  const [originalData, setOriginalData] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Personal email domains to skip
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

  // Test specific domains for debugging (moved inside file upload)
  const testBusinessDomains = () => {
    const testDomains = [
      "luxurypresence.com",
      "cj.com",
      "dfllp.com",
      "crexi.com",
      "sideinc.com",
    ];
    addLog(`🧪 Domain Test - Business domains should NOT be in personal list:`);
    testDomains.forEach((domain) => {
      const isPersonal = PERSONAL_DOMAINS.includes(domain);
      addLog(
        `   ${domain}: ${
          isPersonal ? "❌ PERSONAL (ERROR!)" : "✅ Business (Good)"
        }`
      );
    });
  };

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
    if (emails.length === 0) return true;
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

  // Test API key validity
  const testApiKey = async (key) => {
    try {
      addLog("Testing API key...");
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        addLog("✅ API key is valid");
        setIsApiKeyValid(true);
        return true;
      } else {
        const errorData = await response.json();
        addLog(
          `❌ API key invalid: ${errorData.error?.message || "Unknown error"}`
        );
        setIsApiKeyValid(false);
        return false;
      }
    } catch (error) {
      addLog(`❌ API key test failed: ${error.message}`);
      setIsApiKeyValid(false);
      return false;
    }
  };

  // Handle API key input
  const handleApiKeyChange = async (e) => {
    const key = e.target.value;
    setApiKey(key);

    if (key.startsWith("sk-") && key.length > 20) {
      await testApiKey(key);
    } else {
      setIsApiKeyValid(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      addLog(`File uploaded: ${uploadedFile.name}`);

      // Parse file to analyze ungrouped contacts
      Papa.parse(uploadedFile, {
        header: true,
        complete: (results) => {
          // Store the complete original dataset for full export
          setOriginalData(results.data);

          testBusinessDomains(); // Test domain classification first
          analyzeUngroupedContacts(results.data);
          analyzePersonalEmailContacts(results.data);
        },
        error: (error) => {
          addLog(`❌ File parsing error: ${error.message}`);
        },
      });
    }
  };

  // Analyze ungrouped contacts
  const analyzeUngroupedContacts = (data) => {
    addLog(`🔍 Starting analysis of ${data.length} total contacts...`);

    // Debug: Check CSV parsing and Groups values
    addLog(
      `🔍 CSV Column Headers: ${Object.keys(data[0] || {})
        .slice(0, 15)
        .join(", ")}...`
    );
    addLog(`🔍 Total columns in CSV: ${Object.keys(data[0] || {}).length}`);

    // Debug: Check first few contacts to see their Groups values
    addLog(`🔍 Sample Groups values from first 10 contacts:`);
    data.slice(0, 10).forEach((contact, idx) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      const name =
        `${contact["First Name"] || ""} ${contact["Last Name"] || ""}`.trim() ||
        "Unknown";
      addLog(`   ${idx + 1}. ${name}: Groups="${groups}"`);

      // Also check Tags vs Groups columns for first few contacts
      if (idx < 5) {
        const tags = (contact["Tags"] || "").trim();
        const groups = (contact["Groups"] || "").trim();
        addLog(`      Tags: "${tags}"`);
        addLog(`      Groups: "${groups}"`);
        addLog(`      ---`);
      }
    });

    // Step-by-step filtering with counts
    const step1_allContacts = data.length;

    const step2_groupFiltered = data.filter((contact) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      return groups === "" || groups === "ALL CONTACTS";
    });
    addLog(`🔍 Step 1: ${step1_allContacts} total contacts`);
    addLog(
      `🔍 Step 2: ${step2_groupFiltered.length} contacts after group filter (empty or 'ALL CONTACTS')`
    );

    const step3_businessEmailFiltered = step2_groupFiltered.filter(
      (contact, index) => {
        const emails = getAllEmails(contact);
        const hasBusiness = hasBusinessEmail(emails);
        const name =
          `${contact["First Name"] || ""} ${
            contact["Last Name"] || ""
          }`.trim() || "Unknown";

        // Debug first few contacts that are being excluded
        if (!hasBusiness && index < 5) {
          addLog(`🔍 EXCLUDED (no business email): ${name}`);
          addLog(`   All emails found: ${emails.join(", ") || "NONE"}`);
        }

        // Debug first few contacts that ARE included
        if (hasBusiness && index < 5) {
          addLog(`🔍 INCLUDED (has business email): ${name}`);
          addLog(`   All emails found: ${emails.join(", ")}`);
        }

        return hasBusiness;
      }
    );
    addLog(
      `🔍 Step 3: ${step3_businessEmailFiltered.length} contacts after business email filter`
    );

    const ungrouped = step3_businessEmailFiltered.filter((contact) => {
      const emails = getAllEmails(contact);
      const name = `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim();

      // Debug specific contacts
      if (
        name.toLowerCase().includes("drew") ||
        emails.some((e) => e.includes("luxurypresence"))
      ) {
        addLog(`🔍 DEBUG Drew/LuxuryPresence: ${name}`);
        addLog(`   All emails: ${emails.join(", ")}`);
        addLog(`   Has business email: ${hasBusinessEmail(emails)}`);
        addLog(`   Only personal emails: ${hasOnlyPersonalEmails(emails)}`);

        emails.forEach((email) => {
          const domain = getEmailDomain(email);
          const isPersonal = PERSONAL_DOMAINS.includes(domain);
          addLog(`   ${email} -> domain: ${domain}, personal: ${isPersonal}`);
        });
      }

      // Must have some contact info - either a name OR business emails for classification
      if (!name || name.trim() === "") {
        // If no name, must have business emails to be worth classifying
        if (emails.length === 0) {
          addLog(
            `⚠️ EXCLUDED (no name, no emails): Contact with no identifying information`
          );
          return false;
        }

        // Check if the emails include at least one business email
        if (!hasBusinessEmail(emails)) {
          addLog(
            `⚠️ EXCLUDED (no name, only personal emails): Contact with emails ${emails.join(
              ", "
            )} but no name and no business emails`
          );
          return false;
        }

        // Allow nameless contacts if they have business emails (domain-based classification can work)
        addLog(
          `✅ INCLUDED (no name, has business emails): Contact with business emails ${emails.join(
            ", "
          )} - can classify by domain`
        );
      } else {
        // Additional check for contacts with names: must have at least first OR last name (not just empty spaces)
        const firstName = (contact["First Name"] || "").trim();
        const lastName = (contact["Last Name"] || "").trim();
        if (!firstName && !lastName) {
          addLog(
            `⚠️ EXCLUDED (empty name fields): Contact with empty first/last name fields but name="${name}"`
          );
          return false;
        }
      }

      return true;
    });

    addLog(
      `🔍 Step 4: ${ungrouped.length} contacts after final contact info filter`
    );

    // Debug filter results
    const totalContacts = data.length;
    const groupedContacts = data.filter((contact) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      return groups !== "" && groups !== "ALL CONTACTS";
    }).length;
    const allContactsGroup = data.filter((contact) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      return groups === "ALL CONTACTS";
    }).length;
    const ungroupedButNoBusinessEmail = data.filter((contact) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      const emails = getAllEmails(contact);
      return (
        (groups === "" || groups === "ALL CONTACTS") &&
        !hasBusinessEmail(emails)
      );
    }).length;
    const ungroupedButNoContactInfo = data.filter((contact) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      const emails = getAllEmails(contact);
      const name = `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim();
      return (
        (groups === "" || groups === "ALL CONTACTS") &&
        hasBusinessEmail(emails) &&
        !name &&
        emails.length === 0
      );
    }).length;

    addLog(`📊 Filter Analysis:`);
    addLog(`   Total contacts: ${totalContacts}`);
    addLog(`   Already grouped (meaningful groups): ${groupedContacts}`);
    addLog(
      `   "ALL CONTACTS" group (treated as ungrouped): ${allContactsGroup}`
    );
    addLog(
      `   Ungrouped but no business email: ${ungroupedButNoBusinessEmail}`
    );
    addLog(`   Ungrouped but no contact info: ${ungroupedButNoContactInfo}`);
    addLog(`   Final ungrouped with business emails: ${ungrouped.length}`);

    setUngroupedContacts(ungrouped);
    setEstimatedCost(ungrouped.length * 0.001); // Rough estimate
    addLog(
      `✅ Found ${ungrouped.length} ungrouped contacts with business emails`
    );

    // Debug: Log some example contacts for verification
    if (ungrouped.length > 0) {
      addLog(`📧 Example business email contacts:`);
      ungrouped.slice(0, 5).forEach((contact, idx) => {
        const emails = getAllEmails(contact);
        const businessEmails = emails.filter((email) => {
          const domain = getEmailDomain(email);
          return !PERSONAL_DOMAINS.includes(domain);
        });
        const name =
          `${contact["First Name"] || ""} ${
            contact["Last Name"] || ""
          }`.trim() || "Unknown";
        addLog(`   ${idx + 1}. ${name}: ${businessEmails.join(", ")}`);
      });
    }
  };

  // Analyze ungrouped contacts with only personal emails (for Leads)
  const analyzePersonalEmailContacts = (data) => {
    const personalEmailContacts = data.filter((contact) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      const emails = getAllEmails(contact);

      // Must be ungrouped (treat "ALL CONTACTS" as ungrouped since it's just a default category)
      if (groups !== "" && groups !== "ALL CONTACTS") return false;

      // Must have ONLY personal emails (no business emails)
      if (!hasOnlyPersonalEmails(emails)) return false;

      // Must have some contact info - either a name OR emails for leads classification
      const name = `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim();
      if (!name || name.trim() === "") {
        // If no name, must have emails to be worth classifying as leads
        if (emails.length === 0) {
          return false;
        }
        // For leads, we accept nameless contacts with personal emails
      } else {
        // Additional check for contacts with names: must have at least first OR last name (not just empty spaces)
        const firstName = (contact["First Name"] || "").trim();
        const lastName = (contact["Last Name"] || "").trim();
        if (!firstName && !lastName) {
          return false;
        }
      }

      return true;
    });

    setPersonalEmailContacts(personalEmailContacts);
    addLog(
      `Found ${personalEmailContacts.length} ungrouped contacts with only personal emails (for Leads group)`
    );
  };

  // Classify contact with ChatGPT (with timeout and retry)
  const classifyWithGPT = async (contact, retryCount = 0) => {
    const contactInfo = {
      name: `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim(),
      company: contact["Company"] || "",
      title: contact["Title"] || contact["Job Title"] || "",
      email: getAllEmails(contact).join(", "),
      notes: contact["Notes"] || contact["Key Background Info"] || "",
      tags: contact["Tags"] || "",
      groups: contact["Groups"] || contact["Group"] || "",
    };

    const prompt = `You are a real estate industry expert. Classify this contact as Agent, Vendor, or Contact.

CONTACT DATA:
Name: ${contactInfo.name}
Company: ${contactInfo.company}  
Title: ${contactInfo.title}
Email: ${contactInfo.email}
Notes: ${contactInfo.notes}
Tags: ${contactInfo.tags}
Groups: ${contactInfo.groups}

MANDATORY CLASSIFICATION RULES:

**Agent** = Anyone who sells/lists real estate
- Real estate agents, brokers, realtors, team members
- Anyone at brokerages (Keller Williams, RE/MAX, Compass, Coldwell Banker, etc.)
- Independent agents with personal websites
- Email domains like: kw.com, remax.com, compass.com, coldwellbanker.com
- Business emails from real estate companies
- If unclear but likely sells real estate → DEFAULT TO AGENT

**Vendor** = Service providers to real estate industry
- Law firms, attorneys, title companies (dfllp.com, touchstoneclosing.com)
- Marketing/tech platforms (luxurypresence.com, sideinc.com, setschedule.com)  
- Lenders, mortgage brokers, appraisers
- Contractors, builders, inspectors, photographers
- Coaches, consultants, trainers for real estate
- ANY business serving real estate professionals

**Contact** = ONLY for non-real estate connections
- Personal contacts with no real estate tie
- Clearly non-real estate businesses
- Use SPARINGLY - only when certain NO real estate connection exists

CRITICAL ANALYSIS RULES:
1. **Domain Research**: Analyze email domains intelligently
   - cj.com = Likely Coldwell Banker affiliate → AGENT
   - luxurypresence.com = RE marketing platform → VENDOR
   - sideinc.com = RE technology platform → VENDOR
   - Law firm domains → VENDOR
   - Unknown business domains with RE context → AGENT

2. **Default Aggressive Classification**:
   - Business email + professional name = Likely AGENT or VENDOR
   - When unsure between Agent/Vendor, choose based on domain/context
   - Only use Contact if absolutely no real estate connection

3. **Specific Examples**:
   - costa.angelakis@cj.com → Business email, likely CJ affiliate → AGENT
   - drew@luxurypresence.com → Marketing platform → VENDOR  
   - Professional names with business emails → AGENT (unless clearly vendor)

DECISION MANDATE: Be aggressive in finding real estate connections. This is a real estate professional's contact list - most contacts should be Agent or Vendor. Only use Contact for clear non-real estate connections.

Respond with exactly one word: Agent, Vendor, or Contact`;

    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("API call timeout (30s)")), 30000)
    );

    try {
      // Race between the API call and timeout
      const response = await Promise.race([
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 10,
            temperature: 0.3,
          }),
        }),
        timeoutPromise,
      ]);

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = `API Error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`;

        // Retry on certain errors
        if (
          retryCount < 2 &&
          (response.status === 429 || response.status >= 500)
        ) {
          addLog(
            `⏳ Retrying API call (attempt ${
              retryCount + 1
            }/3): ${errorMessage}`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, (retryCount + 1) * 2000)
          );
          return await classifyWithGPT(contact, retryCount + 1);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const classification = data.choices?.[0]?.message?.content?.trim();

      if (["Agent", "Vendor", "Contact"].includes(classification)) {
        return classification;
      } else {
        addLog(`⚠️ Invalid GPT response: ${classification}`);
        return null;
      }
    } catch (error) {
      if (
        retryCount < 2 &&
        (error.message.includes("timeout") || error.message.includes("network"))
      ) {
        addLog(
          `⏳ Retrying API call (attempt ${retryCount + 1}/3): ${error.message}`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 2000)
        );
        return await classifyWithGPT(contact, retryCount + 1);
      }

      addLog(`❌ GPT API error (final): ${error.message}`);
      throw error;
    }
  };

  // Process contacts in parallel chunks (with robust timeout and error handling)
  const processContactChunk = async (contacts, chunkIndex, totalChunks) => {
    const results = [];

    addLog(
      `🔄 [Chunk ${chunkIndex + 1}/${totalChunks}] Starting ${
        contacts.length
      } contacts...`
    );

    // Create timeout for entire chunk (5 minutes max per chunk)
    const chunkTimeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Chunk ${chunkIndex + 1} timeout (5 minutes)`)),
        300000
      )
    );

    // Process contacts in parallel within the chunk (respecting rate limits)
    const promises = contacts.map(async (contact, index) => {
      const contactName =
        `${contact["First Name"] || ""} ${contact["Last Name"] || ""}`.trim() ||
        "Unknown";

      try {
        // Staggered delay to spread out API calls (avoid hitting rate limits)
        await new Promise((resolve) => setTimeout(resolve, index * 150)); // Increased from 100ms

        addLog(`⏳ [Chunk ${chunkIndex + 1}] Processing ${contactName}...`);

        const gptResult = await classifyWithGPT(contact);

        // Debug: Log the classification result
        addLog(`🤖 GPT classified ${contactName}: "${gptResult}"`);

        if (gptResult === "Agent" || gptResult === "Vendor") {
          // Create updated contact with GPT classification
          const updatedContact = { ...contact };
          updatedContact["Category"] = gptResult;
          updatedContact["Groups"] =
            gptResult === "Agent" ? "Agents" : "Vendors";
          updatedContact["Changes Made"] = updatedContact["Changes Made"]
            ? `${updatedContact["Changes Made"]}; Category=${gptResult} (GPT-classified)`
            : `Category=${gptResult} (GPT-classified)`;
          updatedContact["Tags"] = updatedContact["Tags"]
            ? `${updatedContact["Tags"]}, GPT-classified`
            : "GPT-classified";

          return {
            contact: updatedContact,
            result: gptResult,
            contactName,
            success: true,
          };
        } else {
          return {
            contact: null,
            result: "Contact",
            contactName,
            success: true,
          };
        }
      } catch (error) {
        addLog(
          `❌ [Chunk ${chunkIndex + 1}] ${contactName} failed: ${error.message}`
        );
        return {
          contact: null,
          result: "Contact",
          contactName,
          success: false,
          error: error.message,
        };
      }
    });

    let chunkResults;
    try {
      // Race between chunk processing and timeout
      chunkResults = await Promise.race([
        Promise.all(promises),
        chunkTimeoutPromise,
      ]);

      addLog(
        `✅ [Chunk ${
          chunkIndex + 1
        }/${totalChunks}] All contacts processed successfully`
      );
    } catch (error) {
      addLog(
        `💥 [Chunk ${chunkIndex + 1}/${totalChunks}] Chunk failed: ${
          error.message
        }`
      );

      // If chunk times out, try to get partial results
      const partialResults = await Promise.allSettled(promises);
      chunkResults = partialResults.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            contact: null,
            result: "Contact",
            contactName: "Unknown",
            success: false,
            error: result.reason?.message || "Unknown error",
          };
        }
      });

      addLog(
        `⚠️ [Chunk ${chunkIndex + 1}] Recovered ${
          chunkResults.filter((r) => r.success).length
        }/${contacts.length} contacts`
      );
    }

    // Process results and collect classified contacts
    const classifiedResults = [];
    for (const result of chunkResults) {
      if (result.success) {
        if (result.contact) {
          classifiedResults.push(result.contact);
          addLog(
            `✅ [Chunk ${chunkIndex + 1}/${totalChunks}] ${
              result.contactName
            }: ${result.result}`
          );
        } else {
          addLog(
            `➡️ [Chunk ${chunkIndex + 1}/${totalChunks}] ${
              result.contactName
            }: Contact (no change)`
          );
        }
      } else {
        addLog(
          `❌ [Chunk ${chunkIndex + 1}/${totalChunks}] Failed to classify ${
            result.contactName
          }: ${result.error}`
        );
      }
    }

    return {
      classifiedContacts: classifiedResults,
      totalProcessed: chunkResults.length,
      agents: chunkResults.filter((r) => r.result === "Agent").length,
      vendors: chunkResults.filter((r) => r.result === "Vendor").length,
      contacts: chunkResults.filter((r) => r.result === "Contact").length,
      errors: chunkResults.filter((r) => !r.success).length,
    };
  };

  // Process ungrouped contacts with GPT (parallel chunk processing)
  const processWithGPT = async () => {
    if (!isApiKeyValid || ungroupedContacts.length === 0) return;

    setProcessing(true);
    setProgress(0);

    // Configuration for parallel processing
    const CHUNK_SIZE = 5; // Process 5 contacts in parallel per chunk
    const CHUNK_DELAY = 2000; // 2 second delay between chunks to respect rate limits

    const chunks = [];
    for (let i = 0; i < ungroupedContacts.length; i += CHUNK_SIZE) {
      chunks.push(ungroupedContacts.slice(i, i + CHUNK_SIZE));
    }

    addLog(
      `🚀 Starting FAST GPT classification of ${ungroupedContacts.length} contacts...`
    );
    addLog(
      `📦 Processing in ${chunks.length} chunks of ${CHUNK_SIZE} contacts each`
    );
    addLog(
      `⚡ Estimated time: ${Math.ceil(
        (chunks.length * CHUNK_DELAY) / 1000 / 60
      )} minutes (vs ${Math.ceil(
        (ungroupedContacts.length * 350) / 1000 / 60
      )} minutes sequentially)`
    );

    const allClassifiedContacts = [];
    let totalProcessed = 0;
    let totalAgents = 0;
    let totalVendors = 0;
    let totalContacts = 0;
    let totalErrors = 0;

    try {
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        addLog(
          `📦 Processing chunk ${chunkIndex + 1}/${chunks.length} (${
            chunk.length
          } contacts)...`
        );

        // Process this chunk in parallel
        const chunkResult = await processContactChunk(
          chunk,
          chunkIndex,
          chunks.length
        );

        // Accumulate results
        allClassifiedContacts.push(...chunkResult.classifiedContacts);
        totalProcessed += chunkResult.totalProcessed;
        totalAgents += chunkResult.agents;
        totalVendors += chunkResult.vendors;
        totalContacts += chunkResult.contacts;
        totalErrors += chunkResult.errors;

        // Update progress
        setProgress((totalProcessed / ungroupedContacts.length) * 100);

        addLog(
          `✅ Chunk ${chunkIndex + 1} complete: ${chunkResult.agents} agents, ${
            chunkResult.vendors
          } vendors, ${chunkResult.contacts} contacts, ${
            chunkResult.errors
          } errors`
        );

        // Delay between chunks to respect OpenAI's rate limits
        if (chunkIndex < chunks.length - 1) {
          addLog(`⏳ Waiting ${CHUNK_DELAY / 1000}s before next chunk...`);
          await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY));
        }
      }

      setResults({
        classifiedContacts: allClassifiedContacts,
        stats: {
          total: totalProcessed,
          agents: totalAgents,
          vendors: totalVendors,
          contacts: totalContacts,
          errors: totalErrors,
        },
      });

      addLog(`🎯 FAST GPT Classification Complete!`);
      addLog(
        `📊 Final Results: ${totalAgents} Agents, ${totalVendors} Vendors, ${totalContacts} Contacts`
      );
      addLog(
        `📈 Classification Rate: ${Math.round(
          ((totalAgents + totalVendors) / totalProcessed) * 100
        )}% classified as Agent/Vendor`
      );
      if (totalErrors > 0) {
        addLog(`⚠️ ${totalErrors} contacts failed to classify (API errors)`);
      }

      const actualTimeMinutes = Math.ceil(
        (chunks.length * CHUNK_DELAY) / 1000 / 60
      );
      const sequentialTimeMinutes = Math.ceil(
        (ungroupedContacts.length * 350) / 1000 / 60
      );
      addLog(
        `⚡ Completed in ~${actualTimeMinutes} minutes (vs ~${sequentialTimeMinutes} minutes sequentially)`
      );
      addLog(
        `🚀 Speed improvement: ~${Math.round(
          sequentialTimeMinutes / actualTimeMinutes
        )}x faster!`
      );
    } catch (error) {
      addLog(`❌ Processing failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Export only classified results
  const exportClassifiedOnly = () => {
    if (!results || results.classifiedContacts.length === 0) {
      addLog("❌ No classified results to export");
      return;
    }

    const csv = Papa.unparse(results.classifiedContacts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `gpt_classified_only_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog("📁 GPT classified contacts (changes only) exported successfully");
  };

  // Export all records including original and classified
  const exportAllRecords = () => {
    // Use originalData if available, otherwise fall back to ungroupedContacts
    const dataToExport =
      originalData.length > 0 ? originalData : ungroupedContacts;

    if (!dataToExport.length) {
      addLog("❌ No original data available to export");
      return;
    }

    addLog("📋 Preparing complete dataset export...");

    // Create a map of classified contacts by name for quick lookup
    const classifiedMap = new Map();
    if (results && results.classifiedContacts.length > 0) {
      results.classifiedContacts.forEach((contact, index) => {
        const firstName = (contact["First Name"] || "").trim();
        const lastName = (contact["Last Name"] || "").trim();

        // Handle contacts without names by using email as primary identifier
        if (!firstName && !lastName) {
          const emails = getAllEmails(contact);
          if (emails.length === 0) {
            addLog(
              `⚠️ Export Warning: Skipping classified contact with no name and no emails (index ${index})`
            );
            return;
          }
          // Use email as the key for nameless contacts
          const key = `NAMELESS_${emails[0]}_${index}`.toLowerCase();
          classifiedMap.set(key, contact);
          addLog(`📝 Export: Mapped nameless contact by email: ${emails[0]}`);
          return;
        }

        // Create a more robust key that includes email as backup identifier
        const emails = getAllEmails(contact);
        const primaryEmail = emails.length > 0 ? emails[0] : "";
        const key = `${firstName}_${lastName}_${primaryEmail}`.toLowerCase();

        // Check for key collisions
        if (classifiedMap.has(key)) {
          addLog(
            `⚠️ Export Warning: Duplicate key detected for ${firstName} ${lastName}, using index suffix`
          );
          classifiedMap.set(`${key}_${index}`, contact);
        } else {
          classifiedMap.set(key, contact);
        }
      });
    }

    // Merge original data with classified results
    const allRecords = dataToExport.map((originalContact) => {
      const firstName = (originalContact["First Name"] || "").trim();
      const lastName = (originalContact["Last Name"] || "").trim();

      // For contacts without names, try to match by email
      if (!firstName && !lastName) {
        const emails = getAllEmails(originalContact);
        if (emails.length > 0) {
          // Try to find classified version by email
          const emailKey = `NAMELESS_${emails[0]}_`.toLowerCase();
          for (const [mapKey, contact] of classifiedMap.entries()) {
            if (mapKey.startsWith(emailKey)) {
              addLog(
                `📝 Export: Matched nameless contact by email: ${emails[0]}`
              );
              return contact;
            }
          }
        }

        // No classified version found, return original unchanged
        const unchangedContact = { ...originalContact };
        if (!unchangedContact["Category"]) unchangedContact["Category"] = "";
        if (!unchangedContact["Groups"]) unchangedContact["Groups"] = "";
        if (!unchangedContact["Tags"]) unchangedContact["Tags"] = "";
        if (!unchangedContact["Changes Made"])
          unchangedContact["Changes Made"] = "";
        return unchangedContact;
      }

      // Create matching key for contacts with names
      const emails = getAllEmails(originalContact);
      const primaryEmail = emails.length > 0 ? emails[0] : "";
      const key = `${firstName}_${lastName}_${primaryEmail}`.toLowerCase();

      let classifiedContact = classifiedMap.get(key);

      // Try without email if no exact match found
      if (!classifiedContact) {
        const keyWithoutEmail = `${firstName}_${lastName}_`.toLowerCase();
        for (const [mapKey, contact] of classifiedMap.entries()) {
          if (mapKey.startsWith(keyWithoutEmail)) {
            classifiedContact = contact;
            break;
          }
        }
      }

      if (classifiedContact) {
        // Return the classified version (with updates)
        return classifiedContact;
      } else {
        // Return original contact unchanged (ensure it has expected fields)
        const unchangedContact = { ...originalContact };
        if (!unchangedContact["Category"]) unchangedContact["Category"] = "";
        if (!unchangedContact["Groups"]) unchangedContact["Groups"] = "";
        if (!unchangedContact["Tags"]) unchangedContact["Tags"] = "";
        if (!unchangedContact["Changes Made"])
          unchangedContact["Changes Made"] = "";
        return unchangedContact;
      }
    });

    const csv = Papa.unparse(allRecords);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `all_contacts_with_gpt_updates_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const classifiedCount = results ? results.classifiedContacts.length : 0;
    const unchangedCount = allRecords.length - classifiedCount;
    addLog(`📁 Complete dataset exported successfully!`);
    addLog(`📊 Export summary: ${allRecords.length} total contacts`);
    addLog(`   ✅ ${classifiedCount} contacts with GPT classifications`);
    addLog(`   ➡️ ${unchangedCount} contacts unchanged`);
    addLog(
      `   📋 Includes ALL contacts from original file (grouped + ungrouped)`
    );
  };

  // Clear data
  const clearData = () => {
    setFile(null);
    setResults(null);
    setUngroupedContacts([]);
    setPersonalEmailContacts([]);
    setOriginalData([]);
    setEstimatedCost(0);
    setProgress(0);
    setLogs([]);
    addLog("Data cleared");
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🤖 GPT Contact Classifier
        </h1>
        <p className="text-gray-600 mb-8">
          Use AI to classify ungrouped contacts with business emails as Agents
          or Vendors
        </p>

        {/* API Key Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            🔑 OpenAI API Configuration
          </h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              className="w-full p-3 border rounded-lg"
            />
            <div className="flex items-center mt-2">
              {isApiKeyValid ? (
                <span className="text-green-600 text-sm">
                  ✅ API key is valid
                </span>
              ) : apiKey ? (
                <span className="text-red-600 text-sm">❌ Invalid API key</span>
              ) : (
                <span className="text-gray-500 text-sm">
                  Enter your OpenAI API key
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your API key is never stored and only used for classification
              requests
            </p>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📁 Upload Contact File</h2>
          <div className="mb-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full p-3 border rounded-lg"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">📄 File: {file.name}</p>
            )}
          </div>
        </div>

        {/* Analysis Section */}
        {ungroupedContacts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📊 Analysis Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {ungroupedContacts.length}
                </div>
                <div className="text-sm text-gray-600">Ungrouped Contacts</div>
                <div className="text-xs text-gray-500">
                  with business emails
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${estimatedCost.toFixed(3)}
                </div>
                <div className="text-sm text-gray-600">Estimated Cost</div>
                <div className="text-xs text-gray-500">USD (approximate)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.ceil(
                    (Math.ceil(ungroupedContacts.length / 5) * 2000) / 1000 / 60
                  )}
                  m
                </div>
                <div className="text-sm text-gray-600">Estimated Time</div>
                <div className="text-xs text-gray-500">
                  parallel processing ⚡
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <strong>🚀 Fast Parallel Processing Rules:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Only processes contacts with empty "Groups" field</li>
                <li>
                  Skips contacts with only personal emails (Gmail, Yahoo, etc.)
                </li>
                <li>Preserves all existing categorizations and data</li>
                <li>
                  ⚡ Processes 5 contacts in parallel per chunk (5x faster!)
                </li>
                <li>Smart rate limiting to respect OpenAI API limits</li>
                <li>Real-time progress tracking with chunk-by-chunk updates</li>
              </ul>
            </div>

            <button
              onClick={processWithGPT}
              disabled={
                !isApiKeyValid || processing || ungroupedContacts.length === 0
              }
              className={`w-full py-3 px-4 rounded-lg font-semibold ${
                isApiKeyValid && !processing && ungroupedContacts.length > 0
                  ? "bg-blue-500 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {processing
                ? `Processing... (${Math.floor(progress)}%)`
                : `🚀 Classify ${ungroupedContacts.length} Contacts with GPT`}
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
                {Math.floor(progress)}% complete - Processing contact{" "}
                {Math.floor((progress / 100) * ungroupedContacts.length)} of{" "}
                {ungroupedContacts.length}
              </p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              🎯 Classification Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.stats.total}
                </div>
                <div className="text-sm text-gray-600">Total Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {results.stats.agents}
                </div>
                <div className="text-sm text-gray-600">New Agents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results.stats.vendors}
                </div>
                <div className="text-sm text-gray-600">New Vendors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {results.stats.contacts}
                </div>
                <div className="text-sm text-gray-600">Remain Contacts</div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Export Buttons */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">
                  📥 Export Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <button
                      onClick={exportAllRecords}
                      className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
                    >
                      📋 Export All Records
                    </button>
                    <p className="text-xs text-gray-600">
                      Complete dataset with GPT updates merged in
                      <br />(
                      {originalData.length > 0
                        ? originalData.length
                        : ungroupedContacts.length}{" "}
                      total contacts - includes ALL original data)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={exportClassifiedOnly}
                      className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
                    >
                      🎯 Export Changes Only
                    </button>
                    <p className="text-xs text-gray-600">
                      Only contacts that were classified by GPT
                      <br />({results.classifiedContacts.length} classified
                      contacts)
                    </p>
                  </div>
                </div>
              </div>

              {/* Clear Data Button */}
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

export default GPTClassifier;
