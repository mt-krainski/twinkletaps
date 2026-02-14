/*
  Relay - Library for controlling a simple Relay.
*/
#include "Arduino.h"
#include "Relay.h"

Relay::Relay(int pin) {
  _pin = pin;
}

void Relay::init() {
  pinMode(_pin, OUTPUT);
}

void Relay::enable() {
  digitalWrite(_pin, HIGH);
}

void Relay::disable() {
  digitalWrite(_pin, LOW);
}