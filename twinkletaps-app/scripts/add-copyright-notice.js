const fs = require("fs");

// Read AUTHORS file
const authors = fs
  .readFileSync("AUTHORS", "utf-8")
  .split("\n")
  .filter((line) => line.trim())
  .join(", ");

// Read LICENSE file to get the license type
const licenseContent = fs.readFileSync("LICENSE", "utf-8");
const licenseType = licenseContent.split("\n")[0]; // First line contains the license type

// Create the copyright notice
const currentYear = new Date().getFullYear();
const copyrightNotice = `<!-- 
  © ${currentYear} ${authors}. Licensed under ${licenseType}. 
  This project includes third-party open-source software with various licenses.
  For detailed license information, see /THIRD_PARTY_LICENSES.txt.
-->`;

// Function to update only the index.html file
function updateIndexHtml() {
  const indexPath = ".next/server/app/index.html";

  if (fs.existsSync(indexPath)) {
    // Read the HTML file
    let htmlContent = fs.readFileSync(indexPath, "utf-8");

    // Add the copyright notice after the DOCTYPE
    if (htmlContent.includes("<!DOCTYPE html>")) {
      htmlContent = htmlContent.replace(
        "<!DOCTYPE html>",
        `<!DOCTYPE html>\n${copyrightNotice}`
      );

      // Write the updated content back
      fs.writeFileSync(indexPath, htmlContent, "utf-8");
      console.log(`✅ Added copyright notice to ${indexPath}`);
    }
  } else {
    console.warn("⚠️  index.html not found at expected path");
  }
}

// Update only the index.html file
console.log("📝 Adding copyright notice to index.html...");
updateIndexHtml();
console.log("✅ Copyright notice added successfully.");
