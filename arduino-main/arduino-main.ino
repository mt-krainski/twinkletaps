#include <ArduinoJson.h>

#include "Relay.h"
#include "Led.h"
#include "Network.h"
#include "arduino-secrets.h"

const int ledSystemPin = 3;
const int ledLoopPin = 4;
const int ledNetworkPin = 5;
const int led4Pin = 6;

const int knobPin = A0;
int knobReading = 0;

const int relayPin = 11;
volatile bool systemEnabled = false;
const int systemEnabledPin = 2;

int invalidServerResponseCounter = 0;
const int invalidServerResponseLimit = 5;

Relay relay(relayPin);

Led ledSystem(ledSystemPin, false);
Led ledLoop(ledLoopPin, false);
Led ledNetwork(ledNetworkPin, false);
Led led4(led4Pin, false);

Network network(SECRET_SSID, SECRET_PASS, &ledNetwork);

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
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);

  // Flash to indicate network initialisation is starting
  ledSystem.blink();
  ledSystem.blink();

  network.init();

  // System initialised, turn on LED permanently
  ledSystem.enable();
}

void loop() {
  delay(5000);
  ledLoop.blink();

  if (!systemEnabled) {
    Serial.println("System disabled");
    return;
  }

  char path[100] = "";
  strcat(path, API_TOKEN);
  strcat(path, "/");
  strcat(path, "state");
  StaticJsonDocument<5000> serverResponse = network.get(ONE_LAMP_SERVER_HOSTNAME, path, "caller=one-lamp", "");
  if (serverResponse.containsKey("state")) {
    bool state = serverResponse["state"];
    if (state) {
      relay.enable();
    } else {
      relay.disable();
    }
    invalidServerResponseCounter = 0;
  } else {
    Serial.print("Invalid server response (");
    invalidServerResponseCounter++;
    Serial.print(invalidServerResponseCounter);
    Serial.print("/");
    Serial.print(invalidServerResponseLimit);
    Serial.print(")");
    Serial.println();
    if (invalidServerResponseCounter >= invalidServerResponseLimit) {
      Serial.println("Failure limit reached, resetting...");
      relay.disable();
      // We're getting errors, let's try to restart, it might be a network issue.
      // Based on https://forum.arduino.cc/t/reset-by-software-arduino-r4/1154313/2
      NVIC_SystemReset();
    }
  }
}

void setOrClearSystemEnabled() {
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);
}
