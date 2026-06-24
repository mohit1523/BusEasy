import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../api";
import { useAuth } from "../auth";

const HOLD_WINDOW_SECONDS = 5 * 60;

function formatTimeLeft(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildCoachRows(totalSeats) {
  const rows = [];

  for (let index = 1; index <= totalSeats; index += 4) {
    rows.push([index, index + 1, index + 2, index + 3].filter((seatNumber) => seatNumber <= totalSeats));
  }

  return rows;
}

export function SeatPicker({ trip, onClose, onConfirm, isSubmitting, error }) {
  const { token, user } = useAuth();
  const [tripView, setTripView] = useState(trip);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [names, setNames] = useState({});
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);
  const [holdError, setHoldError] = useState("");
  const [isSyncingHold, setIsSyncingHold] = useState(false);
  const selectedSeatsRef = useRef([]);
  const heldSeatsRef = useRef([]);
  const currentUserId = String(user?.id || user?._id || "");

  useEffect(() => {
    setTripView(trip);
    setSelectedSeats([]);
    setNames({});
    setHoldExpiresAt(null);
    setHoldSecondsLeft(0);
    setHoldError("");
    setIsSyncingHold(false);
  }, [trip]);

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  const seatRows = useMemo(() => buildCoachRows(tripView.totalSeats), [tripView.totalSeats]);
  const activeHolds = tripView.activeSeatHolds || tripView.seatHolds || [];
  const bookedSeats = tripView.bookedSeats || [];
  const ownHoldSeats = activeHolds.filter((hold) => String(hold.user) === currentUserId).map((hold) => hold.seatNumber);
  const otherHoldSeats = activeHolds
    .filter((hold) => String(hold.user) !== currentUserId)
    .map((hold) => hold.seatNumber);

  const openSeats = tripView.totalSeats - bookedSeats.length - activeHolds.length;

  const releaseSeatHolds = async (seatNumbers) => {
    if (!seatNumbers.length) {
      return;
    }

    await apiRequest(`/passenger/trips/${tripView._id}/holds`, {
      method: "DELETE",
      token,
      body: JSON.stringify({ seatNumbers }),
    });
  };

  const syncHold = async (seatNumbers) => {
    const dedupedSeats = [...new Set(seatNumbers)].sort((left, right) => left - right);

    if (!dedupedSeats.length) {
      if (heldSeatsRef.current.length) {
        try {
          await releaseSeatHolds(heldSeatsRef.current);
        } catch (_releaseError) {
          // Ignore release failures; the server will clear them on expiry.
        }
      }

      heldSeatsRef.current = [];
      setHoldExpiresAt(null);
      setHoldSecondsLeft(0);
      setHoldError("");
      return;
    }

    setIsSyncingHold(true);
    setHoldError("");

    try {
      const data = await apiRequest(`/passenger/trips/${tripView._id}/holds`, {
        method: "POST",
        token,
        body: JSON.stringify({ seatNumbers: dedupedSeats }),
      });

      setTripView(data.trip);
      setHoldExpiresAt(new Date(data.holdExpiresAt).getTime());
      heldSeatsRef.current = dedupedSeats;
    } catch (holdRequestError) {
      setHoldError(holdRequestError.message);
    } finally {
      setIsSyncingHold(false);
    }
  };

  useEffect(() => {
    const seats = selectedSeats.slice();
    const timeoutId = window.setTimeout(() => {
      syncHold(seats);
    }, seats.length ? 120 : 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedSeats, tripView._id]);

  useEffect(() => {
    if (!holdExpiresAt) {
      setHoldSecondsLeft(0);
      return undefined;
    }

    const tick = () => {
      const secondsRemaining = Math.max(0, Math.ceil((holdExpiresAt - Date.now()) / 1000));
      setHoldSecondsLeft(secondsRemaining);

      if (secondsRemaining === 0) {
        const seatsToRelease = heldSeatsRef.current.slice();
        setSelectedSeats([]);
        setNames({});
        setHoldError("Your seat hold expired. Please select the seats again.");
        heldSeatsRef.current = [];
        releaseSeatHolds(seatsToRelease).catch(() => {});
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, [holdExpiresAt]);

  useEffect(() => {
    return () => {
      const seatsToRelease = selectedSeatsRef.current;
      if (!seatsToRelease.length || !token) {
        return;
      }

      releaseSeatHolds(seatsToRelease).catch(() => {});
    };
  }, [token, tripView._id]);

  const toggleSeat = (seatNumber) => {
    if (bookedSeats.includes(seatNumber) || otherHoldSeats.includes(seatNumber)) {
      return;
    }

    setSelectedSeats((current) => {
      if (current.includes(seatNumber) || ownHoldSeats.includes(seatNumber)) {
        const next = current.filter((seat) => seat !== seatNumber);
        setNames((old) => {
          const updated = { ...old };
          delete updated[seatNumber];
          return updated;
        });
        return next;
      }

      return [...current, seatNumber].sort((a, b) => a - b);
    });
  };

  const releaseAllSeats = async () => {
    const seatsToRelease = selectedSeatsRef.current.slice();
    setSelectedSeats([]);
    setNames({});
    setHoldExpiresAt(null);
    setHoldSecondsLeft(0);
    setHoldError("");

    if (!seatsToRelease.length) {
      return;
    }

    try {
      await releaseSeatHolds(seatsToRelease);
      heldSeatsRef.current = [];
    } catch (_releaseError) {
      // Ignore release failures; the server will clear them on expiry.
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const passengers = selectedSeats.map((seatNumber) => ({
      seatNumber,
      name: names[seatNumber]?.trim() || "",
    }));

    onConfirm(passengers);
  };

  const getSeatState = (seatNumber) => {
    if (bookedSeats.includes(seatNumber)) {
      return { label: "Sold", tone: "seat-sold", note: "Booked" };
    }

    if (ownHoldSeats.includes(seatNumber)) {
      return { label: "Held by you", tone: "seat-hold", note: "Tap to release" };
    }

    if (otherHoldSeats.includes(seatNumber)) {
      return { label: "Held by another user", tone: "seat-hold seat-hold-external", note: "Unavailable" };
    }

    if (selectedSeats.includes(seatNumber)) {
      return { label: "Selected", tone: "seat-selected", note: "In your cart" };
    }

    return { label: "Open", tone: "seat-open", note: "Available" };
  };

  return (
    <div className="modal-backdrop seat-picker-backdrop">
      <div className="modal-card seat-picker-modal">
        <div className="modal-header seat-picker-header">
          <div className="seat-picker-title">
            <h3>{tripView.routeTemplate.name}</h3>
            <p>
              {tripView.routeTemplate.origin} to {tripView.routeTemplate.destination} on {tripView.travelDate}
            </p>
          </div>
          <button
            type="button"
            className="seat-picker-close"
            aria-label="Close seat picker"
            onClick={async () => {
              await releaseAllSeats();
              onClose();
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="seat-layout-flow coach-layout">
          <section className="coach-map-panel">
            <div className="trip-snapshot-card coach-snapshot">
              <div className="trip-topline coach-snapshot-topline">
                <span>{tripView.routeTemplate.name}</span>
                <strong>Rs. {tripView.fare} each</strong>
              </div>
              <h4 className="coach-route-title">
                {tripView.routeTemplate.origin} to {tripView.routeTemplate.destination}
              </h4>
              <div className="coach-meta-grid">
                <p className="coach-meta-row">
                  <span className="coach-meta-label">Date & time</span>
                  <span>
                    {tripView.travelDate} | {tripView.departureTime} to {tripView.arrivalTime}
                  </span>
                </p>
                <p className="coach-meta-row">
                  <span className="coach-meta-label">Vehicle</span>
                  <span>{tripView.vehicle?.name || "-"}</span>
                </p>
                <p className="coach-meta-row">
                  <span className="coach-meta-label">Boarding & drop</span>
                  <span>
                    {tripView.routeTemplate.boardingPoint} | {tripView.routeTemplate.dropPoint}
                  </span>
                </p>
              </div>
              <div className="readiness-inline-list coach-badges">
                <span className="ready-pill compact-pill">{openSeats} seats open</span>
                <span className="ready-pill compact-pill">5 minute seat hold</span>
                <span className={holdSecondsLeft <= 60 && holdSecondsLeft > 0 ? "blocked-pill urgency-pill compact-pill" : "ready-pill compact-pill"}>
                  {holdSecondsLeft > 0 ? `Hold expires in ${formatTimeLeft(holdSecondsLeft)}` : "Select seats to place them on hold"}
                </span>
              </div>
            </div>

            <div className="seat-legend coach-legend">
              <span>
                <i className="seat-dot seat-dot-available" />
                Open
              </span>
              <span>
                <i className="seat-dot seat-dot-selected" />
                Selected
              </span>
              <span>
                <i className="seat-dot seat-dot-hold" />
                Held by you
              </span>
              <span>
                <i className="seat-dot seat-dot-booked" />
                Sold
              </span>
            </div>

            <div className="coach-shell">
              <div className="coach-top-label">Front</div>
              <div className="coach-map">
                {seatRows.map((rowSeats, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="coach-row">
                    <div className="coach-half">
                      {rowSeats.slice(0, 2).map((seatNumber) => {
                        const seatState = getSeatState(seatNumber);
                        return (
                          <button
                            key={seatNumber}
                            type="button"
                            onClick={() => toggleSeat(seatNumber)}
                            disabled={bookedSeats.includes(seatNumber) || otherHoldSeats.includes(seatNumber)}
                            className={`seat-card ${seatState.tone} ${seatState.label === "Held by you" ? "seat-your-hold" : ""}`}
                          >
                            <span className="seat-number">{seatNumber}</span>
                            <span className="seat-status">{seatState.label}</span>
                            <small>{seatState.note}</small>
                          </button>
                        );
                      })}
                    </div>
                    <div className="coach-aisle" aria-hidden="true" />
                    <div className="coach-half">
                      {rowSeats.slice(2, 4).map((seatNumber) => {
                        const seatState = getSeatState(seatNumber);
                        return (
                          <button
                            key={seatNumber}
                            type="button"
                            onClick={() => toggleSeat(seatNumber)}
                            disabled={bookedSeats.includes(seatNumber) || otherHoldSeats.includes(seatNumber)}
                            className={`seat-card ${seatState.tone} ${seatState.label === "Held by you" ? "seat-your-hold" : ""}`}
                          >
                            <span className="seat-number">{seatNumber}</span>
                            <span className="seat-status">{seatState.label}</span>
                            <small>{seatState.note}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="coach-bottom-label">Rear</div>
            </div>
          </section>

          <aside className="selection-panel coach-summary">
            <div className="coach-summary-header">
              <h4>Booking summary</h4>
              <span>{selectedSeats.length ? `${selectedSeats.length} selected` : "Choose seats to begin"}</span>
            </div>

            <div className="summary-metrics">
              <div>
                <strong>{selectedSeats.length}</strong>
                <span>Seats selected</span>
              </div>
              <div>
                <strong>Rs. {selectedSeats.length * tripView.fare}</strong>
                <span>Total fare</span>
              </div>
            </div>

            <p className="coach-guidance">
              {selectedSeats.length
                ? "Selected seats are now held by you. Add passenger names and confirm before the timer expires."
                : "Choose open seats from the coach map. Sold seats are locked and seats held by you can be released by tapping them again."}
            </p>

            <div className="selected-seat-chips">
              {selectedSeats.length ? (
                selectedSeats.map((seatNumber) => (
                  <button
                    type="button"
                    key={seatNumber}
                    className="selected-seat-chip"
                    onClick={() => toggleSeat(seatNumber)}
                  >
                    Seat {seatNumber} ×
                  </button>
                ))
              ) : (
                <span className="empty-chip">No seats selected yet</span>
              )}
            </div>

            <div className="coach-step-card">
              <strong>Step 1</strong>
              <span>Pick your seats from the map.</span>
            </div>
            <div className="coach-step-card">
              <strong>Step 2</strong>
              <span>Seats are held for 5 minutes while you enter names.</span>
            </div>
            <div className="coach-step-card">
              <strong>Step 3</strong>
              <span>Confirm booking before the hold expires.</span>
            </div>

            {selectedSeats.map((seatNumber) => (
              <label key={seatNumber} className="passenger-seat-card">
                Passenger for seat {seatNumber}
                <input
                  value={names[seatNumber] || ""}
                  onChange={(event) =>
                    setNames((current) => ({
                      ...current,
                      [seatNumber]: event.target.value,
                    }))
                  }
                  placeholder={`Enter passenger name for seat ${seatNumber}`}
                />
              </label>
            ))}

            {holdError ? <p className="error-text">{holdError}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
            <div className="coach-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  await releaseAllSeats();
                }}
              >
                Clear selection
              </button>
              <button
                className="primary-button"
                disabled={
                  isSubmitting ||
                  isSyncingHold ||
                  !selectedSeats.length ||
                  selectedSeats.some((seatNumber) => !names[seatNumber]?.trim()) ||
                  Boolean(holdError)
                }
              >
                {isSubmitting ? "Confirming..." : isSyncingHold ? "Holding seats..." : "Confirm booking"}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
