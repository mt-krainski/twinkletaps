const int ledPin = 13;
const int switchPin = 12;
const int relayPin = 11;
volatile bool systemEnabled = false;
const int systemEnabledPin = 2;

void setup() {
  // put your setup code here, to run once:
  initialiseLed();
  initialiseRelay();
  pinMode(systemEnabledPin, INPUT);
  attachInterrupt(digitalPinToInterrupt(systemEnabledPin), setOrClearSystemEnabled, CHANGE);
  disableLed();
  disableRelay();
  Serial.begin(9600);
}

void loop() {
  // put your main code here, to run repeatedly:
  delay(1000);
  Serial.print("Test\n");
  if (!systemEnabled){
    return;
  }
  enableLed();
  enableRelay();
  delay(1000);
  disableLed();
  disableRelay();
}

void setOrClearSystemEnabled() {
  systemEnabled = (digitalRead(systemEnabledPin) == HIGH);
}

void initialiseRelay() {
  pinMode(relayPin, OUTPUT);
}

void enableRelay() {
  digitalWrite(relayPin, LOW);
}

void disableRelay() {
  digitalWrite(relayPin, HIGH);
}

void initialiseLed() {
  pinMode(ledPin, OUTPUT);
}

void enableLed() {
  digitalWrite(ledPin, HIGH);
}

void disableLed() {
  digitalWrite(ledPin, LOW);
}