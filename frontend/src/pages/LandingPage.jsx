import { Link } from "react-router-dom";
import { BrandLockup } from "../components/Layout";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <BrandLockup />
          <span className="eyebrow">Trip-based booking MVP</span>
          <h1>Built for real departures, real operators, and calmer booking flows.</h1>
          <p>
            BusEasy now centers on dated trips, operator approval, and stronger booking control instead of static
            route cards and browser prompts.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/signup">
              Create passenger account
            </Link>
            <Link className="ghost-button" to="/login">
              Log in
            </Link>
          </div>
          <div className="hero-role-grid">
            <article className="shortcut-card">
              <strong>Passenger</strong>
              <span>Search by route and travel date, hold seats, and manage bookings in one place.</span>
              <Link to="/signup">Start booking</Link>
            </article>
            <article className="shortcut-card">
              <strong>Operator</strong>
              <span>Get approved, add buses and routes, then publish trips with readiness checks.</span>
              <Link to="/signup">Request operator access</Link>
            </article>
            <article className="shortcut-card">
              <strong>Admin</strong>
              <span>Review operator approvals and keep the supply side healthy.</span>
              <Link to="/login">Open admin console</Link>
            </article>
          </div>
        </div>

        <div className="hero-metrics">
          <article>
            <strong>Passenger</strong>
            <span>Search by route and date, choose seats, review fares, manage tickets.</span>
          </article>
          <article>
            <strong>Operator</strong>
            <span>Manage buses, route templates, dated trips, and booking manifests.</span>
          </article>
          <article>
            <strong>Admin</strong>
            <span>Approve operators and monitor platform health from one console.</span>
          </article>
          <article>
            <strong>Next step</strong>
            <span>Choose the role you are working on, then the app will route you to the right workspace.</span>
          </article>
        </div>
      </section>
    </div>
  );
}
