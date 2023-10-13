#include <ArduinoJson.h>

#include "Relay.h"
#include "Led.h"
#include "Network.h"
#include "arduino-secrets.h"

const int ledSystemPin = 3;
const int ledLoopPin = 4;
const int ledNetworkPin = 5;
const int led4Pin = 6;

const int relayPin = 11;
volatile bool systemEnabled = false;
const int systemEnabledPin = 2;
Relay relay(relayPin);

Led ledSystem(ledSystemPin, false);
Led ledLoop(ledLoopPin, false);
Led ledNetwork(ledNetworkPin, false);
Led led4(led4Pin, false);

Network network(SECRET_SSID, SECRET_PASS, &ledNetwork);

StaticJsonDocument<200> doc;

void initialiseLeds(){
  ledSystem.init();
  ledLoop.init();
  ledNetwork.init();
  led4.init();

  ledSystem.disable();
  ledLoop.disable();
  ledNetwork.disable();
  led4.disable();
}

void initialiseSerial(){
  Serial.begin(115200);
  while (!Serial); // wait for serial port to connect. Needed for native USB port only
  delay(1000);
}

void setup() {
  initialiseLeds();

  // Flash to indicate system has been turned on
  ledSystem.blink();

  initialiseSerial();

  relay.init();
  relay.disable();

  pinMode(systemEnabledPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(systemEnabledPin), setOrClearSystemEnabled, CHANGE);

  // Flash to indicate network initialisation is starting
  ledSystem.blink();
  ledSystem.blink();

  network.init();

  char json[] = "{\"sensor\":\"gps\",\"time\":1351824120,\"data\":[48.756080,2.302038]}";

  // Deserialize the JSON document
  DeserializationError error = deserializeJson(doc, json);

  // Test if parsing succeeds.
  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return;
  }

  // Fetch values.
  //
  // Most of the time, you can rely on the implicit casts.
  // In other case, you can do doc["time"].as<long>();
  const char* sensor = doc["sensor"];
  // long time = doc["time"];
  // double latitude = doc["data"][0];
  // double longitude = doc["data"][1];

  // Print values.
  Serial.print("Sensor test data: ");
  Serial.println(sensor);

  StaticJsonDocument<5000> dummyData = network.get("dummyjson.com", "products/1", "");
  const int dummyDataId = dummyData["id"];
  Serial.print("Dummy data id: ");
  Serial.println(dummyDataId);

  // System initialised, turn on LED permanently
  ledSystem.enable();
}

void loop() {
  ledLoop.blink();

  if (systemEnabled) {
    relay.enable();
  } else {
    relay.disable();
  }
  delay(2000);
}

void setOrClearSystemEnabled() {
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);
}
