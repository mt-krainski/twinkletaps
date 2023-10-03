/*
  Led - Library for controlling a simple Led.
*/
#include "Arduino.h"
#include "Led.h"

Led::Led(int pin) {
  _pin = pin;
}

void Led::init() {
  pinMode(_pin, OUTPUT);
}

void Led::enable() {
  digitalWrite(_pin, HIGH);
}

void Led::disable() {
  digitalWrite(_pin, LOW);
}