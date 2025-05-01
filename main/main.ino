// Include necessary libraries
#include <WiFi.h>
#include <SPIFFS.h>
#include "ESPExpress.h"
#include <ArduinoJson.h>

// Wi-Fi credentials
const char* ssid = "rami";
const char* pass = "ramirami";

// Ultrasonic sensor pins (trigger, echo)
const int SENSOR_PINS[6][2] = {
  {13, 12},
  {14, 27},
  {26, 25},
  {33, 32},
  {5,  18},
  {19, 21}
};

// LED pins corresponding to each slot (choose free GPIOs)
const int LED_PINS[6] = {2, 4, 15, 16, 17, 22};

const float DISTANCE_THRESHOLD = 50.0; // cm

ESPExpress app(80);

// Tracks which sensors are physically attached
bool sensorAttached[6] = {false};

// Measure raw distance from one ultrasonic sensor
float rawDistance(int trig, int echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  unsigned long pulse = pulseIn(echo, HIGH, 30000);
  float cm = pulse * 0.034 / 2.0;
  return (cm < 2 || cm > 400) ? -1.0 : cm;
}

// Skip unattached sensors
float measureDistance(int i) {
  if (!sensorAttached[i]) return -1.0;
  return rawDistance(SENSOR_PINS[i][0], SENSOR_PINS[i][1]);
}

void setup() {
  Serial.begin(115200);
  SPIFFS.begin(true);

  // Configure sensor pins
  for (int i = 0; i < 6; i++) {
    pinMode(SENSOR_PINS[i][0], OUTPUT);
    pinMode(SENSOR_PINS[i][1], INPUT_PULLDOWN);
  }

  // Configure LED pins
  for (int i = 0; i < 6; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
  }

  // Autodetect sensors
  for (int i = 0; i < 6; i++) {
    int validCount = 0;
    for (int t = 0; t < 5; t++) {
      float d = rawDistance(SENSOR_PINS[i][0], SENSOR_PINS[i][1]);
      if (d > 2 && d < 400) validCount++;
      delay(20);
    }
    sensorAttached[i] = (validCount > 0);
    Serial.printf("Slot %d: %s\n", i+1,
                  sensorAttached[i] ? "FOUND sensor" : "no sensor");
  }

  // Connect to Wi-Fi
  WiFi.begin(ssid, pass);
  Serial.print("WiFi…");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.println("\nIP: " + WiFi.localIP().toString());

  // HTTP & CORS
  app.enableCORS("*");
  app.options("/*", [](Request& req, Response& res) {
    res.status(204)
       .setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
       .end();
  });

  // Serve JSON status
  app.get("/", [](Request &req, Response &res) {
    DynamicJsonDocument doc(512);
    doc["type"] = "parking_status";
    JsonArray slots = doc.createNestedArray("slots");

    for (int i = 0; i < 6; i++) {
      float d = measureDistance(i);
      bool occupied = (d > 0 && d < DISTANCE_THRESHOLD);

      // Light LED if occupied
      if (sensorAttached[i]) {
        digitalWrite(LED_PINS[i], occupied ? HIGH : LOW);
      }

      JsonObject s = slots.createNestedObject();
      s["id"]          = i + 1;
      s["occupied"]    = occupied;
      s["distance_cm"] = d;  // –1: invalid or no sensor
    }

    String out;
    serializeJson(doc, out);
    res.status(200)
       .setHeader("Content-Type", "application/json")
       .send(out);
  });

  app.listen("Server started → GET / every second");
}

void loop() {
  // Nothing needed here; LEDs are updated in the HTTP handler
  delay(10);
}
