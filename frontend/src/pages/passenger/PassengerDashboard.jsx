import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api";
import { SectionCard, StatCard } from "../../components/Layout";
import { SeatPicker } from "../../components/SeatPicker";

const SEARCH_HISTORY_KEY = "buseasy-passenger-searches";
const MAX_SEARCH_HISTORY = 5;

export default function PassengerDashboard() {
  const [searchOptions, setSearchOptions] = useState({ origins: [], destinations: [] });
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [error, setError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [recentBooking, setRecentBooking] = useState(null);

  useEffect(() => {
    try {
      const storedSearches = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
      setRecentSearches(Array.isArray(storedSearches) ? storedSearches : []);
    } catch (_error) {
      setRecentSearches([]);
    }
  }, []);

  const persistSearch = (nextSearch) => {
    setRecentSearches((current) => {
      const nextHistory = [
        nextSearch,
        ...current.filter(
          (item) =>
            item.origin !== nextSearch.origin || item.destination !== nextSearch.destination || item.date !== nextSearch.date
        ),
      ].slice(0, MAX_SEARCH_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  useEffect(() => {
    apiRequest("/passenger/search-options")
      .then((data) => {
        setError("");
        setSearchOptions(data);
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setIsLoading(false));
  }, []);

  const searchTrips = async (searchOverride = form) => {
    setIsSearching(true);
    setError("");

    try {
      const query = new URLSearchParams(searchOverride).toString();
      const data = await apiRequest(`/passenger/trips/search?${query}`);
      setTrips(data);
      persistSearch(searchOverride);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setIsSearching(false);
    }
  };

  const stats = useMemo(() => {
    const totalAvailable = trips.reduce((sum, trip) => sum + trip.availableSeatCount, 0);
    return {
      availableTrips: trips.length,
      availableSeats: totalAvailable,
      cheapestFare: trips.length ? Math.min(...trips.map((trip) => trip.fare)) : 0,
    };
  }, [trips]);

  const handleConfirmBooking = async (passengers) => {
    if (passengers.some((passenger) => !passenger.name.trim())) {
      setBookingError("Please enter all passenger names before confirming.");
      return;
    }

    setIsBooking(true);
    setBookingError("");

    try {
      const booking = await apiRequest("/passenger/bookings", {
        method: "POST",
        token: localStorage.getItem("buseasy-token"),
        body: JSON.stringify({
          tripId: selectedTrip._id,
          passengers,
        }),
      });
      setRecentBooking(booking);
      setSelectedTrip(null);
      await searchTrips();
    } catch (submitError) {
      setBookingError(submitError.message);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Passenger flow</span>
          <h1>Search real trips, not static bus cards</h1>
          <p>Choose a dated departure, inspect fare and availability, then book against live seats.</p>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard label="Available trips" value={stats.availableTrips} />
        <StatCard label="Open seats" value={stats.availableSeats} />
        <StatCard label="Best fare" value={`Rs. ${stats.cheapestFare || 0}`} />
      </div>

      <SectionCard title="Find your trip" description="Search by origin, destination, and travel date.">
        {recentSearches.length ? (
          <div className="recent-search-strip">
            <span>Recent searches</span>
            <div className="recent-search-list">
              {recentSearches.map((search) => (
                <button
                  key={`${search.origin}-${search.destination}-${search.date}`}
                  type="button"
                  className="recent-search-chip"
                  onClick={() => {
                    setForm(search);
                    setSelectedTrip(null);
                    setBookingError("");
                    searchTrips(search);
                  }}
                >
                  {search.origin} → {search.destination} | {search.date}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            searchTrips();
          }}
        >
          <label>
            Origin
            <select
              value={form.origin}
              onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value }))}
              required
            >
              <option value="">Select origin</option>
              {searchOptions.origins.map((origin) => (
                <option key={origin} value={origin}>
                  {origin}
                </option>
              ))}
            </select>
          </label>
          <label>
            Destination
            <select
              value={form.destination}
              onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))}
              required
            >
              <option value="">Select destination</option>
              {searchOptions.destinations.map((destination) => (
                <option key={destination} value={destination}>
                  {destination}
                </option>
              ))}
            </select>
          </label>
          <label>
            Travel date
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              required
            />
          </label>
          <button className="primary-button" disabled={isSearching || isLoading}>
            {isSearching ? "Searching..." : "Search trips"}
          </button>
        </form>
      </SectionCard>

      {recentBooking ? (
        <SectionCard title="Latest confirmation" description="Your most recent booking has been captured below.">
          <div className="confirmation-banner">
            <strong>{recentBooking.bookingReference}</strong>
            <span>
              {recentBooking.passengers.length} passenger(s) confirmed for {recentBooking.trip.routeTemplate.name}
            </span>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Search results" description="Published trips with live seat counts.">
        {error ? <p className="error-text">{error}</p> : null}
        {!error && !trips.length ? <div className="empty-state">No trips match the current filters yet.</div> : null}
        <div className="trip-grid">
          {trips.map((trip) => (
            <article key={trip._id} className="trip-card">
              <div className="trip-topline">
                <span>{trip.routeTemplate.name}</span>
                <strong>Rs. {trip.fare}</strong>
              </div>
              <h3>
                {trip.routeTemplate.origin} to {trip.routeTemplate.destination}
              </h3>
              <p>
                {trip.travelDate} | {trip.departureTime} to {trip.arrivalTime}
              </p>
              <p>Boarding: {trip.routeTemplate.boardingPoint}</p>
              <p>Drop: {trip.routeTemplate.dropPoint}</p>
              <p>Vehicle: {trip.vehicle.name}</p>
              <p>{trip.availableSeatCount} seats still available</p>
              <p className="helper-copy">Open the seat map to review individual seats and passenger names before confirming.</p>
              <button className="primary-button" onClick={() => setSelectedTrip(trip)}>
                Select seats
              </button>
            </article>
          ))}
        </div>
      </SectionCard>

      {selectedTrip ? (
        <SeatPicker
          trip={selectedTrip}
          onClose={() => {
            setSelectedTrip(null);
            setBookingError("");
          }}
          onConfirm={handleConfirmBooking}
          isSubmitting={isBooking}
          error={bookingError}
        />
      ) : null}
    </div>
  );
}
