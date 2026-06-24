import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import { SectionCard } from "../../components/Layout";
import { useAuth } from "../../auth";

export default function BookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copiedReference, setCopiedReference] = useState("");

  const loadBookings = () => {
    setIsLoading(true);
    setError("");
    apiRequest("/passenger/bookings/me", { token })
      .then(setBookings)
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const cancelBooking = async (bookingId) => {
    try {
      await apiRequest(`/passenger/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        token,
      });
      loadBookings();
    } catch (cancelError) {
      setError(cancelError.message);
    }
  };

  const copyReference = async (bookingReference) => {
    try {
      await navigator.clipboard.writeText(bookingReference);
      setCopiedReference(bookingReference);
      window.setTimeout(() => setCopiedReference(""), 1800);
    } catch (_error) {
      setError("Unable to copy booking reference right now.");
    }
  };

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Ticket lifecycle</span>
          <h1>Manage your bookings</h1>
          <p>See trip details, passenger assignments, payment state, and cancellations in one place.</p>
        </div>
      </header>

      <SectionCard title="My bookings" description="Confirmed, cancelled, and completed bookings tied to dated trips.">
        <div className="booking-guidance">
          <span>
            You can cancel confirmed bookings here before the trip has passed. Cancellation returns the seats to the trip immediately.
          </span>
          <span>
            Keep your booking reference handy for support, boarding checks, and payment follow-up.
          </span>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        {isLoading ? <div className="empty-state">Loading bookings...</div> : null}
        {!isLoading && !bookings.length ? <div className="empty-state">You have no bookings yet.</div> : null}
        <div className="booking-list">
          {bookings.map((booking) => (
            <article className="booking-card" key={booking._id}>
              <div className="trip-topline">
                <strong>{booking.bookingReference}</strong>
                <span>{booking.status}</span>
              </div>
              {copiedReference === booking.bookingReference ? <p className="success-text">Reference copied.</p> : null}
              <h3>{booking.trip.routeTemplate.name}</h3>
              <p>
                {booking.trip.routeTemplate.origin} to {booking.trip.routeTemplate.destination} on{" "}
                {booking.trip.travelDate}
              </p>
              <p>
                {booking.trip.departureTime} to {booking.trip.arrivalTime} | Rs. {booking.totalFare}
              </p>
              <p>Trip status: {booking.trip.status === "completed" ? "Past trip" : booking.trip.status}</p>
              <p>Payment status: {booking.paymentStatus}</p>
              <div className="passenger-tags">
                {booking.passengers.map((passenger) => (
                  <span key={`${booking._id}-${passenger.seatNumber}`}>
                    {passenger.name} - Seat {passenger.seatNumber}
                  </span>
                ))}
              </div>
              <div className="card-actions">
                <button className="ghost-button" onClick={() => copyReference(booking.bookingReference)}>
                  Copy reference
                </button>
                {booking.status === "confirmed" && booking.trip.status !== "completed" ? (
                  <button className="ghost-button" onClick={() => cancelBooking(booking._id)}>
                    Cancel booking
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
