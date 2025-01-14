const express = require("express");
const mysql = require("mysql");
const geolib = require("geolib");
const dotenv = require("dotenv");
const app = express();

// Load environment variables
dotenv.config();

// Define the port (use the PORT environment variable or default to 3000)
const port = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST || "185.27.134.136",
  user: process.env.DB_USER || "thsi_38080502",
  password: process.env.DB_PASSWORD || "o9!N!lYb",
  database: process.env.DB_NAME || "thsi_38080502_emergency",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    process.exit(1); // Exit the app if the connection fails
  }
  console.log("Connected to MySQL");
});

// Middleware to validate latitude and longitude in requests
app.use((req, res, next) => {
  const { latitude, longitude } = req.query;
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      return res
        .status(400)
        .json({ error: "Invalid latitude or longitude format" });
    }
  }
  next();
});

// Utility function to fetch locations by type
function fetchLocationsByType(req, res, type) {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required" });
  }

  const query = `SELECT * FROM locations WHERE type = ?`;
  db.query(query, [type], (err, results) => {
    if (err) {
      console.error(`Database query error for type ${type}:`, err);
      return res.status(500).json({ error: "Database query failed" });
    }

    const locations = results.map((loc) => {
      const distance = geolib.getDistance(
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        {
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
        }
      );
      return { ...loc, distance };
    });

    // Sort by distance (nearest first)
    locations.sort((a, b) => a.distance - b.distance);
    res.json(locations);
  });
}

// API endpoints
app.get("/hospitals", (req, res) => {
  console.log("Received request for hospitals", req.query);
  fetchLocationsByType(req, res, "Hospital");
});

app.get("/police", (req, res) => {
  console.log("Received request for police stations", req.query);
  fetchLocationsByType(req, res, "Police");
});

app.get("/firestations", (req, res) => {
  console.log("Received request for fire stations", req.query);
  fetchLocationsByType(req, res, "FireStation");
});

// Start server with graceful shutdown
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received. Closing HTTP server.");
  server.close(() => {
    console.log("HTTP server closed.");
    db.end(() => {
      console.log("MySQL connection closed.");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received. Closing HTTP server.");
  server.close(() => {
    console.log("HTTP server closed.");
    db.end(() => {
      console.log("MySQL connection closed.");
      process.exit(0);
    });
  });
});
