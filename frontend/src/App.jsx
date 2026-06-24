import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./auth";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import OperatorSetupPage from "./pages/operator/OperatorSetupPage";
import BookingsPage from "./pages/passenger/BookingsPage";
import PassengerDashboard from "./pages/passenger/PassengerDashboard";
import EntityWorkspacePage from "./pages/shared/EntityWorkspacePage";

function HomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <LandingPage />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "operator") {
    return <Navigate to="/operator" replace />;
  }

  return <Navigate to="/passenger" replace />;
}

function ApprovedOperatorRoute() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="fullscreen-state">Loading your workspace...</div>;
  }

  if (!user || user.role !== "operator") {
    return <Navigate to="/login" replace />;
  }

  if (user.approvalStatus !== "approved") {
    return <Navigate to="/operator" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute allowedRoles={["passenger", "operator", "admin"]} />}>
        <Route element={<AppShell />}>
          <Route element={<ProtectedRoute allowedRoles={["passenger"]} />}>
            <Route path="/passenger" element={<PassengerDashboard />} />
            <Route path="/bookings" element={<BookingsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["operator"]} />}>
            <Route path="/operator" element={<OperatorDashboard />} />
            <Route element={<ApprovedOperatorRoute />}>
              <Route path="/operator/setup" element={<OperatorSetupPage />} />
              <Route path="/operator/trips" element={<EntityWorkspacePage role="operator" entity="trips" />} />
              <Route path="/operator/bookings" element={<EntityWorkspacePage role="operator" entity="bookings" />} />
              <Route path="/operator/vehicles" element={<EntityWorkspacePage role="operator" entity="vehicles" />} />
              <Route path="/operator/routes" element={<EntityWorkspacePage role="operator" entity="routes" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/operators" element={<AdminDashboard />} />
            <Route path="/admin/vehicles" element={<EntityWorkspacePage role="admin" entity="vehicles" />} />
            <Route path="/admin/routes" element={<EntityWorkspacePage role="admin" entity="routes" />} />
            <Route path="/admin/trips" element={<EntityWorkspacePage role="admin" entity="trips" />} />
            <Route path="/admin/bookings" element={<EntityWorkspacePage role="admin" entity="bookings" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
