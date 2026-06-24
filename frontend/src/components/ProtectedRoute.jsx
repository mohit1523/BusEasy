import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export function ProtectedRoute({ allowedRoles }) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="fullscreen-state">Loading your workspace...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = user.role === "admin" ? "/admin" : user.role === "operator" ? "/operator" : "/passenger";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
