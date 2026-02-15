import { config } from "./config";

export const authCopy = {
  companyName: config.company.name,
  auth: {
    title: `Welcome to ${config.company.name}`,
    subtitle: "Enter your email to continue",
    emailLabel: "Email",
    emailPlaceholder: "Type your email",
    submitButton: "Send verification code",
  },
  verifyOtp: {
    title: "Enter verification code",
    subtitle: "We've sent a 6-digit code to your email",
    otpLabel: "Verification code",
    otpPlaceholder: "Enter 6-digit code",
    submitButton: "Verify",
    resendLink: "Didn't receive the code? Resend",
    backLink: "Back to sign in",
  },
  legal: {
    termsText: 'By clicking "Send verification code" you agree to our',
    termsLink: "Terms of Use",
    privacyLink: "Privacy Policy",
    andText: "and",
  },
} as const;
