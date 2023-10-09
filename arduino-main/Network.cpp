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
    Serial.println(")");

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

StaticJsonDocument<5000> Network::get(const char host[], const char path[], const char query[]){
  char response[5000] = "\0";

  if (_client.connect(host, 443)) {
    Serial.print("connected to host: ");
    Serial.println(host);
    // Make a HTTP request:
    char requestGetLine[100] = "GET /";
    strcat(requestGetLine, path);
    strcat(requestGetLine, "?");
    strcat(requestGetLine, query);
    strcat(requestGetLine, " HTTP/1.1");
    Serial.println(requestGetLine);
    _client.println(requestGetLine);

    char requestHostLine[100] = "Host: ";
    strcat(requestHostLine, host);
    Serial.println(requestHostLine);
    _client.println(requestHostLine);

    _client.println("Connection: close");
    _client.println();

    
    Serial.print("Client Available? ");
    Serial.println(_client.available());
    delay(2000);
    Serial.print("Client Available? ");
    Serial.println(_client.available());

    bool lastCharNewline = false;
    bool receivingBody = false;
    uint32_t responseId = 0;
    for (uint32_t i = 0; i < 5000; i++){
      if(!_client.available()) break;
      char c = _client.read();
      if (c == '\r') continue;  // Ignore carraige return symbols.
      Serial.print(c);
      if (c == '\n') {
        Serial.print("(c is newline!)");
        if (lastCharNewline) {
          Serial.print("(receivingBody = true)");
          receivingBody = true;
          continue;
        } else {
          lastCharNewline = true;
        }
        Serial.println();
      } else if (c != '\r'){
        lastCharNewline = false;
      }
      if (receivingBody) {
        response[responseId] = c;
        responseId++;
      }
    }
  }
  Serial.println();
  Serial.println("Response:");
  Serial.println(response);

  StaticJsonDocument<5000> doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
    return doc;
  }
  return doc;
}
