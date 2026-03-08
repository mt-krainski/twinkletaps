#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const path = require("path");

// Get environment variables
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || "Matt's Starter";

if (!SUPABASE_ACCESS_TOKEN) {
  console.error(
    "Error: SUPABASE_ACCESS_TOKEN environment variable is required"
  );
  process.exit(1);
}

if (!SUPABASE_PROJECT_REF) {
  console.error("Error: SUPABASE_PROJECT_REF environment variable is required");
  process.exit(1);
}

// Read and process email template
function readEmailTemplate() {
  try {
    const templatePath = path.join(
      __dirname,
      "../supabase/templates/email-otp.html"
    );
    let templateContent = fs.readFileSync(templatePath, "utf8");

    // Replace templated variables with actual company name
    // TODO: review whether I don't prefer to use a proper template engine
    templateContent = templateContent.replace(
      /\{\{ \.CompanyName \}\}/g,
      COMPANY_NAME
    );

    return templateContent;
  } catch (error) {
    console.error("Error reading email template:", error.message);
    process.exit(1);
  }
}

// Function to make HTTPS request
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.supabase.com",
      port: 443,
      path: `/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`,
      method: method,
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Main function to update email templates
async function updateEmailTemplates() {
  try {
    console.log(
      `Updating email templates for project: ${SUPABASE_PROJECT_REF}`
    );
    console.log(`Using company name: ${COMPANY_NAME}`);

    // Read and process the email template
    const emailContent = readEmailTemplate();

    // Email template updates
    const emailTemplates = {
      // Magic link templates
      mailer_subjects_magic_link: `Your verification code for ${COMPANY_NAME}`,
      mailer_templates_magic_link_content: emailContent,

      // Confirmation templates (same content)
      mailer_subjects_confirmation: `Your verification code for ${COMPANY_NAME}`,
      mailer_templates_confirmation_content: emailContent,
    };

    // Update the email templates
    const response = await makeRequest("PATCH", "", emailTemplates);

    console.log("✅ Email templates updated successfully!");
    console.log("Updated templates:");
    console.log("- Magic link subject and content");
    console.log("- Confirmation subject and content");
  } catch (error) {
    console.error("❌ Error updating email templates:", error.message);
    process.exit(1);
  }
}

// Run the script
updateEmailTemplates();
