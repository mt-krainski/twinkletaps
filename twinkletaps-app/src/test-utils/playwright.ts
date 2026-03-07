import { createClient } from "@supabase/supabase-js";
import { Page, expect } from "@playwright/test";

interface MailpitRecipient {
  Name: string;
  Address: string;
}

interface MailpitMessage {
  ID: string;
  MessageID: string;
  Read: boolean;
  From: {
    Name: string;
    Address: string;
  };
  To: MailpitRecipient[];
  Cc: MailpitRecipient[];
  Bcc: MailpitRecipient[];
  ReplyTo: MailpitRecipient[];
  Subject: string;
  Created: string;
  Tags: string[];
  Size: number;
  Attachments: number;
  Snippet: string;
}

interface MailpitResponse {
  total: number;
  unread: number;
  count: number;
  messages_count: number;
  start: number;
  tags: string[];
  messages: MailpitMessage[];
}

/**
 * Re-seed unclaimed MQTT credentials so device-registration tests don't
 * fail when the pool is exhausted from previous runs.
 * Cleans up stale e2e-seeded credentials first to avoid accumulation.
 */
export async function seedMqttCredentials(count = 5) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Clean up unclaimed credentials from previous e2e runs
  await supabase
    .from("mqtt_credentials")
    .delete()
    .like("username", "e2e-device-%")
    .is("claimed_at", null);

  const rows = Array.from({ length: count }, () => ({
    username: `e2e-device-${crypto.randomUUID().slice(0, 8)}`,
    password: "test-password",
    allocated_uuid: crypto.randomUUID(),
  }));

  const { error } = await supabase
    .from("mqtt_credentials")
    .insert(rows);

  if (error) throw new Error(`Failed to seed MQTT credentials: ${error.message}`);
}

export async function login(page: Page, userEmail: string) {
  await page.goto("/auth");
  await page.getByRole("textbox", { name: "Email" }).fill(userEmail);
  await page.getByRole("button", { name: "Send verification code" }).click();

  await expect(page).toHaveURL(/\/auth\/verify-otp(\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: "Enter verification code" }),
  ).toBeVisible();

  // Fetch emails from Mailpit
  const mailpitResponse = await fetch(
    `${process.env.SUPABASE_INBUCKET_URL}/api/v1/messages`,
  );
  const mailpitData: MailpitResponse = await mailpitResponse.json();

  // Find email addressed to the user
  const userEmailMessage = mailpitData.messages.find(
    (message: MailpitMessage) =>
      message.To.some(
        (recipient: MailpitRecipient) => recipient.Address === userEmail,
      ),
  );

  if (!userEmailMessage) {
    throw new Error(`No email found for ${userEmail}`);
  }

  // Extract 6-digit verification code from snippet
  const snippet = userEmailMessage.Snippet;
  const verificationCodeMatch = snippet.match(/\b\d{6}\b/);
  if (!verificationCodeMatch) {
    throw new Error("No 6-digit verification code found in email snippet");
  }
  const verificationCode = verificationCodeMatch[0];

  await page
    .getByRole("textbox", { name: "Verification code" })
    .fill(verificationCode);

  await page.getByRole("button", { name: "Verify" }).click();
}
