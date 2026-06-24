import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiRequest } from "../api";
import { useAuth } from "../auth";
import { BrandLockup } from "../components/Layout";

const getRedirectPath = (role) => {
  if (role === "admin") return "/admin";
  if (role === "operator") return "/operator";
  return "/passenger";
};

export default function LoginPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      login(data.token, data.user);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <BrandLockup compact />
        <span className="eyebrow">Welcome back</span>
        <h1>Log into BusEasy</h1>
        <p>Use the account type already approved for you.</p>
        <p className="helper-copy">
          Need operator approval or admin access? Ask your platform admin before trying again.
        </p>

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
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>

        <p className="secondary-copy">
          New here? <Link to="/signup">Create an account</Link>
        </p>
        <p className="helper-copy">
          Trouble signing in? Double-check the role tied to your account or re-create the account if you are testing.
        </p>
      </form>
    </div>
  );
}
