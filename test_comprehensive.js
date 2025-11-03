// Test the name parsing fix for middle initials - comprehensive test
const testNameParsing = () => {
  // Test case that was failing
  const testName = "Rhodes,r Kent & Marsha J";
  
  // Simulate the ACTUAL workflow that happens in the app
  console.log("=== TESTING ACTUAL WORKFLOW ===");
  console.log("Original: 'Rhodes,r Kent & Marsha J'");
  
  // Step 1: Split by comma (like the app does)
  const [lastPart, firstPart] = testName.split(",").map(part => part.trim());
  console.log(`After comma split: lastPart="${lastPart}", firstPart="${firstPart}"`);
  
  // Step 2: Split firstPart by & (like the app does)
  const firstNames = firstPart.split(/\s*&\s*/).map(name => name.trim());
  console.log("First names after & split:", firstNames);
  
  // Step 3: For each firstName, create "Last, First" format and parse
  firstNames.forEach((firstName, index) => {
    const fullName = `${lastPart}, ${firstName}`;
    console.log(`\nCreated full name ${index + 1}: "${fullName}"`);
    
    // Now parse this with parseIndividualName
    const parsed = parseIndividualName(fullName);
    console.log(`Parsed result: ${parsed.firstName} ${parsed.lastName}`);
    console.log(`Expected: ${index === 0 ? 'Kent Rhodes' : 'Marsha Rhodes'}`);
  });
  
  // Simulate the parseIndividualName function logic (updated version)
  function parseIndividualName(name) {
    console.log(`  Parsing: "${name}"`);
    
    if (!name || typeof name !== "string") {
      return { firstName: "", lastName: "", isValid: false };
    }

    let firstName = "";
    let lastName = "";

    // Handle "Last, First Middle-Initial" format
    if (name.includes(",")) {
      const [lastPart, firstPart] = name
        .split(",")
        .map((part) => part.trim());

      console.log(`    Comma split: lastPart="${lastPart}", firstPart="${firstPart}"`);
      
      lastName = lastPart;

      // Keep the first given name, ignore middle initials after the comma
      if (firstPart) {
        const firstParts = firstPart.split(/\s+/);
        console.log(`    First parts: [${firstParts.map(p => `"${p}"`).join(', ')}]`);
        
        let cleanFirstName = firstParts[0] || "";
        
        // If first part is just an initial, try to use the next substantial part
        if (
          firstParts.length > 1 &&
          (firstParts[0].length === 1 ||
            (firstParts[0].length === 2 && firstParts[0].endsWith(".")))
        ) {
          console.log(`    First part "${firstParts[0]}" is an initial, looking for substantial part...`);
          // Look for the next substantial part (not an initial)
          for (let i = 1; i < firstParts.length; i++) {
            if (firstParts[i].length > 1 && !firstParts[i].endsWith(".")) {
              cleanFirstName = firstParts[i];
              console.log(`    Found substantial part: "${cleanFirstName}"`);
              break;
            }
          }
        }
        
        firstName = cleanFirstName;
      }
    }

    console.log(`    Result: firstName="${firstName}", lastName="${lastName}"`);
    
    return {
      firstName: firstName,
      lastName: lastName,
      isValid: firstName.length >= 1,
    };
  }
};

testNameParsing();