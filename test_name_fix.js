// Test the name parsing fix for middle initials
const testNameParsing = () => {
  // Test case that was failing
  const testName = "Rhodes,r Kent & Marsha J";

  // Simulate the parseIndividualName function logic
  const parseIndividualName = (name) => {
    if (!name || typeof name !== "string") {
      return { firstName: "", lastName: "", isValid: false };
    }

    let firstName = "";
    let lastName = "";

    // Handle "Last, First Middle-Initial" format
    if (name.includes(",")) {
      const [lastPart, firstPart] = name.split(",").map((part) => part.trim());

      lastName = lastPart;

      // Keep the first given name, ignore middle initials after the comma
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

        firstName = cleanFirstName;
      }
    }

    return {
      firstName: firstName,
      lastName: lastName,
      isValid: firstName.length >= 1,
    };
  };

  console.log("Testing: 'Rhodes,r Kent & Marsha J'");

  // Split by & first
  const names = testName.split(" & ");
  console.log("Split by &:", names);

  // Parse each name
  names.forEach((name, index) => {
    const parsed = parseIndividualName(name.trim());
    console.log(
      `Name ${index + 1}: "${name.trim()}" -> ${parsed.firstName} ${
        parsed.lastName
      }`
    );
  });
};

testNameParsing();
