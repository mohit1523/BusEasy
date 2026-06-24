const express = require("express");
const Booking = require("../models/BookingModel");
const RouteTemplate = require("../models/RouteTemplateModel");
const Trip = require("../models/TripModel");
const User = require("../models/UserModel");
const Vehicle = require("../models/VehicleModel");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, authorize("admin"));

router.get("/dashboard", async (_req, res) => {
  try {
    const [users, operators, pendingOperators, vehicles, routes, trips, bookings] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "operator" }),
      User.countDocuments({ role: "operator", approvalStatus: "pending" }),
      Vehicle.countDocuments(),
      RouteTemplate.countDocuments(),
      Trip.countDocuments(),
      Booking.countDocuments(),
    ]);

    return res.status(200).send({
      stats: {
        users,
        operators,
        pendingOperators,
        vehicles,
        routes,
        trips,
        bookings,
      },
    });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/operators/pending", async (_req, res) => {
  const operators = await User.find({
    role: "operator",
    approvalStatus: "pending",
  }).select("-password");

  return res.status(200).send(operators);
});

router.patch("/operators/:operatorId/approval", async (req, res) => {
  try {
    const { approvalStatus } = req.body;
    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).send({ msg: "Invalid approval status" });
    }

    const operator = await User.findOneAndUpdate(
      { _id: req.params.operatorId, role: "operator" },
      { approvalStatus },
      { new: true }
    ).select("-password");

    if (!operator) {
      return res.status(404).send({ msg: "Operator not found" });
    }

    return res.status(200).send(operator);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/operators", async (_req, res) => {
  const operators = await User.find({ role: "operator" }).select("-password").sort({ createdAt: -1 });
  return res.status(200).send(operators);
});

router.get("/vehicles", async (_req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate("operator", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).send(vehicles);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/routes", async (_req, res) => {
  try {
    const routes = await RouteTemplate.find()
      .populate("operator", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).send(routes);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/trips", async (_req, res) => {
  try {
    const trips = await Trip.find()
      .populate("operator", "name email")
      .populate("vehicle")
      .populate("routeTemplate")
      .sort({ createdAt: -1 });

    return res.status(200).send(trips);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.patch("/trips/:tripId/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["draft", "published", "cancelled", "completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).send({ msg: "Invalid trip status" });
    }

    const trip = await Trip.findByIdAndUpdate(
      req.params.tripId,
      { status },
      { new: true }
    )
      .populate("operator", "name email")
      .populate("vehicle")
      .populate("routeTemplate");

    if (!trip) {
      return res.status(404).send({ msg: "Trip not found" });
    }

    return res.status(200).send(trip);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/bookings", async (_req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("operator", "name email")
      .populate("user", "name email")
      .populate({
        path: "trip",
        populate: [{ path: "vehicle" }, { path: "routeTemplate" }],
      })
      .sort({ createdAt: -1 });

    return res.status(200).send(bookings);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

module.exports = router;
