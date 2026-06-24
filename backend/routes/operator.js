const express = require("express");
const Booking = require("../models/BookingModel");
const RouteTemplate = require("../models/RouteTemplateModel");
const Trip = require("../models/TripModel");
const User = require("../models/UserModel");
const Vehicle = require("../models/VehicleModel");
const { authenticate, authorize } = require("../middleware/auth");
const { hasTripDeparted } = require("../utils/tripTime");

const router = express.Router();

router.use(authenticate, authorize("operator"));

router.use(async (req, res, next) => {
  const operator = await User.findById(req.userId);
  if (!operator || operator.approvalStatus !== "approved") {
    return res.status(403).send({ msg: "Operator account is not approved" });
  }

  next();
});

router.get("/dashboard", async (req, res) => {
  try {
    const [vehicles, routes, trips, bookings] = await Promise.all([
      Vehicle.countDocuments({ operator: req.userId }),
      RouteTemplate.countDocuments({ operator: req.userId }),
      Trip.find({ operator: req.userId }),
      Booking.countDocuments({ operator: req.userId, status: "confirmed" }),
    ]);

    const publishedTrips = trips.filter((trip) => trip.status === "published");
    const seatsFilled = publishedTrips.reduce((sum, trip) => sum + trip.bookedSeats.length, 0);
    const totalSeats = publishedTrips.reduce((sum, trip) => sum + trip.totalSeats, 0);

    return res.status(200).send({
      stats: {
        vehicles,
        routes,
        trips: trips.length,
        publishedTrips: publishedTrips.length,
        bookings,
        occupancyRate: totalSeats ? Math.round((seatsFilled / totalSeats) * 100) : 0,
      },
    });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/vehicles", async (req, res) => {
  const vehicles = await Vehicle.find({ operator: req.userId })
    .populate("operator", "name email")
    .sort({ createdAt: -1 });
  return res.status(200).send(vehicles);
});

router.post("/vehicles", async (req, res) => {
  try {
    const { name, busNumber, seatCount } = req.body;
    if (!String(name || "").trim() || !String(busNumber || "").trim() || !seatCount) {
      return res.status(400).send({ msg: "Name, bus number and seat count are required" });
    }

    const existingVehicle = await Vehicle.findOne({ busNumber: String(busNumber).trim() });
    if (existingVehicle) {
      return res.status(409).send({ msg: "A vehicle with this bus number already exists" });
    }

    const vehicle = await Vehicle.create({
      operator: req.userId,
      name: String(name).trim(),
      busNumber: String(busNumber).trim(),
      seatCount: Number(seatCount),
    });

    return res.status(201).send(vehicle);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/routes", async (req, res) => {
  const routes = await RouteTemplate.find({ operator: req.userId })
    .populate("operator", "name email")
    .sort({ createdAt: -1 });
  return res.status(200).send(routes);
});

router.post("/routes", async (req, res) => {
  try {
    const {
      name,
      origin,
      destination,
      boardingPoint,
      dropPoint,
      defaultDepartureTime,
      defaultArrivalTime,
      baseFare,
    } = req.body;

    if (
      !String(name || "").trim() ||
      !String(origin || "").trim() ||
      !String(destination || "").trim() ||
      !String(boardingPoint || "").trim() ||
      !String(dropPoint || "").trim() ||
      !defaultDepartureTime ||
      !defaultArrivalTime ||
      baseFare === undefined ||
      baseFare === null ||
      baseFare === ""
    ) {
      return res.status(400).send({ msg: "All route fields are required" });
    }

    const routeTemplate = await RouteTemplate.create({
      operator: req.userId,
      name: String(name).trim(),
      origin: String(origin).trim(),
      destination: String(destination).trim(),
      boardingPoint: String(boardingPoint).trim(),
      dropPoint: String(dropPoint).trim(),
      defaultDepartureTime,
      defaultArrivalTime,
      baseFare: Number(baseFare),
    });

    return res.status(201).send(routeTemplate);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/trips", async (req, res) => {
  try {
    const trips = await Trip.find({ operator: req.userId })
      .populate("vehicle")
      .populate("routeTemplate")
      .sort({ createdAt: -1 });

    return res.status(200).send(trips);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find({ operator: req.userId })
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

router.post("/trips", async (req, res) => {
  try {
    const {
      vehicleId,
      routeTemplateId,
      travelDate,
      departureTime,
      arrivalTime,
      fare,
      status,
    } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, operator: req.userId, status: "active" });
    const routeTemplate = await RouteTemplate.findOne({
      _id: routeTemplateId,
      operator: req.userId,
      status: "active",
    });

    if (!vehicle || !routeTemplate) {
      return res.status(404).send({ msg: "Vehicle or route not found" });
    }

    const resolvedDeparture = departureTime || routeTemplate.defaultDepartureTime;
    const resolvedArrival = arrivalTime || routeTemplate.defaultArrivalTime;
    const resolvedFare = Number(fare || routeTemplate.baseFare);

    if (Number.isNaN(resolvedFare) || resolvedFare < 0) {
      return res.status(400).send({ msg: "Fare must be a valid number" });
    }

    const trip = await Trip.create({
      operator: req.userId,
      vehicle: vehicle._id,
      routeTemplate: routeTemplate._id,
      travelDate,
      departureTime: resolvedDeparture,
      arrivalTime: resolvedArrival,
      fare: resolvedFare,
      totalSeats: vehicle.seatCount,
      status: status || "draft",
    });

    const populatedTrip = await Trip.findById(trip._id).populate("vehicle").populate("routeTemplate");
    return res.status(201).send(populatedTrip);
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

    const currentTrip = await Trip.findOne({ _id: req.params.tripId, operator: req.userId }).select("status travelDate departureTime");
    if (!currentTrip) {
      return res.status(404).send({ msg: "Trip not found" });
    }

    if (currentTrip.status === "completed") {
      return res.status(409).send({ msg: "Completed trips are read-only" });
    }

    if (currentTrip.status === "cancelled" && status !== "cancelled") {
      return res.status(409).send({ msg: "Cancelled trips cannot be republished" });
    }

    if (currentTrip.status === "draft" && !["draft", "published", "cancelled"].includes(status)) {
      return res.status(409).send({ msg: "Draft trips can only be published or cancelled" });
    }

    if (currentTrip.status === "published" && !["published", "completed", "cancelled"].includes(status)) {
      return res.status(409).send({ msg: "Published trips can only be completed or cancelled" });
    }

    if (hasTripDeparted(currentTrip) && status === "published") {
      return res.status(409).send({ msg: "Past trips cannot be republished" });
    }

    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.tripId, operator: req.userId },
      { status },
      { new: true }
    )
      .populate("vehicle")
      .populate("routeTemplate");

    return res.status(200).send(trip);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/trips/:tripId/bookings", async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.tripId, operator: req.userId });
    if (!trip) {
      return res.status(404).send({ msg: "Trip not found" });
    }

    const bookings = await Booking.find({ trip: trip._id })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).send(bookings);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

module.exports = router;
