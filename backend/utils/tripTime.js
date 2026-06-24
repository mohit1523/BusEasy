function getTripDepartureDate(trip) {
  if (!trip?.travelDate) {
    return null;
  }

  const departureDate = new Date(`${trip.travelDate}T${trip.departureTime || "00:00"}`);
  if (Number.isNaN(departureDate.getTime())) {
    return null;
  }

  return departureDate;
}

function hasTripDeparted(trip, now = new Date()) {
  const departureDate = getTripDepartureDate(trip);
  if (!departureDate) {
    return false;
  }

  return departureDate.getTime() <= now.getTime();
}

module.exports = {
  getTripDepartureDate,
  hasTripDeparted,
};
