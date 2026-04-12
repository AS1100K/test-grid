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
    default:
      return <p>Unsupported Role.</p>;
  }
}

export default Dashboard;
