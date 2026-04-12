import { Navigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";

function ProtectedRoute({
  children,
  auth_required = true,
  redirect_to = "/login",
}) {
  const { token } = useAuth();

  // Public route: redirect away if already authenticated
  if (!auth_required && !!token) {
    return <Navigate to={redirect_to} replace />;
  }

  // Protected route: redirect to login if not authenticated
  if (auth_required && !token) {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the children
  return children;
}

export default ProtectedRoute;
