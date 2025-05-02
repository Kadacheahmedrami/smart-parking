/**
 * Smart Parking Sensor System
 * 
 * Uses ESP32 with ultrasonic sensors to detect parking space occupancy.
 * Provides web API for status and automatically detects connected sensors.
 */

#include <WiFi.h>

#include "ESPExpress.h"
#include <ArduinoJson.h>

// Configuration
namespace Config {
  // Wi-Fi credentials
  constexpr char WIFI_SSID[] = "wifi-name";
  constexpr char WIFI_PASS[] = "wifi-password";
  
  // Web server port
  constexpr int SERVER_PORT = 80;
  
  // Ultrasonic measurement settings
  constexpr float DISTANCE_THRESHOLD_CM = 50.0;
  constexpr unsigned long PULSE_TIMEOUT_US = 40000; // 40ms timeout (~7m range)
  
  // Hardware pin mapping - format: {trigger, echo}
  constexpr int SENSOR_PINS[6][2] = {
    {13, 12}, {14, 27}, {26, 25},
    {33, 32}, {5,  18}, {19, 21}
  };
  
  // LED pins for each parking slot
  constexpr int LED_PINS[6] = {2, 4, 15, 16, 17, 22};
  
  // Sensor detection parameters
  constexpr unsigned long DETECTION_TIMEOUT_US = 5000; // 5ms for sensor detection
}

// Global objects
ESPExpress app(Config::SERVER_PORT);

// System state
struct ParkingSystem {
  bool sensorAttached[6] = {false};
  
  struct SlotStatus {
    int id;
    bool occupied;
    float distanceCm;
    bool attached;
  };
  
  /**
   * Initialize all hardware
   */
  void setup() {
    // Initialize sensor pins
    for (int i = 0; i < 6; i++) {
      pinMode(Config::SENSOR_PINS[i][0], OUTPUT); // Trigger
      pinMode(Config::SENSOR_PINS[i][1], INPUT_PULLDOWN); // Echo
      
      // Initialize LEDs
      pinMode(Config::LED_PINS[i], OUTPUT);
      digitalWrite(Config::LED_PINS[i], LOW);
    }
    
    // Detect connected sensors
    detectSensors();
  }
  
  /**
   * Automatically detect which sensors are physically connected
   */
  void detectSensors() {
    Serial.println("Detecting connected sensors...");
    
    for (int i = 0; i < 6; i++) {
      // First check: Pullup test (checks if pin is connected)
      pinMode(Config::SENSOR_PINS[i][1], INPUT_PULLUP);
      delay(5);
      bool canPullUp = (digitalRead(Config::SENSOR_PINS[i][1]) == HIGH);
      
      // Second check: Signal test (checks if sensor responds)
      pinMode(Config::SENSOR_PINS[i][1], INPUT_PULLDOWN);
      delay(5);
      
      // Send a test pulse
      digitalWrite(Config::SENSOR_PINS[i][0], HIGH);
      delayMicroseconds(10);
      digitalWrite(Config::SENSOR_PINS[i][0], LOW);
      
      // Check for activity on echo pin
      unsigned long startTime = micros();
      bool signalDetected = false;
      
      while (micros() - startTime < Config::DETECTION_TIMEOUT_US) {
        if (digitalRead(Config::SENSOR_PINS[i][1]) == HIGH) {
          signalDetected = true;
          break;
        }
      }
      
      // Sensor is attached if either test passes
      sensorAttached[i] = signalDetected || canPullUp;
      
      Serial.printf("Slot %d: %s (signal: %s, pullup: %s)\n", 
                    i+1,
                    sensorAttached[i] ? "FOUND" : "NOT FOUND",
                    signalDetected ? "YES" : "NO",
                    canPullUp ? "YES" : "NO");
      
      delay(50); // Wait between tests
    }
  }
  
  /**
   * Measure distance from a single ultrasonic sensor
   * 
   * @param sensorIndex Index of the sensor to read (0-5)
   * @return Distance in cm, or -1.0 if invalid/no sensor
   */
  float measureDistance(int sensorIndex) {
    // Skip unattached sensors
    if (!sensorAttached[sensorIndex]) return -1.0;
    
    int trigPin = Config::SENSOR_PINS[sensorIndex][0];
    int echoPin = Config::SENSOR_PINS[sensorIndex][1];
    
    // Send pulse
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    
    // Measure echo duration
    unsigned long pulseDuration = pulseIn(echoPin, HIGH, Config::PULSE_TIMEOUT_US);
    
    // Calculate distance (speed of sound = 0.034 cm/µs)
    float distance = pulseDuration * 0.034 / 2.0;
    
    return (pulseDuration == 0) ? -1.0 : distance;
  }
  
  /**
   * Update all parking slot statuses
   * 
   * @return Array of slot status objects
   */
  SlotStatus* updateAllSlots() {
    static SlotStatus slots[6];
    
    for (int i = 0; i < 6; i++) {
      float distance = measureDistance(i);
      
      // Determine if slot is occupied (valid reading below threshold)
      bool occupied = (distance > 0 && distance < Config::DISTANCE_THRESHOLD_CM);
      
      // Update LED if sensor is attached
      if (sensorAttached[i]) {
        digitalWrite(Config::LED_PINS[i], occupied ? HIGH : LOW);
      }
      
      // Update slot data
      slots[i] = {
        .id = i + 1,
        .occupied = occupied,
        .distanceCm = distance,
        .attached = sensorAttached[i]
      };
    }
    
    return slots;
  }
  
  /**
   * Generate JSON response with all parking slot statuses
   */
  String generateStatusJson() {
    DynamicJsonDocument doc(512);
    doc["type"] = "parking_status";
    JsonArray slotsArray = doc.createNestedArray("slots");
    
    SlotStatus* slots = updateAllSlots();
    
    for (int i = 0; i < 6; i++) {
      JsonObject slot = slotsArray.createNestedObject();
      slot["id"] = slots[i].id;
      slot["occupied"] = slots[i].occupied;
      slot["distance_cm"] = slots[i].distanceCm;
      slot["attached"] = slots[i].attached;
    }
    
    String jsonOutput;
    serializeJson(doc, jsonOutput);
    return jsonOutput;
  }
};

// Global application state
ParkingSystem parkingSystem;

/**
 * Setup web routes for the parking system
 */
void setupRoutes() {
  // Enable CORS for web clients
  app.enableCORS("*");
  
  // Handle OPTIONS requests for CORS preflight
  app.options("/*", [](Request& req, Response& res) {
    res.status(204)
       .setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
       .end();
  });
  
  // Main route to get parking status
  app.get("/", [](Request &req, Response &res) {
    String jsonData = parkingSystem.generateStatusJson();
    
    res.status(200)
       .setHeader("Content-Type", "application/json")
       .send(jsonData);
  });
}

/**
 * Connect to WiFi network
 */
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(Config::WIFI_SSID, Config::WIFI_PASS);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
}

void setup() {
  Serial.begin(115200);

  // Initialize hardware
  parkingSystem.setup();
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup web routes
  setupRoutes();
  
  // Start web server
  app.listen("Server started → GET / for parking status");
}

void loop() {
  // Main processing handled by web server
  delay(10);
}