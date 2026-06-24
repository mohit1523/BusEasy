import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api";
import { useAuth } from "../../auth";
import { SectionCard, StatCard } from "../../components/Layout";

const OPERATOR_FILTERS_KEY = "buseasy-operator-dashboard-filters";

function getTripDepartureDate(trip) {
  if (!trip?.travelDate) {
    return null;
  }

  return new Date(`${trip.travelDate}T${trip.departureTime || "00:00"}`);
}

function getMinutesToDeparture(trip) {
  const departure = getTripDepartureDate(trip);
  if (Number.isNaN(departure?.getTime?.())) {
    return null;
  }

  return Math.round((departure.getTime() - Date.now()) / 60000);
}

function getUrgencyKey(trip) {
  const minutes = getMinutesToDeparture(trip);

  if (trip.status === "draft") {
    return "draft";
  }

  if (trip.status === "completed") {
    return "completed";
  }

  if (trip.status === "cancelled") {
    return "cancelled";
  }

  if (minutes !== null && minutes <= 60 && minutes >= 0) {
    return "departing-soon";
  }

  if (trip.bookedSeats.length === 0) {
    return "no-bookings";
  }

  return "ready";
}

function getUrgencyLabel(trip) {
  const urgencyKey = getUrgencyKey(trip);
  const minutes = getMinutesToDeparture(trip);

  if (urgencyKey === "draft") {
    return minutes !== null && minutes < 1440 ? "Publish now" : "Draft";
  }

  if (urgencyKey === "cancelled") {
    return "Follow up";
  }

  if (urgencyKey === "completed") {
    return "Completed";
  }

  if (urgencyKey === "departing-soon") {
    return `Departs in ${minutes} min`;
  }

  if (urgencyKey === "no-bookings") {
    return "No bookings";
  }

  return "Ready";
}

function getReadinessItems(trip) {
  return [
    { label: "Vehicle", ready: Boolean(trip.vehicle?.name) },
    { label: "Route", ready: Boolean(trip.routeTemplate?.name) },
    { label: "Fare", ready: Number(trip.fare) > 0 },
    { label: "Status", ready: trip.status === "published" || trip.status === "completed" },
    { label: "Manifest", ready: trip.bookedSeats.length > 0 },
  ];
}

function getTripAttention(trip) {
  const minutes = getMinutesToDeparture(trip);
  const occupancy = Math.round((trip.bookedSeats.length / Math.max(trip.totalSeats, 1)) * 100);

  if (trip.status === "draft") {
    return "draft";
  }

  if (trip.status === "completed") {
    return "completed";
  }

  if (trip.status === "cancelled") {
    return "cancelled";
  }

  if (minutes !== null && minutes <= 60 && minutes >= 0) {
    return "departing-soon";
  }

  if (occupancy < 30 && trip.bookedSeats.length > 0) {
    return "low-occupancy";
  }

  if (trip.bookedSeats.length === 0) {
    return "no-bookings";
  }

  return "ready";
}

function loadStoredFilters() {
  try {
    const rawFilters = localStorage.getItem(OPERATOR_FILTERS_KEY);
    return rawFilters ? JSON.parse(rawFilters) : null;
  } catch (_error) {
    return null;
  }
}

