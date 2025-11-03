// Test the name parsing fix for middle initials issue

// Simulate the parseIndividualName function behavior
const toTitleCase = (str) => {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const parseIndividualName = (name) => {
  if (!name || typeof name !== "string") {
    return { firstName: "", lastName: "", isValid: false };
  }

  let firstName = "";
  let lastName = "";

  // Handle "Last, First Middle-Initial" format - WORKFLOW COMPLIANT
  if (name.includes(",")) {
    const [lastPart, firstPart] = name
      .split(",")
      .map((part) => part.trim());

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
      // First word is first name, last word is last name (ignore middle parts)
      firstName = toTitleCase(parts[0]);
      lastName = toTitleCase(parts[parts.length - 1]);
    } else if (parts.length === 1) {
      firstName = toTitleCase(parts[0]);
      lastName = "";
    }
  }

  return {
    firstName: firstName,
    lastName: lastName,
    isValid: firstName.length >= 1,
  };
};

// Test cases
const testCases = [
  "Rhodes, r Kent",
  "Rhodes, Marsha J",
  "Smith, J Michael",
  "Johnson, A. Robert",
  "Wilson, Mary",
  "Brown, X Y Z David",  // Extreme case with multiple initials
];

console.log("Testing name parsing fix:");
console.log("=".repeat(50));

testCases.forEach(testCase => {
  const result = parseIndividualName(testCase);
  console.log(`Input: "${testCase}"`);
  console.log(`Output: First="${result.firstName}", Last="${result.lastName}"`);
  console.log(`Valid: ${result.isValid}`);
  console.log("-".repeat(30));
});

// Specific test for the Rhodes case
console.log("\nSpecific test for Rhodes case:");
console.log("=".repeat(50));

const rhodesCases = [
  "Rhodes, r Kent & Marsha J"
];

rhodesCases.forEach(fullName => {
  console.log(`\nProcessing full name: "${fullName}"`);
  
  // Simulate the processing logic
  if (fullName.includes(",")) {
    const [lastPart, firstPart] = fullName.split(",").map(part => part.trim());
    console.log(`Last part: "${lastPart}"`);
    console.log(`First part: "${firstPart}"`);
    
    if (firstPart.includes("&")) {
      const firstNames = firstPart.split(/\s*&\s*/).map(name => name.trim()).filter(Boolean);
      console.log(`Split first names:`, firstNames);
      
      firstNames.forEach(firstName => {
        const fullNameForParsing = `${lastPart}, ${firstName}`;
        const result = parseIndividualName(fullNameForParsing);
        console.log(`  "${firstName}" -> First="${result.firstName}", Last="${result.lastName}"`);
      });
    }
  }
});