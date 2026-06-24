import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth";

const getRedirectPath = (role) => {
  if (role === "admin") return "/admin";
  if (role === "operator") return "/operator";
  return "/passenger";
};

export default function SignupPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "passenger",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      login(data.token, data.user);
      setMessage(data.msg);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Create your account</span>
        <h1>Start with the role you need</h1>
        <p>Passengers can book immediately. Operators need admin approval before publishing trips.</p>
        <div className="role-choice-grid">
          <article className={`role-choice ${form.role === "passenger" ? "active" : ""}`}>
            <strong>Passenger</strong>
            <span>Best for travelers who want to search trips and book seats right away.</span>
          </article>
          <article className={`role-choice ${form.role === "operator" ? "active" : ""}`}>
            <strong>Operator</strong>
            <span>Best for supply partners who will manage buses, routes, and dated departures.</span>
          </article>
        </div>

        <label>
          Full name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
        </label>

        <label>
          Role
          <select
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            <option value="passenger">Passenger</option>
            <option value="operator">Operator</option>
          </select>
        </label>
        <p className="helper-copy">
          Operators will be sent to approval after signup. Passengers can use the account immediately.
        </p>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </label>

        <label>
          Confirm password
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            required
          />
        </label>

        {message ? <p className="success-text">{message}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        <button className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create account"}
        </button>

        <p className="secondary-copy">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
