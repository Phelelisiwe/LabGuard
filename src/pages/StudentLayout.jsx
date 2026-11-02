import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./LecturerDashBoard.css"; // Reusing the same CSS for consistency

function StudentLayout() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "Student";
  
  // Safe fallback in case email is somehow missing
  const initials = email && typeof email === 'string' ? email.charAt(0).toUpperCase() : "S";

  const navigation = [
    { label: "Dashboard", short: "D", path: "/student", end: true },
    { label: "My Modules", short: "M", path: "/student/modules" },
    { label: "Attendance", short: "A", path: "/student/attendance" },
    { label: "Check In", short: "C", path: "/student/check-in" },
    { label: "Update Information", short: "U", path: "/student/update-information" },
    { label: "Change Password", short: "P", path: "/student/change-password" },
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
              <strong>Student</strong>
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

export default StudentLayout;
