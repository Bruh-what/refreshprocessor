// Test the actual processNameIntoSeparateRows function logic
const testLiveImplementation = () => {
  console.log("=== Testing Live Implementation Logic ===");

  // Simulate the exact functions from CsvFormatter.jsx
  const toTitleCase = (str) => {
    if (!str) return str;
    return str
      .toLowerCase()
      .split(/\s+/)
      .map((word) => {
        if (word.length === 0) return word;
        if (word.includes("'")) {
          return word
            .split("'")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("'");
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };

  const isLikelyCompany = (name) => {
    if (!name) return false;
    const companyKeywords = [
      "llc",
      "inc",
      "corp",
      "company",
      "co",
      "ltd",
      "trust",
      "properties",
      "realty",
      "real estate",
      "mortgage",
      "bank",
      "financial",
      "services",
      "group",
      "team",
      "partners",
      "associates",
      "solutions",
      "consulting",
      "management",
      "development",
      "investments",
      "holdings",
      "ventures",
    ];
    const lowerName = name.toLowerCase();
    return companyKeywords.some((keyword) => lowerName.includes(keyword));
  };

  const parseIndividualName = (name) => {
    console.log(`  parseIndividualName called with: "${name}"`);

    if (!name || typeof name !== "string") {
      console.log(`    -> Invalid input, returning empty`);
      return { firstName: "", lastName: "", isValid: false };
    }

    if (isLikelyCompany(name)) {
      console.log(`    -> Detected as company`);
      return {
        firstName: toTitleCase(name.trim()),
        lastName: "",
        isValid: true,
      };
    }

    let firstName = "";
    let lastName = "";

    if (name.includes(",")) {
      console.log(`    -> Has comma, processing as "Last, First" format`);
      const [lastPart, firstPart] = name.split(",").map((part) => part.trim());
      console.log(`    -> lastPart: "${lastPart}", firstPart: "${firstPart}"`);

      lastName = toTitleCase(lastPart);
      console.log(`    -> lastName set to: "${lastName}"`);

      if (firstPart) {
        const firstParts = firstPart.split(/\s+/);
        console.log(
          `    -> firstParts: [${firstParts.map((p) => `"${p}"`).join(", ")}]`
        );

        let cleanFirstName = firstParts[0] || "";

        if (
          firstParts.length > 1 &&
          (firstParts[0].length === 1 ||
            (firstParts[0].length === 2 && firstParts[0].endsWith(".")))
        ) {
          console.log(
            `    -> First part "${firstParts[0]}" is an initial, looking for substantial name`
          );
          for (let i = 1; i < firstParts.length; i++) {
            if (firstParts[i].length > 1 && !firstParts[i].endsWith(".")) {
              cleanFirstName = firstParts[i];
              console.log(`    -> Found substantial name: "${cleanFirstName}"`);
              break;
            }
          }
        }

        firstName = toTitleCase(cleanFirstName);
        console.log(`    -> firstName set to: "${firstName}"`);
      }
    } else {
      console.log(`    -> No comma, processing as "First Last" format`);
      const parts = name.split(/\s+/).filter((part) => part.length > 0);
      console.log(`    -> parts: [${parts.map((p) => `"${p}"`).join(", ")}]`);

      if (parts.length >= 2) {
        firstName = toTitleCase(parts[0]);
        const lastPart = parts[parts.length - 1];

        if (
          lastPart.length === 1 ||
          (lastPart.length === 2 && lastPart.endsWith("."))
        ) {
          console.log(`    -> Last part "${lastPart}" is an initial`);
          if (parts.length >= 3) {
            lastName = toTitleCase(parts[parts.length - 2]);
            console.log(
              `    -> Using previous part as lastName: "${lastName}"`
            );
          } else {
            lastName = "";
            console.log(`    -> No substantial last name available`);
          }
        } else {
          lastName = toTitleCase(lastPart);
          console.log(`    -> Using last part as lastName: "${lastName}"`);
        }
      } else if (parts.length === 1) {
        firstName = toTitleCase(parts[0]);
        lastName = "";
        console.log(
          `    -> Single name, firstName: "${firstName}", lastName: ""`
        );
      }
    }

    const result = {
      firstName: firstName,
      lastName: lastName,
      isValid: firstName.length >= 1,
    };

    console.log(
      `    -> Final result: firstName="${result.firstName}", lastName="${result.lastName}", isValid=${result.isValid}`
    );
    return result;
  };

  // Test the exact scenario
  const nameString = "Rhodes,r Kent & Marsha J";
  console.log(`\nProcessing: "${nameString}"`);

  // Step 1: Split by comma
  const [lastPart, firstPart] = nameString
    .split(",")
    .map((part) => part.trim());
  console.log(
    `Split by comma: lastPart="${lastPart}", firstPart="${firstPart}"`
  );

  // Step 2: Check for & in firstPart
  if (firstPart && firstPart.includes("&")) {
    console.log(`Found & in firstPart, splitting...`);
    const firstNames = firstPart
      .split(/\s*&\s*/)
      .map((name) => name.trim())
      .filter(Boolean);
    console.log(`First names: [${firstNames.map((n) => `"${n}"`).join(", ")}]`);

    firstNames.forEach((firstName, index) => {
      console.log(`\n--- Processing name ${index + 1}: "${firstName}" ---`);
      const fullName = `${lastPart}, ${firstName}`;
      console.log(`Created fullName: "${fullName}"`);

      const result = parseIndividualName(fullName);
      console.log(
        `Result: ${result.firstName} ${result.lastName} (valid: ${result.isValid})`
      );
    });
  }
};

testLiveImplementation();
