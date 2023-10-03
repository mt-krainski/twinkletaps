/*
  Network - A convenience class for connecting to the internet
*/

#include "Arduino.h"
#include "Network.h"

Network::Network(const char ssid[], const char pass[]) {
  _ssid = ssid;
  _pass = pass;
  _status = WL_IDLE_STATUS;
}

/**
  Initialise the network connection.
  Returns false if connection was not established properly.
*/
bool Network::init() {
  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("Communication with WiFi module failed!");
    return false;
  }

  String fv = WiFi.firmwareVersion();
  if (fv < WIFI_FIRMWARE_LATEST_VERSION) {
    Serial.println("Please upgrade the firmware");
  }

  // attempt to connect to WiFi network:
  const int connectionAttemptLimit = 10;
  for (int i=0; i < connectionAttemptLimit; i++) {
    Serial.print("Attempting to connect to WPA SSID: ");
    Serial.print(_ssid);
    Serial.print(" (");
    Serial.print(i+1);
    Serial.print("/");
    Serial.print(connectionAttemptLimit);
    Serial.print(")");

    _status = WiFi.begin(_ssid, _pass);

    // wait 10 seconds for connection:
    delay(10000);
    if (_status == WL_CONNECTED) break;
  }
  if (_status != WL_CONNECTED) return false;

  Serial.println("Connected to the network");
  printCurrentNet();
  printWifiData();

  return true;
}

void Network::printCurrentNet() {
  // print the SSID of the network you're attached to:
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print the MAC address of the router you're attached to:
  byte bssid[6];
  WiFi.BSSID(bssid);
  Serial.print("BSSID: ");
  printMacAddress(bssid);

  // print the received signal strength:
  long rssi = WiFi.RSSI();
  Serial.print("signal strength (RSSI):");
  Serial.println(rssi);

  // print the encryption type:
  byte encryption = WiFi.encryptionType();
  Serial.print("Encryption Type:");
  Serial.println(encryption, HEX);
  Serial.println();
}

void Network::printWifiData() {
  // print your board's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  
  Serial.println(ip);

  // print your MAC address:
  byte mac[6];
  WiFi.macAddress(mac);
  Serial.print("MAC address: ");
  printMacAddress(mac);
}

void Network::printMacAddress(byte mac[]) {
  for (int i = 5; i >= 0; i--) {
    if (mac[i] < 16) {
      Serial.print("0");
    }
    Serial.print(mac[i], HEX);
    if (i > 0) {
      Serial.print(":");
    }
  }
  Serial.println();
}
