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
  mqtt: {
    brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL,
  },
  mqttPublisher: {
    brokerUrl: process.env.MQTT_BROKER_URL,
    username: process.env.MQTT_PUBLISHER_USERNAME,
    password: process.env.MQTT_PUBLISHER_PASSWORD,
  },
} as const;
