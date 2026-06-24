import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api";
import { useAuth } from "../../auth";

const defaultVehicle = { name: "", busNumber: "", seatCount: 40 };
const defaultRoute = {
  name: "",
  origin: "",
  destination: "",
  boardingPoint: "",
  dropPoint: "",
  defaultDepartureTime: "",
  defaultArrivalTime: "",
  baseFare: 0,
};
const defaultTrip = {
  vehicleId: "",
  routeTemplateId: "",
  travelDate: "",
  departureTime: "",
  arrivalTime: "",
  fare: "",
  status: "draft",
};

export default function OperatorSetupPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("trip");
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(defaultVehicle);
  const [routeForm, setRouteForm] = useState(defaultRoute);
  const [tripForm, setTripForm] = useState(defaultTrip);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle._id === tripForm.vehicleId) || null,
    [tripForm.vehicleId, vehicles]
  );
  const selectedRoute = useMemo(
    () => routes.find((route) => route._id === tripForm.routeTemplateId) || null,
    [tripForm.routeTemplateId, routes]
  );

  const loadSetupOptions = async () => {
    try {
      setError("");
      const [vehicleData, routeData] = await Promise.all([
        apiRequest("/operator/vehicles", { token }),
        apiRequest("/operator/routes", { token }),
      ]);
      setVehicles(vehicleData);
      setRoutes(routeData);
    } catch (fetchError) {
      setError(fetchError.message);
    }
  };

  useEffect(() => {
    loadSetupOptions();
  }, []);

  useEffect(() => {
    if (!selectedRoute) {
      return;
    }

    setTripForm((current) => ({
      ...current,
      departureTime: current.departureTime || selectedRoute.defaultDepartureTime,
      arrivalTime: current.arrivalTime || selectedRoute.defaultArrivalTime,
      fare: current.fare || selectedRoute.baseFare,
    }));
  }, [selectedRoute]);

  const createResource = async (path, payload, reset) => {
    try {
      setError("");
      setMessage("");
      await apiRequest(path, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      reset();
      setMessage("Saved successfully.");
      await loadSetupOptions();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const tripReadiness = [
    { label: "Vehicle", ready: Boolean(selectedVehicle), detail: selectedVehicle?.name || "Choose a bus" },
    { label: "Route", ready: Boolean(selectedRoute), detail: selectedRoute?.name || "Choose a route" },
    { label: "Date", ready: Boolean(tripForm.travelDate), detail: tripForm.travelDate || "Pick a departure date" },
    { label: "Fare", ready: Number(tripForm.fare) > 0, detail: tripForm.fare ? `Rs. ${tripForm.fare}` : "Use route default or enter a fare" },
  ];

  return (
    <div className="stack">
      <header className="page-header compact-page-header">
        <div>
          <span className="eyebrow">Setup</span>
          <h1>Operator setup</h1>
          <p>Create vehicles, routes, and new departures in a separate setup workspace without cluttering operations.</p>
        </div>
      </header>

      {error ? <p className="error-text">{error}</p> : null}
      {message ? <p className="success-text">{message}</p> : null}

      <div className="workspace-shortcuts">
        <article className="shortcut-card">
          <strong>Step 1</strong>
          <span>Add or review vehicles so seat counts and bus numbers are ready for trip creation.</span>
        </article>
        <article className="shortcut-card">
          <strong>Step 2</strong>
          <span>Define routes with default times and fares to reduce repetitive setup work.</span>
        </article>
        <article className="shortcut-card">
          <strong>Step 3</strong>
          <span>Create a trip draft, check readiness, and publish when everything is complete.</span>
        </article>
      </div>

      <div className="operator-toolbar">
        <div className="operator-shortcuts-pills">
          <button type="button" className={activeTab === "trip" ? "active-setup-tab" : ""} onClick={() => setActiveTab("trip")}>
            Create trip
          </button>
          <button type="button" className={activeTab === "vehicle" ? "active-setup-tab" : ""} onClick={() => setActiveTab("vehicle")}>
            Add vehicle
          </button>
          <button type="button" className={activeTab === "route" ? "active-setup-tab" : ""} onClick={() => setActiveTab("route")}>
            Add route
          </button>
        </div>
      </div>

      <div className="workspace-surface setup-surface">
        {activeTab === "trip" ? (
          <div className="setup-layout">
            <form
              className="inline-form setup-form"
              onSubmit={(event) => {
                event.preventDefault();
                createResource("/operator/trips", tripForm, () => setTripForm(defaultTrip));
              }}
            >
              <label>
                Vehicle
                <select
                  value={tripForm.vehicleId}
                  onChange={(event) => setTripForm((current) => ({ ...current, vehicleId: event.target.value }))}
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle._id} value={vehicle._id}>
                      {vehicle.name} ({vehicle.busNumber})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Route
                <select
                  value={tripForm.routeTemplateId}
                  onChange={(event) => setTripForm((current) => ({ ...current, routeTemplateId: event.target.value }))}
                  required
                >
                  <option value="">Select route</option>
                  {routes.map((route) => (
                    <option key={route._id} value={route._id}>
                      {route.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={tripForm.travelDate}
                  onChange={(event) => setTripForm((current) => ({ ...current, travelDate: event.target.value }))}
                  required
                />
              </label>
              <label>
                Departure
                <input
                  type="time"
                  value={tripForm.departureTime}
                  onChange={(event) => setTripForm((current) => ({ ...current, departureTime: event.target.value }))}
                />
              </label>
              <label>
                Arrival
                <input
                  type="time"
                  value={tripForm.arrivalTime}
                  onChange={(event) => setTripForm((current) => ({ ...current, arrivalTime: event.target.value }))}
                />
              </label>
              <label>
                Fare
                <input
                  type="number"
                  min="0"
                  value={tripForm.fare}
                  onChange={(event) => setTripForm((current) => ({ ...current, fare: event.target.value }))}
                />
              </label>
              <label>
                Status
                <select
                  value={tripForm.status}
                  onChange={(event) => setTripForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <button className="primary-button">Create trip</button>
            </form>

            <aside className="workspace-pane setup-preview">
              <div className="workspace-pane-header">
                <h2>Trip readiness</h2>
                <span>{tripReadiness.filter((item) => item.ready).length}/4 ready</span>
              </div>
              <div className="readiness-checklist">
                {tripReadiness.map((item) => (
                  <div key={item.label} className={`readiness-item ${item.ready ? "ready" : "blocked"}`}>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.detail}</p>
                    </div>
                    <span>{item.ready ? "Ready" : "Missing"}</span>
                  </div>
                ))}
              </div>
              <p className="muted-copy">
                The route defaults will prefill departure time, arrival time, and fare when you choose a template.
              </p>
            </aside>
          </div>
        ) : null}

        {activeTab === "vehicle" ? (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createResource("/operator/vehicles", vehicleForm, () => setVehicleForm(defaultVehicle));
            }}
          >
            <input
              placeholder="Vehicle name"
              value={vehicleForm.name}
              onChange={(event) => setVehicleForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <input
              placeholder="Bus number"
              value={vehicleForm.busNumber}
              onChange={(event) => setVehicleForm((current) => ({ ...current, busNumber: event.target.value }))}
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Seat count"
              value={vehicleForm.seatCount}
              onChange={(event) => setVehicleForm((current) => ({ ...current, seatCount: event.target.value }))}
              required
            />
            <button className="primary-button">Save vehicle</button>
          </form>
        ) : null}

        {activeTab === "route" ? (
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              createResource("/operator/routes", routeForm, () => setRouteForm(defaultRoute));
            }}
          >
            <input
              placeholder="Route name"
              value={routeForm.name}
              onChange={(event) => setRouteForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <input
              placeholder="Origin"
              value={routeForm.origin}
              onChange={(event) => setRouteForm((current) => ({ ...current, origin: event.target.value }))}
              required
            />
            <input
              placeholder="Destination"
              value={routeForm.destination}
              onChange={(event) => setRouteForm((current) => ({ ...current, destination: event.target.value }))}
              required
            />
            <input
              placeholder="Boarding point"
              value={routeForm.boardingPoint}
              onChange={(event) => setRouteForm((current) => ({ ...current, boardingPoint: event.target.value }))}
              required
            />
            <input
              placeholder="Drop point"
              value={routeForm.dropPoint}
              onChange={(event) => setRouteForm((current) => ({ ...current, dropPoint: event.target.value }))}
              required
            />
            <input
              type="time"
              value={routeForm.defaultDepartureTime}
              onChange={(event) => setRouteForm((current) => ({ ...current, defaultDepartureTime: event.target.value }))}
              required
            />
            <input
              type="time"
              value={routeForm.defaultArrivalTime}
              onChange={(event) => setRouteForm((current) => ({ ...current, defaultArrivalTime: event.target.value }))}
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Base fare"
              value={routeForm.baseFare}
              onChange={(event) => setRouteForm((current) => ({ ...current, baseFare: event.target.value }))}
              required
            />
            <button className="primary-button">Save route</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
