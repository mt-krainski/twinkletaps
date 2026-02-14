#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include <ArduinoJson.h>

#include "arduino-secrets.h"
#include "ca-certs.h"
#include "Led.h"
#include "Relay.h"

WiFiSSLClient wifiClient;
MqttClient mqttClient(wifiClient);

const int RELAY_PIN = 8;
const int BUTTON_PIN = 12;
const int SWITCH_PIN = 11;

Led led(LED_BUILTIN);
Relay relay(RELAY_PIN);

volatile bool buttonPressed = false;
volatile bool switchEnabled = false;

const int MQTT_PORT = 8883;
const int SEQUENCE_STEP_MS = 250;
const int MAX_MESSAGE_SIZE = 1024;

void setup() {
  Serial.begin(115200);
  while (!Serial);
  delay(1000);

  led.init();
  led.disable();

  relay.init();
  relay.disable();

  pinMode(BUTTON_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), onButtonPress, RISING);

  pinMode(SWITCH_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(SWITCH_PIN), onSwitchChange, CHANGE);
  switchEnabled = (digitalRead(SWITCH_PIN) == HIGH);

  Serial.println("🚀 TwinkleTapsLampNew - MQTT Subscriber");
  Serial.println("========================================");
  Serial.println();

  connectToWiFi();
  connectToMQTT();
  subscribeToTopic();

  Serial.println("✅ Setup complete. Waiting for messages...");
  Serial.println();

  for (int i = 0; i < 3; i++) {
    led.blink();
  }
}

void loop() {
  mqttClient.poll();

  if (buttonPressed) {
    buttonPressed = false;
    led.blink();
  }
}

void connectToWiFi() {
  Serial.print("Attempting to connect to WiFi SSID: ");
  Serial.println(SECRET_SSID);

  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("❌ Communication with WiFi module failed!");
    while (1);
  }

  String fv = WiFi.firmwareVersion();
  if (fv < WIFI_FIRMWARE_LATEST_VERSION) {
    Serial.println("⚠️  Please upgrade the WiFi firmware");
  }

  const int connectionAttemptLimit = 10;
  for (int i = 0; i < connectionAttemptLimit; i++) {
    Serial.print("Connecting attempt ");
    Serial.print(i + 1);
    Serial.print("/");
    Serial.println(connectionAttemptLimit);

    WiFi.begin(SECRET_SSID, SECRET_PASS);

    // Wait for connection + DHCP lease
    for (int j = 0; j < 10; j++) {
      delay(1000);
      if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
        break;
      }
    }

    if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
      break;
    }
  }

  if (WiFi.status() != WL_CONNECTED || WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println("❌ Failed to connect to WiFi");
    while (1);
  }

  Serial.println("✅ Connected to WiFi");
  printWiFiStatus();
  Serial.println();
}

void connectToMQTT() {
  wifiClient.setCACert(ROOT_CA_CERT);
  mqttClient.setUsernamePassword(MQTT_USER, MQTT_PASS);

  Serial.print("Attempting to connect to MQTT broker: ");
  Serial.println(MQTT_HOST);
  Serial.print("Port: ");
  Serial.println(MQTT_PORT);

  if (!mqttClient.connect(MQTT_HOST, MQTT_PORT)) {
    Serial.print("❌ MQTT connection failed! Error code: ");
    Serial.println(mqttClient.connectError());
    while (1);
  }

  Serial.println("✅ Connected to MQTT broker");
  Serial.println();
}

void subscribeToTopic() {
  mqttClient.onMessage(onMqttMessage);

  Serial.print("Subscribing to topic: ");
  Serial.println(MQTT_TOPIC);

  if (!mqttClient.subscribe(MQTT_TOPIC)) {
    Serial.println("❌ Failed to subscribe!");
    while (1);
  }

  Serial.println("✅ Subscribed to topic");
  Serial.println();
}

void onMqttMessage(int messageSize) {
  Serial.println("📨 Message received!");
  Serial.print("   Topic: ");
  Serial.println(mqttClient.messageTopic());
  Serial.print("   Length: ");
  Serial.print(messageSize);
  Serial.println(" bytes");

  if (messageSize >= MAX_MESSAGE_SIZE) {
    Serial.println("   ❌ Message too large, skipping");
    while (mqttClient.available()) mqttClient.read();
    return;
  }

  char payload[MAX_MESSAGE_SIZE];
  int bytesRead = 0;
  while (mqttClient.available() && bytesRead < MAX_MESSAGE_SIZE - 1) {
    payload[bytesRead++] = (char)mqttClient.read();
  }
  payload[bytesRead] = '\0';

  Serial.print("   Payload: ");
  Serial.println(payload);

  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload);
  if (error) {
    Serial.print("   ❌ JSON parse failed: ");
    Serial.println(error.f_str());
    return;
  }

  if (!doc.containsKey("sequence")) {
    Serial.println("   ❌ Missing 'sequence' key");
    return;
  }

  const char* sequence = doc["sequence"];
  if (sequence == nullptr) {
    Serial.println("   ❌ 'sequence' is not a string");
    return;
  }

  playSequence(sequence);
}

void playSequence(const char* sequence) {
  Serial.print("   ▶ Playing sequence: ");
  Serial.println(sequence);

  if (!switchEnabled) {
    Serial.println("   ⏭ Switch is OFF, skipping sequence");
    return;
  }

  for (int i = 0; sequence[i] != '\0'; i++) {
    char step = sequence[i];
    if (step != '0' && step != '1') {
      Serial.print("   ❌ Invalid character in sequence: ");
      Serial.println(step);
      relay.disable();
      return;
    }
    if (step == '1') relay.enable(); else relay.disable();
    delay(SEQUENCE_STEP_MS);
  }

  relay.disable();
  Serial.println("   ✅ Sequence complete");
}

void onButtonPress() {
  static unsigned long lastInterruptTime = 0;
  unsigned long now = millis();
  if (now - lastInterruptTime > 100) {
    buttonPressed = true;
    lastInterruptTime = now;
  }
}

void onSwitchChange() {
  switchEnabled = (digitalRead(SWITCH_PIN) == HIGH);
}

void printWiFiStatus() {
  Serial.print("   SSID: ");
  Serial.println(WiFi.SSID());

  IPAddress ip = WiFi.localIP();
  Serial.print("   IP Address: ");
  Serial.println(ip);

  long rssi = WiFi.RSSI();
  Serial.print("   Signal strength (RSSI): ");
  Serial.print(rssi);
  Serial.println(" dBm");
}
