require("dotenv").config();

const express = require("express");
const cors = require("cors");
const DBconnect = require("./db");
const authRoute = require("./routes/auth");
const operatorRoute = require("./routes/operator");
const passengerRoute = require("./routes/passenger");
const adminRoute = require("./routes/admin");
const { startTripLifecycleScheduler } = require("./jobs/tripLifecycle");

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const corsOptions = {
  origin: CLIENT_ORIGIN,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "auth-token"],
  credentials: false,
};

DBconnect();
startTripLifecycleScheduler();

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("BusEasy API is running");
});

app.use("/auth", authRoute);
app.use("/operator", operatorRoute);
app.use("/passenger", passengerRoute);
app.use("/admin", adminRoute);

app.listen(PORT, () => {
  console.log(`BusEasy API listening on port ${PORT}`);
});
