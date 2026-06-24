import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api";
import { EntityWorkspace, StatusBadge } from "../../components/EntityWorkspace";
import { useAuth } from "../../auth";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString();
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0)}`;
}

function getMinutesToDeparture(record) {
  if (!record?.travelDate) {
    return null;
  }

  const departure = new Date(`${record.travelDate}T${record.departureTime || "00:00"}`);
  if (Number.isNaN(departure.getTime())) {
    return null;
  }

  return Math.round((departure.getTime() - Date.now()) / 60000);
}

function formatUrgency(record) {
  const minutes = getMinutesToDeparture(record);
  if (minutes === null) {
    return "-";
  }

  if (record.status === "draft") {
    return minutes < 1440 ? "Publish now" : "Draft";
  }

  if (record.status === "completed") {
    return "Completed";
  }

  if (record.status === "cancelled") {
    return "Follow up";
  }

  if (minutes < 0) {
    return "Departed";
  }

  if (minutes <= 60) {
    return `${minutes} min`;
  }

  if (minutes <= 180) {
    return "Soon";
  }

  return "On track";
}

function getUniqueOptions(records, getter) {
  return [...new Set(records.map((record) => getter(record)).filter(Boolean))].sort();
}

function getEntityConfig(entity, role, records, onTripStatusChange) {
  if (entity === "vehicles") {
    return {
      title: role === "admin" ? "Vehicle workspace" : "Vehicles workspace",
      description: "Review bus inventory in a spreadsheet-style table with filters for operator, capacity, and creation date.",
      filters: [
        ...(role === "admin"
          ? [
              {
                key: "operator",
                label: "Operator",
                type: "select",
                getValue: (record) => record.operator?.name || "",
                getOptions: (rows) => getUniqueOptions(rows, (record) => record.operator?.name || ""),
              },
            ]
          : []),
        {
          key: "seatCount",
          label: "Seat count",
          type: "numberRange",
          getValue: (record) => record.seatCount,
        },
        {
          key: "createdAt",
          label: "Created date",
          type: "dateRange",
          getValue: (record) => record.createdAt?.slice(0, 10) || "",
        },
      ],
      columns: [
        { key: "name", label: "Vehicle" },
        { key: "busNumber", label: "Bus number" },
        ...(role === "admin"
          ? [
              {
                key: "operator.name",
                label: "Operator",
              },
            ]
          : []),
        {
          key: "seatCount",
          label: "Seats",
          sortValue: (record) => record.seatCount,
        },
        {
          key: "status",
          label: "Status",
          render: (record) => <StatusBadge value={record.status} />,
        },
        {
          key: "createdAt",
          label: "Created",
          render: (record) => formatDate(record.createdAt),
          sortValue: (record) => record.createdAt,
        },
      ],
      detailTitle: "Vehicle snapshot",
      renderDetail: (record) => (
        <div className="detail-stack">
          <div className="detail-hero">
            <strong>{record.name}</strong>
            <StatusBadge value={record.status} />
          </div>
          <p>Bus number: {record.busNumber}</p>
          <p>Seat capacity: {record.seatCount}</p>
          {role === "admin" ? <p>Operator: {record.operator?.name || "-"}</p> : null}
          <p>Created: {formatDate(record.createdAt)}</p>
        </div>
      ),
    };
  }

  if (entity === "routes") {
    return {
      title: "Routes workspace",
      description: "Manage route templates with structured filters around stops, fares, and creation windows.",
      filters: [
        {
          key: "origin",
          label: "Origin",
          type: "select",
          getValue: (record) => record.origin,
          getOptions: (rows) => getUniqueOptions(rows, (record) => record.origin),
        },
        {
          key: "destination",
          label: "Destination",
          type: "select",
          getValue: (record) => record.destination,
          getOptions: (rows) => getUniqueOptions(rows, (record) => record.destination),
        },
        {
          key: "boardingPoint",
          label: "Boarding point",
          type: "select",
          getValue: (record) => record.boardingPoint,
          getOptions: (rows) => getUniqueOptions(rows, (record) => record.boardingPoint),
        },
        {
          key: "dropPoint",
          label: "Drop point",
          type: "select",
          getValue: (record) => record.dropPoint,
          getOptions: (rows) => getUniqueOptions(rows, (record) => record.dropPoint),
        },
        {
          key: "baseFare",
          label: "Base fare",
          type: "numberRange",
          getValue: (record) => record.baseFare,
        },
      ],
      columns: [
        { key: "name", label: "Route" },
        { key: "origin", label: "Origin" },
        { key: "destination", label: "Destination" },
        { key: "boardingPoint", label: "Boarding" },
        { key: "dropPoint", label: "Drop" },
        {
          key: "baseFare",
          label: "Base fare",
          render: (record) => formatCurrency(record.baseFare),
          sortValue: (record) => record.baseFare,
        },
        {
          key: "status",
          label: "Status",
          render: (record) => <StatusBadge value={record.status} />,
        },
      ],
      detailTitle: "Route snapshot",
      renderDetail: (record) => (
        <div className="detail-stack">
          <div className="detail-hero">
            <strong>{record.name}</strong>
            <StatusBadge value={record.status} />
          </div>
          <p>
            {record.origin} to {record.destination}
          </p>
          <p>Boarding point: {record.boardingPoint}</p>
          <p>Drop point: {record.dropPoint}</p>
          <p>
            Default timing: {record.defaultDepartureTime} to {record.defaultArrivalTime}
          </p>
          <p>Base fare: {formatCurrency(record.baseFare)}</p>
          {role === "admin" ? <p>Operator: {record.operator?.name || "-"}</p> : null}
        </div>
      ),
    };
  }

  if (entity === "trips") {
    const renderTripStatusActions = (record) => {
      if (!onTripStatusChange) {
        return null;
      }

      if (role === "operator") {
        if (record.status === "completed" || record.status === "cancelled") {
          return <span className="muted-copy">Closed</span>;
        }

        return (
          <div className="row-action-cell">
            {record.status === "draft" ? (
              <button type="button" className="ghost-button" onClick={() => onTripStatusChange(record._id, "published")}>
                Publish
              </button>
            ) : null}
            {record.status === "published" ? (
              <>
                <button type="button" className="ghost-button" onClick={() => onTripStatusChange(record._id, "completed")}>
                  Complete
                </button>
                <button type="button" className="ghost-button" onClick={() => onTripStatusChange(record._id, "cancelled")}>
                  Cancel
                </button>
              </>
            ) : null}
          </div>
        );
      }

      return (
        <div className="row-action-cell admin-status-actions">
          {["draft", "published", "completed", "cancelled"].map((status) => (
            <button
              key={status}
              type="button"
              className={record.status === status ? "primary-button" : "ghost-button"}
              disabled={record.status === status}
              onClick={() => onTripStatusChange(record._id, status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      );
    };

    return {
      title: "Trips workspace",
      description: "Run live departure operations with route, timing, occupancy, and urgency cues in one operational table.",
      filters: [
        {
          key: "route",
          label: "Route",
          type: "select",
          getValue: (record) => record.routeTemplate?.name || "",
          getOptions: (rows) => getUniqueOptions(rows, (record) => record.routeTemplate?.name || ""),
        },
        {
          key: "vehicle",
          label: "Vehicle",
          type: "select",
          getValue: (record) => record.vehicle?.name || "",
          getOptions: (rows) => getUniqueOptions(rows, (record) => record.vehicle?.name || ""),
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          getValue: (record) => record.status,
          getOptions: ["draft", "published", "cancelled", "completed"],
        },
        {
          key: "travelDate",
          label: "Travel date",
          type: "dateRange",
          getValue: (record) => record.travelDate,
        },
        {
          key: "fare",
          label: "Fare",
          type: "numberRange",
          getValue: (record) => record.fare,
        },
        {
          key: "occupancy",
          label: "Occupancy %",
          type: "numberRange",
          getValue: (record) => Math.round(((record.bookedSeats?.length || 0) / Math.max(record.totalSeats || 1, 1)) * 100),
        },
      ],
      columns: [
        { key: "routeTemplate.name", label: "Route" },
        { key: "vehicle.name", label: "Vehicle" },
        ...(role === "admin"
          ? [
              {
                key: "operator.name",
                label: "Operator",
              },
            ]
          : []),
        {
          key: "travelDate",
          label: "Departure",
          render: (record) => (
            <div className="table-stack">
              <strong>{record.travelDate}</strong>
              <span>
                {record.departureTime} to {record.arrivalTime}
              </span>
            </div>
          ),
          sortValue: (record) => `${record.travelDate}-${record.departureTime || ""}`,
        },
        {
          key: "urgency",
          label: "Attention",
          render: (record) => <StatusBadge value={formatUrgency(record)} />,
          sortValue: (record) => getMinutesToDeparture(record) ?? Number.MAX_SAFE_INTEGER,
        },
        {
          key: "fare",
          label: "Fare",
          render: (record) => formatCurrency(record.fare),
          sortValue: (record) => record.fare,
        },
        {
          key: "occupancy",
          label: "Occupancy",
          render: (record) => `${Math.round(((record.bookedSeats?.length || 0) / Math.max(record.totalSeats || 1, 1)) * 100)}%`,
          sortValue: (record) =>
            Math.round(((record.bookedSeats?.length || 0) / Math.max(record.totalSeats || 1, 1)) * 100),
        },
        {
          key: "status",
          label: "Status",
          render: (record) => <StatusBadge value={record.status} />,
        },
        {
          key: "actions",
          label: "Actions",
          sortable: false,
          render: (record) => renderTripStatusActions(record),
        },
      ],
      detailTitle: "Trip snapshot",
      renderDetail: (record) => (
        <div className="detail-stack">
          <div className="detail-hero">
            <strong>{record.routeTemplate?.name || "Trip"}</strong>
            <StatusBadge value={record.status} />
          </div>
          <p>
            {record.routeTemplate?.origin} to {record.routeTemplate?.destination}
          </p>
          <p>
            Departure window: {record.travelDate} | {record.departureTime} to {record.arrivalTime}
          </p>
          <p>Vehicle: {record.vehicle?.name || "-"}</p>
          <p>
            Occupancy: {record.bookedSeats?.length || 0}/{record.totalSeats} seats
          </p>
          <p>Fare: {formatCurrency(record.fare)}</p>
          {role === "admin" ? <p>Operator: {record.operator?.name || "-"}</p> : null}
        </div>
      ),
    };
  }

  return {
    title: "Bookings workspace",
    description: "Support passengers quickly with booking references, contact details, seat assignments, and trip context.",
    filters: [
      {
        key: "status",
        label: "Booking status",
        type: "select",
        getValue: (record) => record.status,
        getOptions: ["pending", "confirmed", "cancelled"],
      },
      {
        key: "paymentStatus",
        label: "Payment status",
        type: "select",
        getValue: (record) => record.paymentStatus,
        getOptions: ["unpaid", "initiated", "paid", "failed"],
      },
      ...(role === "admin"
        ? [
            {
              key: "operator",
              label: "Operator",
              type: "select",
              getValue: (record) => record.operator?.name || "",
              getOptions: (rows) => getUniqueOptions(rows, (record) => record.operator?.name || ""),
            },
          ]
        : []),
      {
        key: "trip",
        label: "Trip",
        type: "select",
        getValue: (record) => record.trip?.routeTemplate?.name || "",
        getOptions: (rows) => getUniqueOptions(rows, (record) => record.trip?.routeTemplate?.name || ""),
      },
      {
        key: "createdAt",
        label: "Booking date",
        type: "dateRange",
        getValue: (record) => record.createdAt?.slice(0, 10) || "",
      },
      {
        key: "totalFare",
        label: "Total fare",
        type: "numberRange",
        getValue: (record) => record.totalFare,
      },
      {
        key: "seatCount",
        label: "Seat count",
        type: "numberRange",
        getValue: (record) => record.passengers?.length || 0,
      },
    ],
    columns: [
      { key: "bookingReference", label: "Reference" },
      {
        key: "user.name",
        label: role === "admin" ? "Passenger" : "Customer",
        render: (record) => (
          <div className="table-stack">
            <strong>{record.user?.name || "-"}</strong>
            <span>{record.user?.email || "-"}</span>
          </div>
        ),
        sortValue: (record) => record.user?.name || "",
      },
      ...(role === "admin"
        ? [
            {
              key: "operator.name",
              label: "Operator",
            },
          ]
        : []),
      {
        key: "trip.routeTemplate.name",
        label: "Trip",
        render: (record) => (
          <div className="table-stack">
            <strong>{record.trip?.routeTemplate?.name || "-"}</strong>
            <span>
              {record.trip?.travelDate || "-"} | {record.trip?.departureTime || "-"}
            </span>
          </div>
        ),
        sortValue: (record) => `${record.trip?.travelDate || ""}-${record.trip?.departureTime || ""}`,
      },
      {
        key: "passengerCount",
        label: "Seats",
        render: (record) => record.passengers?.length || 0,
        sortValue: (record) => record.passengers?.length || 0,
      },
      {
        key: "totalFare",
        label: "Total fare",
        render: (record) => formatCurrency(record.totalFare),
        sortValue: (record) => record.totalFare,
      },
      {
        key: "paymentStatus",
        label: "Payment",
        render: (record) => <StatusBadge value={record.paymentStatus} />,
      },
      {
        key: "status",
        label: "Booking",
        render: (record) => <StatusBadge value={record.status} />,
      },
    ],
    detailTitle: "Booking snapshot",
    renderDetail: (record) => (
      <div className="detail-stack">
        <div className="detail-hero">
          <strong>{record.bookingReference}</strong>
          <StatusBadge value={record.status} />
        </div>
        <p>Passenger: {record.user?.name || "-"}</p>
        {role === "admin" ? <p>Operator: {record.operator?.name || "-"}</p> : null}
        <p>Trip: {record.trip?.routeTemplate?.name || "-"}</p>
        <p>
          Journey: {record.trip?.travelDate} | {record.trip?.departureTime} to {record.trip?.arrivalTime}
        </p>
        <p>Total fare: {formatCurrency(record.totalFare)}</p>
        <p>Payment: {record.paymentStatus}</p>
        <div className="passenger-tags">
          {(record.passengers || []).map((passenger) => (
            <span key={`${record._id}-${passenger.seatNumber}`}>
              {passenger.name} - Seat {passenger.seatNumber}
            </span>
          ))}
        </div>
      </div>
    ),
  };
}

export default function EntityWorkspacePage({ role, entity }) {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const updateTripStatus = async (tripId, status) => {
    try {
      await apiRequest(`/${role}/trips/${tripId}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ status }),
      });
      await loadRecords();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const config = useMemo(
    () => getEntityConfig(entity, role, records, updateTripStatus),
    [entity, role, records, updateTripStatus]
  );

  const loadRecords = async () => {
    setIsLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/${role}/${entity}`, { token });
      setRecords(data);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [entity, role]);

  return (
    <EntityWorkspace
      title={config.title}
      description={config.description}
      filters={config.filters}
      columns={config.columns}
      detailTitle={config.detailTitle}
      renderDetail={config.renderDetail}
      records={records}
      error={error}
      isLoading={isLoading}
      onRefresh={loadRecords}
      getRowId={(record) => record._id}
      initialSort={config.initialSort}
      storageKey={`${role}-${entity}-workspace`}
      variant={role === "operator" ? "plain" : "default"}
    />
  );
}
