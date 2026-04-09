export const config = {
  company: {
    name: "TwinkleTaps",
    email: {
      subject: "Your verification code for TwinkleTaps",
      teamName: "TwinkleTaps Team",
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
  mqttAuth: {
    secret: process.env.MQTT_AUTH_SECRET,
    publisherUsername: process.env.MQTT_PUBLISHER_USERNAME,
    publisherPassword: process.env.MQTT_PUBLISHER_PASSWORD,
  },
} as const;
