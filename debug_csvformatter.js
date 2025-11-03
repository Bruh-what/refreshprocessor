// Debug test using EXACT code from CsvFormatter.jsx
console.log("=== EXACT CsvFormatter.jsx Logic Test ===");

// Exact toTitleCase from the file
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

// Exact isLikelyCompany logic (simplified for this test)
const isLikelyCompany = (name) => {
  const businessTerms = [
    "llc", "inc", "ltd", "corp", "corporation", "holdings", "enterprises",
    "group", "associates", "partners", "properties", "realty", "management",
    "services", "solutions", "trust", "investments", "fund", "capital",
  ];
  const lowerName = name.toLowerCase();
  for (const term of businessTerms) {
    if (lowerName.includes(term)) return true;
  }
  if (!name.includes(",") && name.split(/\s+/).length > 2) {
    return true;
  }
  return false;
};

// EXACT parseIndividualName function from CsvFormatter.jsx
const parseIndividualName = (name) => {
  console.log(`parseIndividualName called with: "${name}"`);
  
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
    console.log(`  Comma format: lastPart="${lastPart}" -> lastName="${lastName}"`);

    // WORKFLOW RULE: Keep the first given name, ignore middle initials after the comma
    if (firstPart) {
      const firstParts = firstPart.split(/\s+/);
      let cleanFirstName = firstParts[0] || "";
      console.log(`  firstParts: [${firstParts.map(p => `"${p}"`).join(", ")}]`);
      console.log(`  initial cleanFirstName: "${cleanFirstName}"`);

      // If first part is just an initial, try to use the next substantial part
      if (
        firstParts.length > 1 &&
        (firstParts[0].length === 1 ||
          (firstParts[0].length === 2 && firstParts[0].endsWith(".")))
      ) {
        console.log(`  "${firstParts[0]}" detected as initial, looking for substantial name...`);
        // Look for the next substantial part (not an initial)
        for (let i = 1; i < firstParts.length; i++) {
          if (firstParts[i].length > 1 && !firstParts[i].endsWith(".")) {
            cleanFirstName = firstParts[i];
            console.log(`  Found substantial name: "${cleanFirstName}"`);
            break;
          }
        }
      }

      firstName = toTitleCase(cleanFirstName);
      console.log(`  final firstName: "${firstName}"`);
    }
  } else {
    // Handle "First Last" or "First Middle Last" format
    const parts = name.split(/\s+/).filter((part) => part.length > 0);

    if (parts.length >= 2) {
      firstName = toTitleCase(parts[0]);

      // For the last name, check if the last part is just an initial
      // If so, we should not use it as the last name - it's likely a middle initial
      const lastPart = parts[parts.length - 1];
      if (
        lastPart.length === 1 ||
        (lastPart.length === 2 && lastPart.endsWith("."))
      ) {
        // Last part is an initial, so we don't have a proper last name
        // Use the substantial part before the initial if it exists
        if (parts.length >= 3) {
          lastName = toTitleCase(parts[parts.length - 2]);
        } else {
          lastName = ""; // No substantial last name available
        }
      } else {
        lastName = toTitleCase(lastPart);
      }
    } else if (parts.length === 1) {
      firstName = toTitleCase(parts[0]);
      lastName = "";
    }
  }

  const result = {
    firstName: firstName,
    lastName: lastName,
    isValid: firstName.length >= 1, // Must have at least first name
  };
  
  console.log(`  -> Result: firstName="${result.firstName}", lastName="${result.lastName}", isValid=${result.isValid}`);
  return result;
};

// Test the exact scenario from processNameIntoSeparateRows
console.log("\n=== Testing Rhodes,r Kent & Marsha J ===");
const nameString = "Rhodes,r Kent & Marsha J";
console.log(`Input: "${nameString}"`);

// Step 1: Split by comma (from processNameIntoSeparateRows logic)
const [lastPart, firstPart] = nameString.split(",").map((part) => part.trim());
console.log(`After comma split: lastPart="${lastPart}", firstPart="${firstPart}"`);

if (firstPart && firstPart.includes("&")) {
  console.log("Contains &, splitting firstPart...");
  const firstNames = firstPart.split(/\s*&\s*/).map((name) => name.trim()).filter(Boolean);
  console.log(`First names: [${firstNames.map(n => `"${n}"`).join(", ")}]`);

  firstNames.forEach((firstName, index) => {
    console.log(`\n--- Processing name ${index + 1}: "${firstName}" ---`);
    const fullName = `${lastPart}, ${firstName}`;
    console.log(`Created fullName: "${fullName}"`);
    
    const result = parseIndividualName(fullName);
    console.log(`FINAL RESULT: ${result.firstName} ${result.lastName}`);
  });
}