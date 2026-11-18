import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./LecturerDashBoard.css"; // Reusing the same CSS for consistency

function AdminLayout() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "Super Admin";
  const initials = email.charAt(0).toUpperCase();

  const navigation = [
    { label: "Dashboard", short: "D", path: "/admin", end: true },
    { label: "Register Student", short: "ST", path: "/admin/register-student" },
    { label: "Register Employee", short: "EM", path: "/admin/register-employee" },
    { label: "Manage Students", short: "MS", path: "/admin/students" },
    { label: "Manage Employees", short: "ME", path: "/admin/employees" },
    { label: "Create Module", short: "CM", path: "/admin/create-module" },
    { label: "Assign Lecturer", short: "AL", path: "/admin/assign-lecturer" },
    { label: "Delete User", short: "DU", path: "/admin/delete-user" },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="lecturer-dashboard">
      <aside className="lecturer-sidebar">
        <div className="lecturer-logo">
          <span className="lecturer-logo-icon">L</span>
          <span>LabGuard</span>
        </div>

        <nav className="lecturer-sidebar-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `lecturer-nav-item${isActive ? " active" : ""}`
              }
            >
              <span>{item.short}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="lecturer-sidebar-bottom">
          <div className="lecturer-sidebar-user">
            <div className="lecturer-avatar">{initials}</div>
            <div className="lecturer-user-details">
              <strong>Super Admin</strong>
              <span>{email}</span>
            </div>
          </div>
          <button type="button" className="lecturer-layout-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="lecturer-route-content">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
