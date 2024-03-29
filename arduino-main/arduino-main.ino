#include <ArduinoJson.h>

#include "Relay.h"
#include "Led.h"
#include "Network.h"
#include "arduino-secrets.h"

const bool DISABLE_NETWORKING = false;

const int ledSystemPin = 4;
const int ledLoopPin = 5;
const int ledNetworkPin = 6;
const int led4Pin = 7;

const int knobPin = A0;
int knobReading = 0;

const int relayPin = 11;
volatile bool systemEnabled = false;
const int systemEnabledPin = 2;

const int sendHeartButtonPin = 3;
volatile int heartsToSendCounter = 0;

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

  pinMode(sendHeartButtonPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(sendHeartButtonPin), incrementHeartsCounter, RISING);

  // Flash to indicate network initialisation is starting
  ledSystem.blink();
  ledSystem.blink();

  if (DISABLE_NETWORKING) { 
    Serial.println("WARNING, NETWORKING DISABLED");
  } else {
    network.init();
  }

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

  if (heartsToSendCounter > 0) {
    Serial.print("I have some hearts to send: ");
    Serial.println(heartsToSendCounter);
    Serial.println("Sending hearts...");
    if (!DISABLE_NETWORKING) sendHearts();
    Serial.println("Hearts sent!");
  }

  if (!DISABLE_NETWORKING) getLampStateFromServer();
}

void setOrClearSystemEnabled() {
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);
}

void incrementHeartsCounter() {
  static unsigned long last_interrupt_time = 0;
  unsigned long interrupt_time = millis();
  // Some debounde protection
  if (interrupt_time - last_interrupt_time > 100) {
    heartsToSendCounter++;
    last_interrupt_time = interrupt_time;
  }
}

void getLampStateFromServer() {
  char getLampPath[100] = "";
  strcat(getLampPath, API_TOKEN);
  strcat(getLampPath, "/state");
  StaticJsonDocument<5000> serverResponse = network.get(TWINKLETAPS_SERVER_HOSTNAME, getLampPath, "caller=one-lamp", "");
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

void sendHearts() {
  char addHeartsPath[100] = "";
  strcat(addHeartsPath, API_TOKEN);
  strcat(addHeartsPath, "/hearts/add");
  DynamicJsonDocument requestBody(1024);
  requestBody["count"] = heartsToSendCounter;
  heartsToSendCounter=0;
  StaticJsonDocument<5000> serverResponse = network.post(TWINKLETAPS_SERVER_HOSTNAME, addHeartsPath, "", requestBody, "");
}
