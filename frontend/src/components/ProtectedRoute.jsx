import { Navigate } from "react-router";
import useAuth from "../contexts/useAuth";

function ProtectedRoute({
  children,
  auth_required = true,
  redirect_to = "/login",
  allowedRoles = [],
}) {
  const { token, user } = useAuth();

  // Public route: redirect away if already authenticated
  if (!auth_required && !!token) {
    return <Navigate to={redirect_to} replace />;
  }

  // Protected route: redirect to login if not authenticated
  if (auth_required && !token) {
    return <Navigate to="/login" replace />;
  }

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    auth_required &&
    !allowedRoles.includes(user?.role)
  ) {
    return <h1>Unauthorised User</h1>;
  }

  // Otherwise, render the children
  return children;
}

export default ProtectedRoute;
