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
    void init();
    void enable();
    void disable();
  private:
    int _pin;
};

#endif