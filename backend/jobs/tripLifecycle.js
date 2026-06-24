const mongoose = require("mongoose");
const Trip = require("../models/TripModel");
const { hasTripDeparted } = require("../utils/tripTime");

const TRIP_LIFECYCLE_INTERVAL_MS = Number(process.env.TRIP_LIFECYCLE_INTERVAL_MS || 60 * 1000);
let lifecycleTimer = null;
let isProcessing = false;

async function completePastTrips() {
  if (isProcessing) {
    return { updatedCount: 0 };
  }

  isProcessing = true;

  try {
    const trips = await Trip.find({ status: "published" }).select("_id travelDate departureTime");
    const tripIdsToComplete = trips.filter((trip) => hasTripDeparted(trip)).map((trip) => trip._id);

    if (!tripIdsToComplete.length) {
      return { updatedCount: 0 };
    }

    const result = await Trip.updateMany(
      { _id: { $in: tripIdsToComplete } },
      {
        $set: {
          status: "completed",
          seatHolds: [],
        },
      }
    );

    return { updatedCount: result.modifiedCount || result.nModified || 0 };
  } finally {
    isProcessing = false;
  }
}

function startTripLifecycleScheduler() {
  if (lifecycleTimer) {
    return lifecycleTimer;
  }

  const runCycle = async () => {
    try {
      const result = await completePastTrips();
      if (result.updatedCount) {
        console.log(`Trip lifecycle job completed ${result.updatedCount} past trip(s)`);
      }
    } catch (error) {
      console.log(`Trip lifecycle job failed: ${error.message}`);
    }
  };

  const startInterval = () => {
    runCycle();
    lifecycleTimer = setInterval(runCycle, TRIP_LIFECYCLE_INTERVAL_MS);
  };

  if (mongoose.connection.readyState === 1) {
    startInterval();
  } else {
    mongoose.connection.once("open", startInterval);
  }

  return lifecycleTimer;
}

module.exports = {
  completePastTrips,
  startTripLifecycleScheduler,
};
