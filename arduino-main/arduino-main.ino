#include <ArduinoJson.h>

#include "Relay.h"
#include "Led.h"
#include "Network.h"
#include "arduino-secrets.h"

const int ledPin = 13;
const int relayPin = 11;
volatile bool systemEnabled = false;
const int systemEnabledPin = 2;
Relay relay(relayPin);
Led led(ledPin);
Network network(SECRET_SSID, SECRET_PASS);

StaticJsonDocument<200> doc;

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for native USB port only
  }

  delay(5000);

  led.init();
  relay.init();
  pinMode(systemEnabledPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(systemEnabledPin), setOrClearSystemEnabled, CHANGE);
  led.disable();
  relay.disable();

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
}

void loop() {
  // put your main code here, to run repeatedly:
  delay(1000);
  if (systemEnabled) {
    relay.enable();
  } else {
    relay.disable();
  }
  led.enable();
  delay(1000);
  led.disable();
}

void setOrClearSystemEnabled() {
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);
}
