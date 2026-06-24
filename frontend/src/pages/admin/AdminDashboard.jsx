import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import { SectionCard, StatCard } from "../../components/Layout";
import { useAuth } from "../../auth";

export default function AdminDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [pendingOperators, setPendingOperators] = useState([]);
  const [allOperators, setAllOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");

  const loadAdminData = async () => {
    try {
      setError("");
      const [dashboardData, pendingData, operatorData, vehicleData, routeData, tripData, bookingData] = await Promise.all([
        apiRequest("/admin/dashboard", { token }),
        apiRequest("/admin/operators/pending", { token }),
        apiRequest("/admin/operators", { token }),
        apiRequest("/admin/vehicles", { token }),
        apiRequest("/admin/routes", { token }),
        apiRequest("/admin/trips", { token }),
        apiRequest("/admin/bookings", { token }),
      ]);
      setDashboard(dashboardData.stats);
      setPendingOperators(pendingData);
      setAllOperators(operatorData);
      setVehicles(vehicleData);
      setRoutes(routeData);
      setTrips(tripData);
      setBookings(bookingData);
    } catch (fetchError) {
      setError(fetchError.message);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const rejectedOperators = allOperators.filter((operator) => operator.approvalStatus === "rejected");
  const inactiveVehicles = vehicles.filter((vehicle) => vehicle.status !== "active");
  const inactiveRoutes = routes.filter((route) => route.status !== "active");
  const tripsWithoutBookings = trips.filter((trip) => !trip.bookedSeats?.length);
  const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled");

  const updateApproval = async (operatorId, approvalStatus) => {
    try {
      await apiRequest(`/admin/operators/${operatorId}/approval`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ approvalStatus }),
      });
      loadAdminData();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Platform oversight</span>
          <h1>Keep supply healthy and approvals deliberate</h1>
          <p>Review pending operator accounts, track platform counts, and keep the network trustworthy.</p>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {dashboard ? (
        <div className="stats-grid">
          <StatCard label="Users" value={dashboard.users} />
          <StatCard label="Operators" value={dashboard.operators} />
          <StatCard label="Pending approvals" value={dashboard.pendingOperators} />
          <StatCard label="Trips" value={dashboard.trips} helper={`${dashboard.bookings} bookings`} />
        </div>
      ) : null}

      <SectionCard title="Platform health" description="Surface the exceptions that may need admin attention.">
        <div className="attention-list">
          <div>
            <strong>Rejected operators</strong>
            <span>{rejectedOperators.length ? `${rejectedOperators.length} operator(s) rejected` : "No rejected operators right now"}</span>
          </div>
          <div>
            <strong>Inactive vehicles</strong>
            <span>{inactiveVehicles.length ? `${inactiveVehicles.length} vehicle(s) inactive` : "All vehicles are active"}</span>
          </div>
          <div>
            <strong>Inactive routes</strong>
            <span>{inactiveRoutes.length ? `${inactiveRoutes.length} route(s) inactive` : "All routes are active"}</span>
          </div>
          <div>
            <strong>Empty trips</strong>
            <span>{tripsWithoutBookings.length ? `${tripsWithoutBookings.length} trip(s) still empty` : "Every trip has at least one booking"}</span>
          </div>
          <div>
            <strong>Cancelled bookings</strong>
            <span>{cancelledBookings.length ? `${cancelledBookings.length} booking(s) cancelled` : "No cancellations yet"}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Approval context" description="Review a little more detail before you approve or reject.">
        {!pendingOperators.length ? <div className="empty-state">No operator approvals are waiting right now.</div> : null}
        <div className="approval-list">
          {pendingOperators.map((operator) => (
            <article key={operator._id} className="approval-card">
              <div className="detail-stack">
                <div className="trip-topline">
                  <strong>{operator.name}</strong>
                  <span className={`status-badge status-${operator.approvalStatus}`}>{operator.approvalStatus}</span>
                </div>
                <p>{operator.email}</p>
                <p>Created: {new Date(operator.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="card-actions">
                <button className="primary-button" onClick={() => updateApproval(operator._id, "approved")}>
                  Approve
                </button>
                <button className="ghost-button" onClick={() => updateApproval(operator._id, "rejected")}>
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Operator roster" description="Full visibility into supply status across the platform.">
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {allOperators.map((operator) => (
                <tr key={operator._id}>
                  <td>{operator.name}</td>
                  <td>{operator.email}</td>
                  <td>{operator.approvalStatus}</td>
                  <td>{new Date(operator.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
