import { BrowserRouter, Routes, Route } from "react-router";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AuthProvider from "./contexts/AuthProvider.jsx";
import NotificationProvider from "./contexts/NotificationProvider.jsx";
import ToastNotification from "./components/ToastNotification.jsx";
import NavBar from "./components/NavBar.jsx";
import Exams from "./pages/Exams.jsx";
import NewUser from "./pages/NewUser.jsx";
import SubmissionResponses from "./pages/SubmissionResponses.jsx";

function App() {
  return (
    <NotificationProvider>
      <ToastNotification />
      <AuthProvider>
        <NavBar />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <ProtectedRoute auth_required={false} redirect_to="/">
                  <Login />
                </ProtectedRoute>
              }
            />
            <Route
              index
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-user"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                  <NewUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams/*"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <Exams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions/:exam_id/:student_username/responses"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <SubmissionResponses />
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