export default function OperatorDashboard() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [error, setError] = useState("");
  const storedFilters = useMemo(
    () =>
      loadStoredFilters() || {
        date: "",
        status: "",
        route: "",
        vehicle: "",
        attention: "",
      },
    []
  );
  const [draftFilters, setDraftFilters] = useState(storedFilters);
  const [appliedFilters, setAppliedFilters] = useState(storedFilters);

  const loadOperatorData = async () => {
    try {
      setError("");
      const [dashboardData, tripData] = await Promise.all([
        apiRequest("/operator/dashboard", { token }),
        apiRequest("/operator/trips", { token }),
      ]);

      setDashboard(dashboardData.stats);
      setTrips(tripData);
    } catch (fetchError) {
      setError(fetchError.message);
    }
  };

  const loadTripBookings = async (tripId) => {
    setSelectedTripId(tripId);
    try {
      setError("");
      const data = await apiRequest(`/operator/trips/${tripId}/bookings`, { token });
      setBookings(data);
    } catch (fetchError) {
      setError(fetchError.message);
    }
  };

  const updateTripStatus = async (tripId, status) => {
    try {
      await apiRequest(`/operator/trips/${tripId}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      });
      await loadOperatorData();
      if (selectedTripId === tripId) {
        await loadTripBookings(tripId);
      }
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  useEffect(() => {
    if (user?.approvalStatus !== "approved") {
      return;
    }

    loadOperatorData();
  }, [user?.approvalStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(OPERATOR_FILTERS_KEY, JSON.stringify(appliedFilters));
    } catch (_error) {
      // Ignore persistence failures.
    }
  }, [appliedFilters]);

  const routeOptions = useMemo(
    () => [...new Set(trips.map((trip) => trip.routeTemplate?.name).filter(Boolean))].sort(),
    [trips]
  );

  const vehicleOptions = useMemo(
    () => [...new Set(trips.map((trip) => trip.vehicle?.name).filter(Boolean))].sort(),
    [trips]
  );

  const filteredTrips = useMemo(() => {
    return [...trips]
      .filter((trip) => {
        if (appliedFilters.date && trip.travelDate !== appliedFilters.date) {
          return false;
        }

        if (appliedFilters.status && trip.status !== appliedFilters.status) {
          return false;
        }

        if (appliedFilters.route && trip.routeTemplate?.name !== appliedFilters.route) {
          return false;
        }

        if (appliedFilters.vehicle && trip.vehicle?.name !== appliedFilters.vehicle) {
          return false;
        }

        if (appliedFilters.attention && getUrgencyKey(trip) !== appliedFilters.attention) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        const leftDate = getTripDepartureDate(left)?.getTime() || 0;
        const rightDate = getTripDepartureDate(right)?.getTime() || 0;
        return leftDate - rightDate;
      });
  }, [trips, appliedFilters]);

  const alertTrips = useMemo(
    () =>
      trips
        .map((trip) => ({ trip, attention: getTripAttention(trip) }))
        .filter(({ attention }) => attention !== "ready" && attention !== "completed")
        .slice(0, 5),
    [trips]
  );

  const readinessGaps = useMemo(() => {
    const selected = filteredTrips.find((trip) => trip._id === selectedTripId) || filteredTrips[0] || null;
    return selected ? getReadinessItems(selected).filter((item) => !item.ready) : [];
  }, [filteredTrips, selectedTripId]);

  const selectedTrip = filteredTrips.find((trip) => trip._id === selectedTripId) || filteredTrips[0] || null;

  useEffect(() => {
    if (!filteredTrips.length) {
      setSelectedTripId("");
      setBookings([]);
      return;
    }

    const currentTrip = filteredTrips.find((trip) => trip._id === selectedTripId);
    if (!currentTrip) {
      loadTripBookings(filteredTrips[0]._id);
    }
  }, [filteredTrips, selectedTripId]);

  const appliedFilterCount = Object.values(appliedFilters).filter(Boolean).length;
  const occupancyRate = dashboard?.occupancyRate ?? 0;
  const nextTrips = [...filteredTrips]
    .filter((trip) => getTripAttention(trip) === "departing-soon" || getTripAttention(trip) === "low-occupancy")
    .slice(0, 3);

  return (
    <div className="stack">
      <header className="page-header compact-page-header">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>Trips workspace</h1>
          <p>Monitor upcoming departures, spot blocked trips, and open manifests without leaving the operator flow.</p>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {dashboard ? (
        <div className="operator-kpi-strip">
          <StatCard label="Trips" value={dashboard.trips} helper={`${dashboard.publishedTrips} published`} />
          <StatCard label="Bookings" value={dashboard.bookings} helper="Confirmed bookings" />
          <StatCard label="Occupancy" value={`${occupancyRate}%`} helper="Across published trips" />
          <StatCard label="Vehicles" value={dashboard.vehicles} helper={`${dashboard.routes} routes ready`} />
        </div>
      ) : null}

      <div className="workspace-shortcuts">
        <Link className="shortcut-card" to="/operator/setup">
          <strong>Create supply</strong>
          <span>Add a vehicle, define a route, then publish a trip from the guided setup flow.</span>
        </Link>
        <Link className="shortcut-card" to="/operator/bookings">
          <strong>Open support view</strong>
          <span>Inspect passenger manifests and resolve booking questions faster.</span>
        </Link>
        <Link className="shortcut-card" to="/operator/trips">
          <strong>Review trips</strong>
          <span>Use the shared workspace when you need filters, sort order, and saved state.</span>
        </Link>
      </div>

      <SectionCard title="Operational alerts" description="Focus on what needs attention right now.">
        {!alertTrips.length ? <div className="empty-state">No operational alerts right now.</div> : null}
        <div className="attention-list">
          {alertTrips.map(({ trip, attention }) => (
            <div key={trip._id}>
              <strong>{trip.routeTemplate?.name || "Trip"}</strong>
              <span>
                {attention === "draft"
                  ? "Still a draft and not visible to passengers"
                  : attention === "departing-soon"
                    ? "Departing within the next hour"
                    : attention === "low-occupancy"
                      ? "Low occupancy and worth checking"
                      : attention === "no-bookings"
                        ? "Published but still empty"
                        : "Needs review"}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {user?.approvalStatus !== "approved" ? (
        <div className="workspace-surface">
          <h2>Account awaiting approval</h2>
          <p>Your operator profile has been created, but trip operations unlock only after admin approval.</p>
        </div>
      ) : null}

      {user?.approvalStatus !== "approved" ? null : (
        <>
          <div className="operator-toolbar filter-shell">
            <div className="operator-toolbar-filters compact-filter-grid">
              <label className="filter-field">
                <span>Travel date</span>
                <input
                  type="date"
                  value={draftFilters.date}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label className="filter-field">
                <span>Status</span>
                <select
                  value={draftFilters.status}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="filter-field">
                <span>Route</span>
                <select
                  value={draftFilters.route}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, route: event.target.value }))}
                >
                  <option value="">All routes</option>
                  {routeOptions.map((route) => (
                    <option key={route} value={route}>
                      {route}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Vehicle</span>
                <select
                  value={draftFilters.vehicle}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, vehicle: event.target.value }))}
                >
                  <option value="">All vehicles</option>
                  {vehicleOptions.map((vehicle) => (
                    <option key={vehicle} value={vehicle}>
                      {vehicle}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>Attention</span>
                <select
                  value={draftFilters.attention}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, attention: event.target.value }))}
                >
                  <option value="">All attention states</option>
                  <option value="ready">Ready</option>
                  <option value="departing-soon">Departing soon</option>
                  <option value="no-bookings">No bookings</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <div className="filter-actions operator-toolbar-actions">
              <p className="filter-status">{appliedFilterCount ? `${appliedFilterCount} filters applied` : "Showing all trips"}</p>
              <div className="card-actions filter-actions-group">
                <button type="button" className="ghost-button" onClick={loadOperatorData}>
                  Refresh
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    const empty = { date: "", status: "", route: "", vehicle: "", attention: "" };
                    setDraftFilters(empty);
                    setAppliedFilters(empty);
                    try {
                      localStorage.removeItem(OPERATOR_FILTERS_KEY);
                    } catch (_error) {
                      // Ignore storage failures.
                    }
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setAppliedFilters(draftFilters);
                    try {
                      localStorage.setItem(OPERATOR_FILTERS_KEY, JSON.stringify(draftFilters));
                    } catch (_error) {
                      // Ignore persistence failures.
                    }
                  }}
                >
                  Apply
                </button>
                <Link className="primary-button" to="/operator/setup">
                  Setup
                </Link>
              </div>
            </div>
          </div>

          {nextTrips.length ? (
            <SectionCard title="Trips to watch" description="These trips need quick attention.">
              <div className="recent-activity-list">
                {nextTrips.map((trip) => (
                  <div key={trip._id} className="recent-activity-row">
                    <div>
                      <strong>{trip.routeTemplate?.name || "-"}</strong>
                      <span>
                        {trip.travelDate} | {trip.departureTime} to {trip.arrivalTime}
                      </span>
                    </div>
                    <span className={`status-badge status-${trip.status}`}>{getTripAttention(trip)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <div className="operator-table-layout">
            <div className="table-shell workspace-table-shell">
              <table className="data-table operator-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Date</th>
                    <th>Departure</th>
                    <th>Vehicle</th>
                    <th>Occupancy</th>
                    <th>Status</th>
                    <th>Attention</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => {
                    const occupancy = Math.round((trip.bookedSeats.length / Math.max(trip.totalSeats, 1)) * 100);
                    return (
                      <tr
                        key={trip._id}
                        className={selectedTrip?._id === trip._id ? "selected-row" : ""}
                        onClick={() => loadTripBookings(trip._id)}
                      >
                        <td>
                          <div className="table-stack">
                            <strong>{trip.routeTemplate?.name || "-"}</strong>
                            <span>
                              {trip.routeTemplate?.origin} to {trip.routeTemplate?.destination}
                            </span>
                          </div>
                        </td>
                        <td>{trip.travelDate}</td>
                        <td>
                          {trip.departureTime} to {trip.arrivalTime}
                        </td>
                        <td>{trip.vehicle?.name || "-"}</td>
                        <td>
                          <div className="occupancy-inline">
                            <span>{occupancy}%</span>
                            <small>
                              {trip.bookedSeats.length}/{trip.totalSeats}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${trip.status}`}>{trip.status}</span>
                        </td>
                        <td>{getUrgencyLabel(trip)}</td>
                        <td>
                          <div className="row-action-cell">
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                loadTripBookings(trip._id);
                              }}
                            >
                              Open
                            </button>
                            {trip.status === "draft" ? (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateTripStatus(trip._id, "published");
                                }}
                              >
                                Publish
                              </button>
                            ) : null}
                            {trip.status === "published" ? (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateTripStatus(trip._id, "completed");
                                }}
                              >
                                Complete
                              </button>
                            ) : null}
                            {trip.status !== "cancelled" ? (
                              <button
                                type="button"
                                className="ghost-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateTripStatus(trip._id, "cancelled");
                                }}
                              >
                                Cancel
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="workspace-detail-grid">
              <section className="workspace-pane">
                <div className="workspace-pane-header">
                  <h2>Selected trip</h2>
                  {dashboard ? <span>{dashboard.bookings} total bookings</span> : null}
                </div>
                {selectedTrip ? (
                  <div className="detail-stack">
                    <p>
                      <strong>{selectedTrip.routeTemplate?.name}</strong>
                    </p>
                    <p>
                      {selectedTrip.routeTemplate?.origin} to {selectedTrip.routeTemplate?.destination}
                    </p>
                    <p>
                      {selectedTrip.travelDate} | {selectedTrip.departureTime} to {selectedTrip.arrivalTime}
                    </p>
                    <p>Vehicle: {selectedTrip.vehicle?.name || "-"}</p>
                    <p>Fare: Rs. {selectedTrip.fare}</p>
                    <div className="readiness-inline-list">
                      {getReadinessItems(selectedTrip).map((item) => (
                        <span key={item.label} className={item.ready ? "ready-pill" : "blocked-pill"}>
                          {item.label}: {item.ready ? "Ready" : "Blocked"}
                        </span>
                      ))}
                    </div>
                    {readinessGaps.length ? (
                      <div className="attention-list">
                        {readinessGaps.map((item) => (
                          <div key={item.label}>
                            <strong>{item.label}</strong>
                            <span>Add the missing setup detail before publishing or completing this trip.</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="success-text">This trip is fully ready for the next step.</p>
                    )}
                  </div>
                ) : (
                  <p className="muted-copy">Select a trip to inspect its current readiness and manifest state.</p>
                )}
              </section>

              <section className="workspace-pane">
                <div className="workspace-pane-header">
                  <h2>Manifest</h2>
                  {selectedTrip ? <Link to="/operator/bookings">Open support view</Link> : null}
                </div>
                {!selectedTripId ? <p className="muted-copy">Open a trip to load its manifest.</p> : null}
                {selectedTripId && !bookings.length ? <p className="muted-copy">No bookings for this trip yet.</p> : null}
                {bookings.length ? (
                  <div className="table-shell manifest-table-shell">
                    <table className="data-table manifest-table">
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Passenger</th>
                          <th>Seat</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.flatMap((booking) =>
                          booking.passengers
                            .slice()
                            .sort((left, right) => left.seatNumber - right.seatNumber)
                            .map((passenger) => (
                              <tr key={`${booking._id}-${passenger.seatNumber}`}>
                                <td>{booking.bookingReference}</td>
                                <td>
                                  <div className="table-stack">
                                    <strong>{passenger.name}</strong>
                                    <span>{booking.user?.email || "-"}</span>
                                  </div>
                                </td>
                                <td>{passenger.seatNumber}</td>
                                <td>
                                  <span className={`status-badge status-${booking.status}`}>{booking.status}</span>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
