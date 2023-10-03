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

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for native USB port only
  }

  led.init();
  relay.init();
  pinMode(systemEnabledPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(systemEnabledPin), setOrClearSystemEnabled, CHANGE);
  led.disable();
  relay.disable();

  network.init();
}

void loop() {
  // put your main code here, to run repeatedly:
  delay(100);
  if (systemEnabled) {
    relay.enable();
  } else {
    relay.disable();
  }
  led.enable();
  delay(100);
  led.disable();
}

void setOrClearSystemEnabled() {
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);
}
