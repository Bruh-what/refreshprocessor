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

  // Known real estate brokerage domains
  const BROKERAGE_DOMAINS = new Set([
    "compass.com", "elliman.com", "corcoran.com", "sothebysrealty.com",
    "coldwellbanker.com", "century21.com", "kw.com", "remax.com",
    "weichert.com", "bhgre.com", "windermere.com", "cbsudler.com",
    "eradre.com", "howardhanna.com", "remaxresults.com", "gibsonhomes.com",
    "nemoves.com", "lamacchiarealty.com", "berkshirehathaway.com"
  ]);

  // Agent keywords for email/field analysis
  const AGENT_KEYWORDS = [
    "realtor", "realty", "properties", "homes", "broker", "realestate",
    "agent", "compass", "corcoran", "weichert", "kw", "remax", "c21"
  ];

  // Vendor keywords
  const VENDOR_KEYWORDS = [
    "title", "escrow", "mortgage", "lending", "loan", "bank", "insurance",
    "inspection", "appraisal", "attorney", "law", "notary", "staging",
    "photography", "contractor", "cleaning", "hvac", "plumbing", "electric"
  ];

  // Categorize contact based on multiple signals
  const categorizeContact = (contact) => {
    let agentConfidence = 0;
    let vendorConfidence = 0;
    let category = "Contact"; // Default
    let reasons = [];

    // Extract key fields
    const email = (contact["Email"] || contact["Personal Email"] || contact["Work Email"] || "").toLowerCase();
    const company = (contact["Company"] || "").toLowerCase();
    const title = (contact["Title"] || "").toLowerCase();
    const tags = (contact["Tags"] || "").toLowerCase();
    const groups = (contact["Groups"] || "").toLowerCase();

    // Check for existing past client classification
    if (contact["Client Classification"] === "Past Client" || 
        tags.includes("past client") || tags.includes("past buyer") || tags.includes("past seller")) {
      return { category: "Contact", confidence: 100, reasons: ["Protected as past client"] };
    }

    // Extract email domain
    const emailDomain = email.includes("@") ? email.split("@")[1] : "";

    // AGENT CLASSIFICATION SIGNALS

    // 1. Direct brokerage domain match (highest priority)
    if (BROKERAGE_DOMAINS.has(emailDomain)) {
      agentConfidence += 50;
      reasons.push(`Brokerage email domain: ${emailDomain}`);
    }

    // 2. Agent keywords in email
    AGENT_KEYWORDS.forEach(keyword => {
      if (email.includes(keyword)) {
        agentConfidence += 20;
        reasons.push(`Agent keyword in email: ${keyword}`);
      }
    });

    // 3. Company name analysis
    if (company.includes("realty") || company.includes("real estate") || 
        company.includes("compass") || company.includes("keller williams") ||
        company.includes("century 21") || company.includes("coldwell banker") ||
        company.includes("re/max") || company.includes("sotheby")) {
      agentConfidence += 40;
      reasons.push(`Real estate company: ${company}`);
    }

    // 4. Job title analysis
    if (title.includes("real estate agent") || title.includes("realtor") ||
        title.includes("broker") || title.includes("sales associate") ||
        title.includes("listing agent") || title.includes("buyer agent")) {
      agentConfidence += 40;
      reasons.push(`Real estate title: ${title}`);
    }

    // 5. Existing tags/groups
    if (tags.includes("agent") || groups.includes("agent") || 
        tags.includes("compass") || tags.includes("realtor")) {
      agentConfidence += 40;
      reasons.push("Existing agent tags/groups");
    }

    // VENDOR CLASSIFICATION SIGNALS

    // 1. Direct vendor email domains
    if (email.includes("chartwellescrow.com") || email.includes("modustitle.com") ||
        email.includes("escrow") || email.includes("title")) {
      vendorConfidence += 50;
      reasons.push(`Vendor email domain: ${emailDomain}`);
    }

    // 2. Vendor keywords in various fields
    const allFieldText = `${email} ${company} ${title} ${tags}`.toLowerCase();
    VENDOR_KEYWORDS.forEach(keyword => {
      if (allFieldText.includes(keyword)) {
        vendorConfidence += 15;
        reasons.push(`Vendor keyword found: ${keyword}`);
      }
    });

    // 3. Company patterns
    if (company.includes(" inc") || company.includes(" llc") || 
        company.includes(" corp") || company.includes("title") ||
        company.includes("escrow") || company.includes("law") ||
        company.includes("mortgage") || company.includes("bank")) {
      vendorConfidence += 30;
      reasons.push(`Business entity: ${company}`);
    }

    // 4. Professional service titles
    if (title.includes("escrow") || title.includes("title officer") ||
        title.includes("attorney") || title.includes("lawyer") ||
        title.includes("loan officer") || title.includes("inspector")) {
      vendorConfidence += 50;
      reasons.push(`Professional service title: ${title}`);
    }

    // DECISION LOGIC
    const agentThreshold = 35;
    const vendorThreshold = 40;

    if (agentConfidence >= agentThreshold && vendorConfidence >= vendorThreshold) {
      // Both qualify - choose highest confidence
      if (agentConfidence > vendorConfidence) {
        category = "Agent";
      } else {
        category = "Vendor";
      }
    } else if (agentConfidence >= agentThreshold) {
      category = "Agent";
    } else if (vendorConfidence >= vendorThreshold) {
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
          email: r["Email"] || r["Personal Email"] || "No email",
          company: r["Company"] || "No company",
          confidence: r._categorization.agentConfidence,
          reasons: r._categorization.reasons
        }));

      const sampleVendors = processedData
        .filter(r => r.Category === "Vendor")
        .slice(0, 10)
        .map(r => ({
          name: `${r["First Name"] || ""} ${r["Last Name"] || ""}`.trim(),
          email: r["Email"] || r["Personal Email"] || "No email",
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

          {/* Export Button */}
          <div className="text-center">
            <button
              onClick={exportResults}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
            >
              📥 Export Categorized CSV
            </button>
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
            <h2 className="text-xl font-semibold mb-4">How Categorization Works</h2>
            <div className="text-sm space-y-2">
              <p><strong>🏢 Agent Detection:</strong> Email domains (compass.com, kw.com), company names (Keller Williams), job titles (Realtor), existing tags</p>
              <p><strong>🔧 Vendor Detection:</strong> Business entities (LLC, Inc), service keywords (title, escrow, mortgage), professional titles (Attorney, Loan Officer)</p>
              <p><strong>👤 Contact Protection:</strong> Past clients remain as "Contact" regardless of other signals</p>
              <p><strong>⚖️ Confidence Scoring:</strong> Multiple signals build confidence scores. Agents need 35+ points, Vendors need 40+ points</p>
              <p><strong>🎯 Smart Defaults:</strong> Unclear contacts remain as "Contact" to avoid incorrect categorization</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ContactCategorizer;