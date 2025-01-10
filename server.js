const express = require("express");
const mysql = require("mysql");
const geolib = require("geolib");
const app = express();
const port = 3000;

// Create MySQL connection
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root", // Replace with your MySQL username
  password: "", // Replace with your MySQL password
  database: "emergencyadmin",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
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

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
