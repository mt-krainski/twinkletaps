/*
  Led - Library for controlling a simple Led.
*/
#include "Arduino.h"
#include "Led.h"

const int DEFAULT_BLINK_DURATION = 100;

Led::Led(int pin) {
  _pin = pin;
  _enabledOnHigh = true;
}

Led::Led(int pin, bool enabledOnHigh){
  _pin = pin;
  _enabledOnHigh = enabledOnHigh;
}

void Led::init() {
  pinMode(_pin, OUTPUT);
}

void Led::enable() {
  if (_enabledOnHigh)
    digitalWrite(_pin, HIGH);
  else
    digitalWrite(_pin, LOW);
}

void Led::disable() {
  if (_enabledOnHigh)
    digitalWrite(_pin, LOW);
  else
    digitalWrite(_pin, HIGH);
}

void Led::blink() {
  blink(DEFAULT_BLINK_DURATION);
}

void Led::blink(int blinkDelay) {
  enable();
  delay(blinkDelay);
  disable();
  delay(blinkDelay);
}