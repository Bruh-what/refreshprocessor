// Test script to verify agent detection for Compass agents using Gmail

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
  "flow",
  "rlty",
  "cb",
];

const BROKERAGE_DOMAINS = new Set([
  "compass.com",
  "remax.com",
  "kw.com",
  // and others...
]);

function getEmailDomain(email) {
  if (!email || typeof email !== "string") return "";
  const match = email.toLowerCase().match(/@([\\w.-]+)$/);
  return match ? match[1] : "";
}

function testAgentDetection(email, contact) {
  console.log(`Testing email: ${email}`);
  console.log(`Contact company: ${contact.Company || "None"}`);

  // Get domain
  const domain = getEmailDomain(email);
  console.log(`Domain extracted: ${domain}`);

  // Track classification confidence
  let agentConfidence = 0;

  // Test email pattern detection
  const lowerEmail = email.toLowerCase();
  let hasAgentKeywordInEmail = false;

  for (const keyword of AGENT_KEYWORDS) {
    if (lowerEmail.includes(keyword)) {
      hasAgentKeywordInEmail = true;
      break;
    }
  }

  if (hasAgentKeywordInEmail) {
    agentConfidence += 30; // Strong signal
    console.log("Email contains agent keywords: +30 points");
  }

  // Check if domain is in explicit brokerage domains list
  if (BROKERAGE_DOMAINS.has(domain)) {
    agentConfidence += 50; // Very strong signal
    console.log("Domain is a known brokerage domain: +50 points");
  } else {
    // Check if domain contains any agent keywords
    let domainHasKeyword = false;
    for (const keyword of AGENT_KEYWORDS) {
      if (domain.includes(keyword)) {
        agentConfidence += 40; // Strong signal for keyword in domain
        console.log(`Domain contains agent keyword (${keyword}): +40 points`);
        domainHasKeyword = true;
        break;
      }
    }

    // Special case for Compass agents using Gmail
    if (
      domain === "gmail.com" &&
      contact &&
      (contact["Company"] || "").toLowerCase().includes("compass")
    ) {
      agentConfidence += 40; // Strong signal for Compass agents with Gmail
      console.log("Compass agent with Gmail detected: +40 points");
    }
  }

  // Company name check
  if (contact && (contact["Company"] || "").toLowerCase().includes("compass")) {
    agentConfidence += 40; // Strong signal from company name
    console.log("Company name contains 'compass': +40 points");
  }

  console.log(`Total agent confidence score: ${agentConfidence}`);
  console.log(`Would be classified as Agent: ${agentConfidence >= 40}\\n`);
}

// Test cases
console.log("===== TEST CASE 1: Regular email with agent domain =====");
testAgentDetection("agent@compass.com", { Company: "Compass Real Estate" });

console.log("===== TEST CASE 2: Gmail with Compass in company field =====");
testAgentDetection("john.doe@gmail.com", { Company: "Compass" });

console.log("===== TEST CASE 3: Gmail with different company =====");
testAgentDetection("jane.doe@gmail.com", { Company: "ABC Corporation" });

console.log("===== TEST CASE 4: Gmail with no company info =====");
testAgentDetection("no.company@gmail.com", {});

console.log("Testing complete!");
