import StudentExam from "../components/dashboard/StudentExam";
import SuperAdmin from "../components/dashboard/SuperAdmin";
import useAuth from "../contexts/useAuth";

function Dashboard() {
  const { user } = useAuth();

  if (user == null) {
    return <p>Loading...</p>;
  }

  switch (user.role) {
    case "super_admin":
      return <SuperAdmin />;
    case "admin":
      return <p>Dashboard WIP</p>;
    default:
      return <StudentExam />;
  }
}

export default Dashboard;
