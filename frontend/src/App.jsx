import { BrowserRouter, Routes, Route } from "react-router";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AuthProvider from "./contexts/AuthProvider.jsx";
import NotificationProvider from "./contexts/NotificationProvider.jsx";
import ToastNotification from "./components/ToastNotification.jsx";
import NavBar from "./components/NavBar.jsx";

function App() {
  return (
    <NotificationProvider>
      <ToastNotification />
      <AuthProvider>
        <NavBar />
        <BrowserRouter>
          <Routes>
            <Route
              index
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <ProtectedRoute auth_required={false} redirect_to="/">
                  <Login />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
