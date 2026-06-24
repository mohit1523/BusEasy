const express = require("express");
const crypto = require("crypto");
const Booking = require("../models/BookingModel");
const Trip = require("../models/TripModel");
const { authenticate, authorize } = require("../middleware/auth");
const { hasTripDeparted } = require("../utils/tripTime");

const router = express.Router();
const SEAT_HOLD_DURATION_MS = 5 * 60 * 1000;

async function pruneExpiredHolds(trip) {
  const now = new Date();
  const activeHolds = (trip.seatHolds || []).filter((hold) => new Date(hold.expiresAt) > now);

  if (activeHolds.length !== (trip.seatHolds || []).length) {
    trip.seatHolds = activeHolds;
    await trip.save();
  }

  return trip;
}

function getHeldSeatsForTrip(trip) {
  return (trip.seatHolds || []).map((hold) => hold.seatNumber);
}

router.get("/search-options", async (_req, res) => {
  try {
    const trips = await Trip.find({ status: "published" }).populate("routeTemplate", "origin destination");
    const origins = [...new Set(trips.map((trip) => trip.routeTemplate.origin))].sort();
    const destinations = [...new Set(trips.map((trip) => trip.routeTemplate.destination))].sort();

    return res.status(200).send({ origins, destinations });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/trips/search", async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    const trips = await Trip.find({
      travelDate: date,
      status: "published",
    })
      .populate("vehicle")
      .populate("routeTemplate")
      .sort({ departureTime: 1 });

    const cleanedTrips = [];
    for (const trip of trips) {
      cleanedTrips.push(await pruneExpiredHolds(trip));
    }

    const filteredTrips = cleanedTrips
      .filter((trip) => {
        const matchesOrigin = !origin || trip.routeTemplate.origin === origin;
        const matchesDestination = !destination || trip.routeTemplate.destination === destination;
        return matchesOrigin && matchesDestination;
      })
      .map((trip) => ({
        ...trip.toObject(),
        activeSeatHolds: trip.seatHolds || [],
        availableSeatCount: trip.totalSeats - trip.bookedSeats.length - getHeldSeatsForTrip(trip).length,
      }));

    return res.status(200).send(filteredTrips);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.use(authenticate, authorize("passenger"));

router.post("/trips/:tripId/holds", async (req, res) => {
  try {
    const { seatNumbers } = req.body;
    if (!Array.isArray(seatNumbers) || !seatNumbers.length) {
      return res.status(400).send({ msg: "Seat numbers are required" });
    }

    const requestedSeats = [...new Set(seatNumbers.map((seatNumber) => Number(seatNumber)))].sort((left, right) => left - right);
    const invalidSeat = requestedSeats.find((seat) => Number.isNaN(seat) || seat < 1);
    if (invalidSeat) {
      return res.status(400).send({ msg: "One or more seats are invalid" });
    }

    const trip = await Trip.findById(req.params.tripId);
    if (!trip || trip.status !== "published") {
      return res.status(404).send({ msg: "Trip not available for booking" });
    }

    await pruneExpiredHolds(trip);

    if (requestedSeats.some((seat) => seat > trip.totalSeats)) {
      return res.status(400).send({ msg: "One or more seats are invalid for this trip" });
    }

    const heldByOthers = (trip.seatHolds || []).find(
      (hold) => requestedSeats.includes(hold.seatNumber) && String(hold.user) !== req.userId
    );
    if (heldByOthers) {
      return res.status(409).send({ msg: `Seat ${heldByOthers.seatNumber} is already on hold` });
    }

    const bookedConflict = requestedSeats.find((seat) => trip.bookedSeats.includes(seat));
    if (bookedConflict) {
      return res.status(409).send({ msg: `Seat ${bookedConflict} is already booked` });
    }

    const holdUntil = new Date(Date.now() + SEAT_HOLD_DURATION_MS);
    const remainingHolds = (trip.seatHolds || []).filter((hold) => !requestedSeats.includes(hold.seatNumber));
    const myHolds = requestedSeats.map((seatNumber) => ({
      seatNumber,
      user: req.userId,
      expiresAt: holdUntil,
    }));

    trip.seatHolds = [...remainingHolds, ...myHolds];
    await trip.save();

    const populatedTrip = await Trip.findById(trip._id).populate("vehicle").populate("routeTemplate");
    return res.status(200).send({
      trip: {
        ...populatedTrip.toObject(),
        activeSeatHolds: populatedTrip.seatHolds || [],
        availableSeatCount:
          populatedTrip.totalSeats - populatedTrip.bookedSeats.length - (populatedTrip.seatHolds || []).length,
      },
      holdExpiresAt: holdUntil,
    });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.delete("/trips/:tripId/holds", async (req, res) => {
  try {
    const { seatNumbers } = req.body;
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).send({ msg: "Trip not found" });
    }

    const seatsToRelease = Array.isArray(seatNumbers) ? seatNumbers.map((seat) => Number(seat)) : [];
    trip.seatHolds = (trip.seatHolds || []).filter(
      (hold) => !(hold.user.toString() === req.userId && seatsToRelease.includes(hold.seatNumber))
    );
    await trip.save();

    return res.status(200).send({ msg: "Seat holds released" });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.get("/bookings/me", async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
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

router.post("/bookings", async (req, res) => {
  try {
    const { tripId, passengers } = req.body;

    if (!tripId || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).send({ msg: "Trip and passenger details are required" });
    }

    const sanitizedPassengers = passengers.map((passenger) => ({
      seatNumber: Number(passenger.seatNumber),
      name: String(passenger.name || "").trim(),
    }));

    if (sanitizedPassengers.some((passenger) => !passenger.name)) {
      return res.status(400).send({ msg: "Passenger names are required for each selected seat" });
    }

    const trip = await Trip.findById(tripId);
    if (!trip || trip.status !== "published") {
      return res.status(404).send({ msg: "Trip not available for booking" });
    }

    await pruneExpiredHolds(trip);

    const requestedSeats = sanitizedPassengers.map((passenger) => passenger.seatNumber);
    const hasDuplicateSeats = new Set(requestedSeats).size !== requestedSeats.length;
    if (hasDuplicateSeats) {
      return res.status(400).send({ msg: "Duplicate seat selections are not allowed" });
    }

    const invalidSeat = requestedSeats.find((seat) => seat < 1 || seat > trip.totalSeats);
    if (invalidSeat) {
      return res.status(400).send({ msg: "One or more seats are invalid for this trip" });
    }

    const conflictingSeat = requestedSeats.find((seat) => trip.bookedSeats.includes(seat));
    if (conflictingSeat) {
      return res.status(409).send({ msg: `Seat ${conflictingSeat} is no longer available` });
    }

    const heldSeats = trip.seatHolds || [];
    const missingHold = requestedSeats.find(
      (seat) => !heldSeats.some((hold) => hold.seatNumber === seat && String(hold.user) === req.userId)
    );
    if (missingHold) {
      return res.status(409).send({ msg: `Seat ${missingHold} is no longer on hold. Please select it again.` });
    }

    const updatedTrip = await Trip.findOneAndUpdate(
      { _id: tripId, bookedSeats: { $nin: requestedSeats }, status: "published" },
      {
        $push: { bookedSeats: { $each: requestedSeats } },
        $pull: { seatHolds: { seatNumber: { $in: requestedSeats }, user: req.userId } },
      },
      { new: true }
    );

    if (!updatedTrip) {
      return res.status(409).send({ msg: "Seat availability changed. Please refresh and try again." });
    }

    const booking = await Booking.create({
      bookingReference: `BE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      trip: updatedTrip._id,
      operator: updatedTrip.operator,
      user: req.userId,
      passengers: sanitizedPassengers,
      totalFare: sanitizedPassengers.length * updatedTrip.fare,
      status: "confirmed",
      paymentStatus: "initiated",
    });

    const populatedBooking = await Booking.findById(booking._id).populate({
      path: "trip",
      populate: [{ path: "vehicle" }, { path: "routeTemplate" }],
    });

    return res.status(201).send(populatedBooking);
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

router.patch("/bookings/:bookingId/cancel", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.userId,
      status: "confirmed",
    }).populate("trip");

    if (!booking) {
      return res.status(404).send({ msg: "Booking not found" });
    }

    if (booking.trip?.status === "completed" || booking.trip?.status === "cancelled" || hasTripDeparted(booking.trip)) {
      return res.status(409).send({ msg: "Past trips can no longer be cancelled" });
    }

    const seatsToRelease = booking.passengers.map((passenger) => passenger.seatNumber);

    await Trip.findByIdAndUpdate(booking.trip._id, {
      $pull: { bookedSeats: { $in: seatsToRelease } },
    });

    booking.status = "cancelled";
    booking.paymentStatus = "failed";
    await booking.save();

    return res.status(200).send({ msg: "Booking cancelled successfully" });
  } catch (error) {
    return res.status(500).send({ msg: `Internal Server Error: ${error.message}` });
  }
});

module.exports = router;
