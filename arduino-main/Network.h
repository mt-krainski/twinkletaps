/*
  Network.h - A convenience class for connecting to the internet
*/
#ifndef Network_h
#define Network_h

#include <WiFiS3.h>
#include <ArduinoJson.h>

#include "Arduino.h"
#include "Led.h"

class Network
{
  public:
    Network(const char ssid[], const char pass[]);
    Network(const char ssid[], const char pass[], Led *statusLed);
    bool init();
    StaticJsonDocument<5000> get(const char host[], const char path[], const char query[], const char basicAuth[]);
    StaticJsonDocument<5000> post(const char host[], const char path[], const char query[], const DynamicJsonDocument body_json, const char basicAuth[]);
  private:
    void printWifiData();
    void printCurrentNet();
    void printMacAddress(byte mac[]);
    void blink();
    void blink(int repeatCount);
    const char* _ssid;
    const char* _pass;
    int _status;
    WiFiClient _client;
    Led *_statusLed=NULL;
};

#endif