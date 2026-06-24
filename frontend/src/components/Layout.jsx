import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export function BrandLockup({ compact = false }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup-compact" : ""}`}>
      <img className="brand-logo" src="/title-logo.png" alt="BusEasy" />
      <div className="brand-copy">
        <strong>BusEasy</strong>
        <span>Real departures, calmer travel.</span>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const operatorIsPending = user?.role === "operator" && user?.approvalStatus !== "approved";
  const navItems =
    user?.role === "passenger"
      ? [
          { to: "/passenger", label: "Search Trips", end: true },
          { to: "/bookings", label: "My Bookings" },
        ]
      : operatorIsPending
        ? [
            { to: "/operator", label: "Approval Status", end: true },
          ]
        : user?.role === "operator"
        ? [
            { to: "/operator", label: "Operations", end: true },
            { to: "/operator/trips", label: "Trips" },
            { to: "/operator/bookings", label: "Bookings" },
            { to: "/operator/vehicles", label: "Vehicles" },
            { to: "/operator/routes", label: "Routes" },
            { to: "/operator/setup", label: "Setup" },
          ]
        : user?.role === "admin"
          ? [
              { to: "/admin", label: "Dashboard", end: true },
              { to: "/admin/operators", label: "Operators" },
              { to: "/admin/vehicles", label: "Vehicles" },
              { to: "/admin/routes", label: "Routes" },
              { to: "/admin/trips", label: "Trips" },
              { to: "/admin/bookings", label: "Bookings" },
            ]
          : [];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <BrandLockup compact />
          <p>
            {user?.role === "passenger"
              ? "Book calmer, travel smarter."
              : operatorIsPending
                ? "Your operator account is waiting for approval."
                : "Operate with confidence."}
          </p>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>
            {user?.name}
            {operatorIsPending ? " · Pending approval" : ""}
          </p>
          <button className="ghost-button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export function StatCard({ label, value, helper }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <h3>{value}</h3>
      {helper ? <span>{helper}</span> : null}
    </article>
  );
}

export function SectionCard({ title, description, children, action }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
