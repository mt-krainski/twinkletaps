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

  // System initialised, turn on LED permanently
  ledSystem.enable();
}

void loop() {
  ledLoop.blink();

  StaticJsonDocument<5000> dummyData = network.get(ONE_LAMP_SERVER_HOSTNAME, "state", "", AUTH_BASIC_CREDENTIALS);
  bool state = dummyData["state"];
  if (state) relay.enable();
  else relay.disable();

  // if (systemEnabled) {
  //   relay.enable();
  // } else {
  //   relay.disable();
  // }

  // Read potentiometer
  knobReading = analogRead(knobPin);
  // Serial.println(knobReading);
  
  delay(5000);
}

void setOrClearSystemEnabled() {
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);
}
