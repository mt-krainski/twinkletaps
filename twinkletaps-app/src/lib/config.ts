export const config = {
  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || "Matt's Starter",
    email: {
      subject: `Your verification code for ${
        process.env.NEXT_PUBLIC_COMPANY_NAME || "Matt's Starter"
      }`,
      teamName: `${
        process.env.NEXT_PUBLIC_COMPANY_NAME || "Matt's Starter"
      } Team`,
    },
  },
  urls: {
    terms: process.env.NEXT_PUBLIC_TERMS_URL || "#",
    privacy: process.env.NEXT_PUBLIC_PRIVACY_URL || "#",
  },
} as const;
