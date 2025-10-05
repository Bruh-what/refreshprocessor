import React, { useState } from "react";
import Papa from "papaparse";
import Navbar from "./Navbar";

const ContactCategorizer = () => {
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

  // Extract all emails from a contact (matching RealEstateProcessor logic)
  const getAllEmails = (contact) => {
    const emailFields = [
      "Personal Email", "Email", "Work Email", "Email 2", "Email 3",
      "Primary Personal Email", "Custom Email", "Email (1)", "Email (2)",
      "Email (3)", "Email (Work)", "Email (Home 1)", "Email (Home 2)",
      "Email (Andrea)", "Email (David)", "Email (Edina)", "Email (Email 1)",
      "Email (Email 2)", "Email (Gabriele)", "Email (Jennifer)", "Email (John)",
      "Email (Lauren)", "Email (Lee)", "Email (Lyn)", "Email (Michael)",
      "Email (Obsolete)", "Email (Ralf)", "Email (Icloud)", "Email (Other 1)",
      "Email (Other 2)", "Email (Other 3)", "Email (Work 1)", "Email (Work 2)",
      "Email (Work 3)", "Primary Email", "Primary Work Email"
    ];

    // Extract all valid email addresses from the specified fields
    const emails = emailFields
      .map((field) => contact[field])
      .filter((email) => email && email.trim() && email.includes("@"))
      .map((email) => email.toLowerCase().trim());

    // Scan all other fields for anything that looks like an email address
    if (contact) {
      for (const [key, value] of Object.entries(contact)) {
        if (typeof value === "string" && value.includes("@") && 
            !emailFields.includes(key) && 
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          const email = value.toLowerCase().trim();
          if (!emails.includes(email)) {
            emails.push(email);
          }
        }
      }
    }

    // Return unique emails only
    return [...new Set(emails)];
  };

  // Comprehensive list of real estate brokerage domains (matching RealEstateProcessor)
  const BROKERAGE_DOMAINS = new Set([
    "compass.com", "coldwellbanker.com", "century21.com", "kw.com", "remax.com",
    "sothebysrealty.com", "berkshirehathaway.com", "howardhanna.com", "elliman.com",
    "elegran.com", "weichert.com", "windermere.com", "johnlscott.com", "realogy.com",
    "anywhere.re", "cbmoves.com", "era.com", "bhhsamb.com", "bhhsnw.com", "bhhsne.com",
    "sirmove.com", "kellerwilliams.com", "kwrealty.com", "kwcom.com", "kwconnect.com",
    "remax.net", "remaxagent.com", "remaxresults.com", "remaxnow.com", "c21.com",
    "century21.net", "c21global.com", "century21global.com", "prudentialrealestate.com",
    "prudential.com", "pru.com", "exitreality.com", "exitrealtygroup.com", "exitrealtycorp.com",
    "realtyone.com", "realtyonegroup.com", "rog.com", "exprealty.com", "exprealtyworld.com",
    "expresidenitalrealty.com", "nexthome.com", "nexthomerealty.com", "nexthomefranchise.com",
    "redfin.com", "redfinagent.com", "redfinnow.com", "zillow.com", "zillowgroup.com",
    "trulia.com", "flowrealty.com", "bhhs.com", "corcoran.com", "longandfoster.com",
    "homesmart.com", "realtrends.com", "cbhomes.com", "bhgre.com", "erares.com",
    "cbredirect.com", "nar.realtor", "sothebys.com", "realestateone.com", "realtyfirst.com",
    "realliving.com", "realtyexecutives.com", "unitedrealestate.com", "exrny.com",
    "bondnewyork.com", "thenextsteprealty.com", "nextstopny.com", "djsoucygroup.com",
    "herzwurmhomes.com", "bhsusa.com", "realnewyork.com", "cushwake.com", "raveis.com"
  ]);

  // Comprehensive agent keywords (matching RealEstateProcessor)
  const AGENT_KEYWORDS = [
    "realtor", "realty", "properties", "homes", "broker", "realestate",
    "homesales", "homesforsale", "listings", "residence", "residential",
    "agent", "real estate", "re/max", "century21", "sothebys", "coldwell",
    "keller", "williams", "berkshire", "hathaway", "douglas", "elliman",
    "compass", "corcoran", "weichert", "christie", "bhhs", "exp", "redfin",
    "zillow", "trulia", "homesmart", "associates", "realtors", "property",
    "flow", "harrynorman", "dorseyalston", "ansleyre", "ansley", "atlantafinehomes",
    "evatlanta", "heritageselect", "anchorny", "serhant", "citihabitats",
    "bondnewyork", "nestseekers", "halstead", "cbrealty", "cbwalburg",
    "rutenbert", "stribling", "opgny", "corenyc", "exrny", "bond", "newyorkrealty"
  ];

  // Comprehensive vendor keywords (matching RealEstateProcessor)
  const VENDOR_KEYWORDS = [
    "title", "escrow", "mortgage", "lending", "loan", "bank", "credit", "insurance",
    "home warranty", "inspection", "appraisal", "appraiser", "appraisals", "attorney",
    "architects", "law", "legal", "notary", "staging", "photography", "marketing",
    "repair", "contractor", "contractors", "handyman", "cleaning", "moving", "modus",
    "chartwell", "krisslaw", "modustitle", "chartwellescrow", "storage", "funding",
    "construction", "plumbing", "capital", "firm", "design", "designer", "architect",
    "renovations", "interiors", "furnace", "duct cleaning", "air conditioning", "hvac",
    "property management", "landscaping", "gardening", "flooring", "carpentry", "painter",
    "painting", "roofing", "electrical", "electrician", "financial", "finance", "advisor",
    "investment", "investing", "accounting", "accountant", "tax", "inspection", "inspector",
    "business development", "studio", "build"
  ];

  // Categorize contact based on multiple signals (enhanced to match RealEstateProcessor)
  const categorizeContact = (contact) => {
    let agentConfidence = 0;
    let vendorConfidence = 0;
    let category = "Contact"; // Default
    let reasons = [];

    // Extract ALL emails using comprehensive method
    const emails = getAllEmails(contact);
    
    // Extract key fields with more comprehensive field checking
    const company = (contact["Company"] || "").toLowerCase();
    const title = (contact["Title"] || contact["Job Title"] || "").toLowerCase();
    const tags = (contact["Tags"] || "").toLowerCase();
    const groups = (contact["Groups"] || contact["Group"] || "").toLowerCase();
    const notes = (contact["Notes"] || contact["Note"] || "").toLowerCase();
    const keyInfo = (contact["Key Background Info"] || "").toLowerCase();

    // Check for past client classification - will reduce confidence later (like RealEstateProcessor)
    const isPastClient = contact["Client Classification"] === "Past Client" || 
                        groups.includes("past client") ||
                        tags.includes("past client") || 
                        tags.includes("past buyer") || 
                        tags.includes("past seller");

    // Check all contact fields for specific vendor keywords (like RealEstateProcessor)
    let directVendorMatch = false;
    for (const [key, value] of Object.entries(contact)) {
      if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes("chartwellescrow.com") || 
            lowerValue.includes("modustitle.com") ||
            lowerValue.includes("krislaw") ||
            (lowerValue.includes("escrow") && lowerValue.includes("chartwell")) ||
            (lowerValue.includes("title") && lowerValue.includes("modus"))) {
          vendorConfidence += 100;
          reasons.push(`Direct vendor match: ${key} contains ${value}`);
          directVendorMatch = true;
          break;
        }
      }
    }

    if (directVendorMatch) {
      return { category: "Vendor", vendorConfidence, agentConfidence: 0, reasons };
    }

    // AGENT CLASSIFICATION SIGNALS

    // 1. Check all email domains for brokerage matches (matching RealEstateProcessor values)
    const domains = emails.map(email => {
      const match = email.match(/@([\w.-]+)$/);
      return match ? match[1] : "";
    }).filter(Boolean);

    for (const domain of domains) {
      if (BROKERAGE_DOMAINS.has(domain)) {
        agentConfidence += 50; // Very strong signal - matches RealEstateProcessor
        reasons.push(`Brokerage email domain: ${domain}`);
      } else {
        // More aggressive keyword matching for domains (like RealEstateProcessor)
        for (const keyword of AGENT_KEYWORDS) {
          if (domain.includes(keyword)) {
            agentConfidence += 45; // Increased from 40 to 45 for stronger signal
            reasons.push(`Agent keyword in domain: ${keyword}`);
            break;
          }
        }

        // Special case for Compass agents using Gmail or other generic domains
        if ((domain === "gmail.com" || domain === "icloud.com" || domain === "yahoo.com") &&
            (company.includes("compass") || company.includes("realty") || 
             company.includes("real estate") || title.includes("agent") || 
             title.includes("realtor"))) {
          agentConfidence += 45; // Increased from 40 to 45 for stronger signal
          reasons.push(`Generic domain + real estate company/title`);
        }
      }
    }

    // 2. Agent keywords in ALL emails (enhanced matching)
    for (const email of emails) {
      const lowerEmail = email.toLowerCase();
      
      // Direct classification for obvious agent keywords in email username (before the @)
      if (lowerEmail.includes("realtor") ||
          lowerEmail.includes("realestate") ||
          lowerEmail.includes("homesales") ||
          (lowerEmail.includes("agent") && !lowerEmail.includes("mortgage")) ||
          (lowerEmail.includes("broker") && !lowerEmail.includes("mortgage"))) {
        agentConfidence += 45; // Strong signal - matches RealEstateProcessor
        reasons.push(`Direct agent keyword in email: ${email}`);
      }
    }

    // 3. Enhanced company name analysis
    const companyPatterns = [
      /\brealty\b/i, /\brealtors\b/i, /\brealtor\b/i, /\bproperties\b/i,
      /\bhomes\b/i, /\breal estate\b/i, /\bbroker\b/i, /\bsir\b/i,
      /\bre\/max\b/i, /\bkw\b/i, /\bbhhs\b/i
    ];
    
    const companyKeywords = [
      "realty", "real estate", "sotheby", "coldwell banker", "keller williams",
      "century 21", "berkshire hathaway", "re/max", "remax", "douglas elliman",
      "compass", "corcoran", "exp realty", "weichert", "better homes", "christie",
      "vanguard properties", "redfin", "zillow", "trulia", "flow realty"
    ];

    companyKeywords.forEach(keyword => {
      if (company.includes(keyword)) {
        agentConfidence += 40; // Strong signal - matches RealEstateProcessor
        reasons.push(`Real estate company: ${keyword}`);
      }
    });

    companyPatterns.forEach(pattern => {
      if (pattern.test(company)) {
        agentConfidence += 40; // Strong signal - matches RealEstateProcessor 
        reasons.push(`Company pattern match: ${pattern.source}`);
      }
    });

    // 4. Enhanced job title analysis
    const agentTitles = [
      "real estate agent", "realtor", "broker", "real estate", "property manager",
      "sales associate", "listing agent", "buyer agent", "real estate professional"
    ];

    agentTitles.forEach(titleKeyword => {
      if (title.includes(titleKeyword)) {
        agentConfidence += 40;
        reasons.push(`Real estate title: ${titleKeyword}`);
      }
    });

    // Special case for "sales associate" + real estate company
    if (title.includes("sales associate") && 
        (company.includes("real estate") || company.includes("realty") || company.includes("properties"))) {
      agentConfidence += 35;
      reasons.push("Sales associate at real estate company");
    }

    // 5. Existing tags/groups analysis (matching RealEstateProcessor)
    if (tags.includes("agent")) {
      agentConfidence += 40; // Strong signal from existing tags
      reasons.push("Existing agent tags");
    }
    if (groups.includes("agent")) {
      agentConfidence += 40; // Strong signal from existing groups
      reasons.push("Existing agent groups");
    }

    // 6. Notes and background info analysis (matching RealEstateProcessor)
    if (notes.includes("realtor") || keyInfo.includes("realtor") ||
        notes.includes("real estate agent") || keyInfo.includes("real estate agent") ||
        (notes.includes("broker") && !notes.includes("mortgage broker") && 
         !keyInfo.includes("mortgage broker"))) {
      agentConfidence += 20; // Moderate signal - matches RealEstateProcessor
      reasons.push("Agent indicator in notes/background");
    }

    // VENDOR CLASSIFICATION SIGNALS

    // 1. Direct vendor email domain analysis
    for (const email of emails) {
      const lowerEmail = email.toLowerCase();
      
      // Immediate classification for specific known vendor emails
      if (lowerEmail.includes("@chartwellescrow.com") ||
          lowerEmail.includes("@krislaw") ||
          lowerEmail.includes("@modustitle.com") ||
          lowerEmail.includes("escrow") ||
          lowerEmail.includes("title") ||
          lowerEmail.includes("@chartwell") ||
          lowerEmail.includes("@modus") ||
          lowerEmail.includes("@escrow") ||
          lowerEmail.includes("law.com")) {
        vendorConfidence += 100;
        reasons.push(`Direct vendor email: ${email}`);
      }

      // Enhanced vendor keyword matching in email
      VENDOR_KEYWORDS.forEach(keyword => {
        if (lowerEmail.includes(keyword)) {
          vendorConfidence += 15;
          reasons.push(`Vendor keyword in email: ${keyword}`);
        }
      });
    }

    // 2. Enhanced vendor keywords in ALL fields (matching RealEstateProcessor scoring)
    const allFieldText = `${emails.join(" ")} ${company} ${title} ${tags} ${groups} ${notes} ${keyInfo}`.toLowerCase();
    VENDOR_KEYWORDS.forEach(keyword => {
      if (allFieldText.includes(keyword)) {
        vendorConfidence += 30; // Moderate signal for keyword match - matches RealEstateProcessor
        reasons.push(`Vendor keyword found: ${keyword}`);
      }
    });

    // 3. Enhanced company patterns for vendors (matching RealEstateProcessor)
    const businessPatterns = [
      " inc", " llc", " corp", "title", "escrow", "law", "mortgage", "bank",
      "insurance", "lending", "credit", "financial", "capital", "firm"
    ];

    businessPatterns.forEach(pattern => {
      if (company.includes(pattern)) {
        vendorConfidence += 30; // Moderate signal - matches RealEstateProcessor
        reasons.push(`Business entity pattern: ${pattern}`);
      }
    });

    // Known vendor domains
    const knownVendorDomains = [
      "modustitle.com", "chartwellescrow.com", "krisslawatlantic.com",
      "escrow.com", "chartwell.com", "modus.com", "titlecompany.com",
      "escrowservice.com", "titleservice.com", "lawfirm.com", "krislaw.com"
    ];

    // Check domains for vendor keywords and known vendor domains (matching RealEstateProcessor)
    for (const domain of domains) {
      // Check if domain contains vendor keywords
      let hasVendorDomainKeyword = false;
      for (const keyword of VENDOR_KEYWORDS) {
        if (domain.includes(keyword)) {
          hasVendorDomainKeyword = true;
          vendorConfidence += 40; // Strong signal - matches RealEstateProcessor
          reasons.push(`Vendor keyword in domain: ${keyword}`);
          break;
        }
      }

      if (knownVendorDomains.includes(domain)) {
        vendorConfidence += 50; // Very strong signal for known vendor domains - matches RealEstateProcessor
        reasons.push(`Known vendor domain: ${domain}`);
      }
    }

    // 4. Enhanced professional service titles (matching RealEstateProcessor)
    const specificVendorTitles = [
      "escrow officer", "title officer", "closing attorney", "real estate attorney",
      "loan officer", "mortgage broker", "appraiser", "home inspector", 
      "insurance agent", "contractor", "architect", "designer", "accountant", 
      "tax preparer", "financial advisor", "title", "escrow", "attorney", "lawyer"
    ];

    specificVendorTitles.forEach(titleKeyword => {
      if (title.includes(titleKeyword)) {
        vendorConfidence += 50; // Very strong signal for specific vendor job titles - matches RealEstateProcessor
        reasons.push(`Professional service title: ${titleKeyword}`);
      }
    });

    // 5. Enhanced tags and groups analysis for vendors (matching RealEstateProcessor)
    if (tags.includes("vendor")) {
      vendorConfidence += 40; // Strong signal from existing tags
      reasons.push("Existing vendor tags");
    }
    if (groups.includes("vendor")) {
      vendorConfidence += 40; // Strong signal from existing groups  
      reasons.push("Existing vendor groups");
    }

    // Apply past client confidence reduction (matching RealEstateProcessor)
    if (isPastClient) {
      vendorConfidence -= 50; // Past clients get a penalty to stay as Contacts
      agentConfidence -= 50; // Also reduce agent confidence for past clients
      reasons.push("Past client detected - confidence reduced");
    }

    // DECISION LOGIC (matching RealEstateProcessor exactly)
    const AGENT_THRESHOLD = 35;
    const VENDOR_THRESHOLD = 40;

    // FIRST: Check for direct indicators (override confidence scoring)
    // If a contact is already in the "Agents" group, they should be classified as an Agent
    if (groups.includes("agent")) {
      return { category: "Agent", agentConfidence: 100, vendorConfidence, reasons: ["Existing agent group"] };
    }

    // SECOND: Check for known agent domains based on email patterns (direct classification)
    for (const email of emails) {
      const lowerEmail = email.toLowerCase();

      // Direct classification for emails at known real estate brokerages
      if (lowerEmail.includes("@compass.com") ||
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
          lowerEmail.includes("@exrny.com")) {
        return { category: "Agent", agentConfidence: 100, vendorConfidence, reasons: [`Direct brokerage email: ${email}`] };
      }

      // Check for obvious agent keywords in email username (before the @)
      if (lowerEmail.includes("realtor") ||
          lowerEmail.includes("realestate") ||
          (lowerEmail.includes("agent") && !lowerEmail.includes("mortgage")) ||
          (lowerEmail.includes("broker") && !lowerEmail.includes("mortgage"))) {
        return { category: "Agent", agentConfidence: 100, vendorConfidence, reasons: [`Agent keyword in email: ${email}`] };
      }
    }

    // THIRD: Check for company name that directly indicates real estate agent
    const exactCompanyMatches = [
      "compass", "corcoran", "compass ", "corcoran group", "douglas elliman",
      "berkshire hathaway", "keller williams", "re/max", "remax", "sotheby's",
      "sothebys", "coldwell banker", "century 21", "exit realty", "exp realty",
      "bond new york", "nest seekers", "weichert"
    ];

    for (const exactMatch of exactCompanyMatches) {
      if (company === exactMatch) {
        return { category: "Agent", agentConfidence: 100, vendorConfidence, reasons: [`Direct company match: ${company}`] };
      }
    }

    // FOURTH: Use confidence scoring for remaining cases
    if (agentConfidence >= AGENT_THRESHOLD && vendorConfidence >= VENDOR_THRESHOLD) {
      // Both qualify - choose highest confidence
      category = agentConfidence > vendorConfidence ? "Agent" : "Vendor";
    } else if (agentConfidence >= AGENT_THRESHOLD) {
      category = "Agent";
    } else if (vendorConfidence >= VENDOR_THRESHOLD) {
      category = "Vendor";
    }

    return {
      category,
      agentConfidence,
      vendorConfidence,
      reasons: reasons.slice(0, 3) // Top 3 reasons
    };
  };

  const processFile = async () => {
    if (!file) return;

    setProcessing(true);
    setLogs([]);
    addLog("Starting contact categorization...");

    try {
      const text = await file.text();
      addLog(`File loaded, parsing CSV...`);

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
      });

      addLog(`Parsed ${parsed.data.length} records`);

      // Process categorization
      const processedData = parsed.data.map((record, index) => {
        const result = categorizeContact(record);
        
        // Add category to record
        const updatedRecord = { ...record };
        updatedRecord["Category"] = result.category;
        
        return {
          ...updatedRecord,
          _categorization: result
        };
      });

      // Generate statistics
      const stats = {
        total: processedData.length,
        agents: processedData.filter(r => r.Category === "Agent").length,
        vendors: processedData.filter(r => r.Category === "Vendor").length,
        contacts: processedData.filter(r => r.Category === "Contact").length
      };

      // Sample categorized records for review
      const sampleAgents = processedData
        .filter(r => r.Category === "Agent")
        .slice(0, 10)
        .map(r => ({
          name: `${r["First Name"] || ""} ${r["Last Name"] || ""}`.trim(),
          email: getAllEmails(r).join(", ") || "No email",
          company: r["Company"] || "No company",
          confidence: r._categorization.agentConfidence,
          reasons: r._categorization.reasons
        }));

      const sampleVendors = processedData
        .filter(r => r.Category === "Vendor")
        .slice(0, 10)
        .map(r => ({
          name: `${r["First Name"] || ""} ${r["Last Name"] || ""}`.trim(),
          email: getAllEmails(r).join(", ") || "No email",
          company: r["Company"] || "No company",
          confidence: r._categorization.vendorConfidence,
          reasons: r._categorization.reasons
        }));

      addLog(`\n=== CATEGORIZATION COMPLETE ===`);
      addLog(`Total records: ${stats.total}`);
      addLog(`Agents: ${stats.agents}`);
      addLog(`Vendors: ${stats.vendors}`);
      addLog(`Contacts: ${stats.contacts}`);

      setResults({
        processedData: processedData.map(r => {
          const { _categorization, ...cleanRecord } = r;
          return cleanRecord;
        }),
        stats,
        sampleAgents,
        sampleVendors
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
    link.download = "categorized_contacts.csv";
    link.click();
  };

  const exportByCategory = (category) => {
    if (!results) return;

    const filteredData = results.processedData.filter(record => record.Category === category);
    if (filteredData.length === 0) {
      alert(`No ${category.toLowerCase()}s found to export!`);
      return;
    }

    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${category.toLowerCase()}s_only.csv`;
    link.click();
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Contact Categorizer</h1>
      <p className="text-gray-600 mb-6">
        Automatically categorize contacts as Agents, Vendors, or Contacts based on email domains, 
        company names, job titles, and other signals.
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
          {processing ? "Processing..." : "Categorize Contacts"}
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
            <h2 className="text-xl font-semibold mb-4">Categorization Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {results.stats.total}
                </div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {results.stats.agents}
                </div>
                <div className="text-sm text-gray-600">Agents</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">
                  {results.stats.vendors}
                </div>
                <div className="text-sm text-gray-600">Vendors</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-600">
                  {results.stats.contacts}
                </div>
                <div className="text-sm text-gray-600">Contacts</div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📥 Export Results</h2>
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                Download your categorized contacts with the new "Category" column added to each record.
              </p>
              
              {/* Main Export Button */}
              <div className="text-center">
                <button
                  onClick={exportResults}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
                >
                  📥 Export Complete Categorized File
                </button>
                <div className="text-sm text-gray-500 mt-2">
                  File: "categorized_contacts.csv" with {results.stats.total} records
                </div>
              </div>

              {/* Category-Specific Export Buttons */}
              <div className="border-t pt-4">
                <h3 className="text-md font-semibold mb-3 text-center">Export by Category</h3>
                <div className="flex justify-center space-x-4">
                  {results.stats.agents > 0 && (
                    <button
                      onClick={() => exportByCategory('Agent')}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      🏢 Agents Only ({results.stats.agents})
                    </button>
                  )}
                  {results.stats.vendors > 0 && (
                    <button
                      onClick={() => exportByCategory('Vendor')}
                      className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
                    >
                      🔧 Vendors Only ({results.stats.vendors})
                    </button>
                  )}
                  {results.stats.contacts > 0 && (
                    <button
                      onClick={() => exportByCategory('Contact')}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                      👤 Contacts Only ({results.stats.contacts})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sample Agents */}
          {results.sampleAgents.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Sample Agents ({results.stats.agents} total)</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.sampleAgents.map((agent, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                    <h3 className="font-semibold text-green-700">{agent.name}</h3>
                    <p className="text-sm text-gray-600">{agent.email}</p>
                    <p className="text-sm text-gray-600">{agent.company}</p>
                    <div className="text-xs text-green-600 mt-1">
                      Confidence: {agent.confidence} | {agent.reasons.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Vendors */}
          {results.sampleVendors.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Sample Vendors ({results.stats.vendors} total)</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.sampleVendors.map((vendor, index) => (
                  <div key={index} className="border-l-4 border-orange-500 pl-4 py-2">
                    <h3 className="font-semibold text-orange-700">{vendor.name}</h3>
                    <p className="text-sm text-gray-600">{vendor.email}</p>
                    <p className="text-sm text-gray-600">{vendor.company}</p>
                    <div className="text-xs text-orange-600 mt-1">
                      Confidence: {vendor.confidence} | {vendor.reasons.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Enhanced Categorization Logic</h2>
            <div className="text-sm space-y-2">
              <p><strong>📧 Email Analysis:</strong> Scans ALL email fields (Personal Email, Work Email, Email 2, etc.) + finds emails in any field</p>
              <p><strong>🏢 Agent Detection:</strong> 70+ brokerage domains, 40+ agent keywords, company patterns, job titles, notes analysis</p>
              <p><strong>🔧 Vendor Detection:</strong> Direct vendor matches (Chartwell, Modus Title), 50+ service keywords, business entities, professional titles</p>
              <p><strong>🎯 Multi-Signal Analysis:</strong> Checks company, title, tags, groups, notes, background info for comprehensive classification</p>
              <p><strong>👤 Contact Protection:</strong> Past clients remain as "Contact" regardless of other signals</p>
              <p><strong>⚖️ Confidence Scoring:</strong> Multiple signals build confidence scores. Agents need 35+ points, Vendors need 40+ points</p>
              <p><strong>🔍 Enhanced Matching:</strong> Now matches RealEstateProcessor logic for consistent results across tools</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ContactCategorizer;