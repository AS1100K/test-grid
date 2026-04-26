import StudentExam from "../components/dashboard/StudentExam";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import useAuth from "../contexts/useAuth";
import SuperAdmin from "../components/dashboard/SuperAdmin";

function Dashboard() {
  const { user } = useAuth();

  if (user == null) {
    return <p>Loading...</p>;
  }

  switch (user.role) {
    case "super_admin":
      return <SuperAdmin />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <StudentExam />;
  }
}

export default Dashboard;
