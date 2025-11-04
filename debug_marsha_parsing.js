// Test the parseIndividualName function specifically for the Marsha case

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

const parseIndividualName = (name) => {
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
    const [lastPart, firstPart] = name.split(",").map((part) => part.trim());

    lastName = toTitleCase(lastPart);

    // WORKFLOW RULE: Keep the first given name, ignore middle initials after the comma
    if (firstPart) {
      const firstParts = firstPart.split(/\s+/);
      let cleanFirstName = firstParts[0] || "";

      // If first part is just an initial, try to use the next substantial part
      if (
        firstParts.length > 1 &&
        (firstParts[0].length === 1 ||
          (firstParts[0].length === 2 && firstParts[0].endsWith(".")))
      ) {
        // Look for the next substantial part (not an initial)
        for (let i = 1; i < firstParts.length; i++) {
          if (firstParts[i].length > 1 && !firstParts[i].endsWith(".")) {
            cleanFirstName = firstParts[i];
            break;
          }
        }
      }

      firstName = toTitleCase(cleanFirstName);
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

  return {
    firstName: firstName,
    lastName: lastName,
    isValid: firstName.length >= 1, // Must have at least first name
  };
};

// Test cases
console.log("=== TESTING parseIndividualName ===");

const testCases = [
  "Rhodes, r Kent",
  "Rhodes, Marsha J",
  "Rhodes, Marsha",
  "Marsha J Rhodes",
  "r Kent Rhodes",
];

testCases.forEach((testCase) => {
  const result = parseIndividualName(testCase);
  console.log(`Input: "${testCase}"`);
  console.log(`  -> firstName: "${result.firstName}"`);
  console.log(`  -> lastName: "${result.lastName}"`);
  console.log(`  -> isValid: ${result.isValid}`);
  console.log("");
});

console.log("=== WORKFLOW TEST ===");
console.log("Original: 'Rhodes,r Kent & Marsha J'");
console.log("Should become two entries:");

// Simulate the workflow
const originalName = "Rhodes,r Kent & Marsha J";
const [lastPart, firstPart] = originalName
  .split(",")
  .map((part) => part.trim());
const firstNames = firstPart.split(/\s*&\s*/).map((name) => name.trim());

firstNames.forEach((firstName) => {
  const fullName = `${lastPart}, ${firstName}`;
  const result = parseIndividualName(fullName);
  console.log(`"${fullName}" -> "${result.firstName} ${result.lastName}"`);
});
