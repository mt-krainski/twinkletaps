/*
  Led.h - Library for controlling a simple Led.
*/
#ifndef Led_h
#define Led_h

#include "Arduino.h"

class Led
{
  public:
    Led(int pin);
    Led(int pin, bool enabledOnHigh);
    void init();
    void enable();
    void disable();
    void blink();
    void blink(int blinkDelay);
  private:
    int _pin;
    bool _enabledOnHigh;
};

#endif