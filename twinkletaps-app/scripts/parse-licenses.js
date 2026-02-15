const fs = require("fs");
const { execSync } = require("child_process");

// Generate licenses.json using license-checker
console.log("📋 Generating licenses.json...");
try {
  execSync(
    "npx license-checker --production --json --includeLicenseText > licenses.json",
    { stdio: "inherit" }
  );
  console.log("✅ licenses.json generated.");
} catch (error) {
  console.error("❌ Failed to generate licenses.json:", error.message);
  process.exit(1);
}

// Read the generated licenses.json
const licensesJson = JSON.parse(fs.readFileSync("licenses.json", "utf-8"));

const introduction = `
This file contains a comprehensive list of third-party software packages included in this project.
For each package, you'll find copyright details followed by the full license text.

---

`;

const licenseEntries = Object.entries(licensesJson)
  .map(([packageName, licenseData]) => {
    const copyright = licenseData.publisher || licenseData.email || "N/A";

    let licenseText = "License text not provided.";
    if (licenseData.licenseFile) {
      try {
        licenseText = fs.readFileSync(licenseData.licenseFile, "utf-8");
      } catch (error) {
        licenseText = "License file not found.";
      }
    }

    return `${packageName}\n${copyright}\n\n${licenseText}\n\n---\n`;
  })
  .join("\n");

const fullText = `${introduction}\n\n${licenseEntries}`;
fs.writeFileSync("THIRD_PARTY_LICENSES.txt", fullText, "utf-8");
console.log("✅ THIRD_PARTY_LICENSES.txt generated.");

// Clean up the temporary licenses.json file
try {
  fs.unlinkSync("licenses.json");
  console.log("🧹 Cleaned up licenses.json");
} catch (error) {
  console.warn("⚠️  Could not clean up licenses.json:", error.message);
}
