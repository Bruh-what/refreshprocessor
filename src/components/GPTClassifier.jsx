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
  const [estimatedCost, setEstimatedCost] = useState(0);

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
          analyzeUngroupedContacts(results.data);
        },
        error: (error) => {
          addLog(`❌ File parsing error: ${error.message}`);
        },
      });
    }
  };

  // Analyze ungrouped contacts
  const analyzeUngroupedContacts = (data) => {
    const ungrouped = data.filter((contact) => {
      const groups = (contact["Groups"] || contact["Group"] || "").trim();
      const emails = getAllEmails(contact);

      // Must be ungrouped
      if (groups !== "") return false;

      // Must have business email (not personal only)
      if (hasOnlyPersonalEmails(emails)) return false;

      // Must have some contact info
      const name = `${contact["First Name"] || ""} ${
        contact["Last Name"] || ""
      }`.trim();
      if (!name && emails.length === 0) return false;

      return true;
    });

    setUngroupedContacts(ungrouped);
    setEstimatedCost(ungrouped.length * 0.001); // Rough estimate
    addLog(`Found ${ungrouped.length} ungrouped contacts with business emails`);
  };

  // Classify contact with ChatGPT
  const classifyWithGPT = async (contact) => {
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

    const prompt = `Classify this contact as either "Agent", "Vendor", or "Contact" based on their information:

Name: ${contactInfo.name}
Company: ${contactInfo.company}
Title: ${contactInfo.title}
Email: ${contactInfo.email}
Notes: ${contactInfo.notes}
Tags: ${contactInfo.tags}
Groups: ${contactInfo.groups}

Agent = Real estate agent, realtor, broker, or someone who sells/lists properties
Vendor = Service provider like title company, escrow, attorney, contractor, lender, inspector
Contact = General contact, client, prospect, or unclear classification

Respond with only one word: Agent, Vendor, or Contact`;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API Error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
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
      addLog(`❌ GPT API error: ${error.message}`);
      throw error;
    }
  };

  // Process ungrouped contacts with GPT
  const processWithGPT = async () => {
    if (!isApiKeyValid || ungroupedContacts.length === 0) return;

    setProcessing(true);
    setProgress(0);

    const classifiedContacts = [];
    let processedCount = 0;
    let agentCount = 0;
    let vendorCount = 0;
    let contactCount = 0;

    addLog(
      `Starting GPT classification of ${ungroupedContacts.length} contacts...`
    );

    try {
      for (let i = 0; i < ungroupedContacts.length; i++) {
        const contact = ungroupedContacts[i];
        const contactName =
          `${contact["First Name"] || ""} ${
            contact["Last Name"] || ""
          }`.trim() || "Unknown";

        try {
          const gptResult = await classifyWithGPT(contact);

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

            classifiedContacts.push(updatedContact);

            if (gptResult === "Agent") agentCount++;
            else vendorCount++;

            addLog(`✅ ${contactName}: ${gptResult}`);
          } else {
            contactCount++;
            addLog(`➡️ ${contactName}: Contact (no change)`);
          }

          processedCount++;
          setProgress((processedCount / ungroupedContacts.length) * 100);

          // Rate limiting (OpenAI allows ~3 requests/second)
          await new Promise((resolve) => setTimeout(resolve, 350));
        } catch (error) {
          addLog(`❌ Failed to classify ${contactName}: ${error.message}`);
          contactCount++;
          processedCount++;
          setProgress((processedCount / ungroupedContacts.length) * 100);
        }
      }

      setResults({
        classifiedContacts,
        stats: {
          total: processedCount,
          agents: agentCount,
          vendors: vendorCount,
          contacts: contactCount,
        },
      });

      addLog(`🎯 GPT Classification Complete!`);
      addLog(
        `📊 Results: ${agentCount} Agents, ${vendorCount} Vendors, ${contactCount} Contacts`
      );
    } catch (error) {
      addLog(`❌ Processing failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Export results
  const exportResults = () => {
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
      `gpt_classified_contacts_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog("📁 GPT classified contacts exported successfully");
  };

  // Clear data
  const clearData = () => {
    setFile(null);
    setResults(null);
    setUngroupedContacts([]);
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
                  {Math.ceil(ungroupedContacts.length * 0.35)}s
                </div>
                <div className="text-sm text-gray-600">Estimated Time</div>
                <div className="text-xs text-gray-500">with rate limiting</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <strong>Processing Rules:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Only processes contacts with empty "Groups" field</li>
                <li>
                  Skips contacts with only personal emails (Gmail, Yahoo, etc.)
                </li>
                <li>Preserves all existing categorizations and data</li>
                <li>Rate limited to respect OpenAI API limits</li>
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

            <div className="flex gap-4">
              <button
                onClick={exportResults}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                📁 Export Classified Contacts
              </button>
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

export default GPTClassifier;
