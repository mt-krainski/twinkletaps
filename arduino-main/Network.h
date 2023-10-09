/*
  Network.h - A convenience class for connecting to the internet
*/
#ifndef Network_h
#define Network_h

#include <WiFiS3.h>
#include <ArduinoJson.h>

#include "Arduino.h"

class Network
{
  public:
    Network(const char ssid[], const char pass[]);
    bool init();
    StaticJsonDocument<5000> get(const char host[], const char path[], const char query[]);
  private:
    void printWifiData();
    void printCurrentNet();
    void printMacAddress(byte mac[]);
    const char* _ssid;
    const char* _pass;
    int _status;
    WiFiSSLClient _client;
};

#endif