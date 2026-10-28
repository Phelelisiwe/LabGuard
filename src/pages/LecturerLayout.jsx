import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./LecturerDashBoard.css";

function LecturerLayout() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "Lecturer";
  const initials = email.charAt(0).toUpperCase();
  const moduleId = localStorage.getItem("selected_lecturer_module");
  const modulePath = moduleId
    ? `/lecturer/students/${moduleId}`
    : "/lecturer/modules";
  const attendancePath = moduleId
    ? `/lecturer/attendance/${moduleId}`
    : "/lecturer/modules";
  const overallPath = moduleId
    ? `/lecturer/attendance/${moduleId}/overall`
    : "/lecturer/modules";
  const predictionPath = moduleId
    ? `/lecturer/attendance/${moduleId}/prediction`
    : "/lecturer/modules";

  const navigation = [
    { label: "Dashboard", short: "▦", path: "/lecturer", end: true },
    { label: "My Modules", short: "▤", path: "/lecturer/modules" },
    { label: "Students", short: "ST", path: modulePath, requiresModule: true },
    {
      label: "Attendance",
      short: "AT",
      path: attendancePath,
      end: true,
      requiresModule: true,
    },
    {
      label: "Overall Attendance",
      short: "OV",
      path: overallPath,
      end: true,
      requiresModule: true,
    },
    {
      label: "Predictions",
      short: "PR",
      path: predictionPath,
      requiresModule: true,
    },
    {
      label: "Update Information",
      short: "⚙",
      path: "/lecturer/update-information",
    },
    {
      label: "Change Password",
      short: "PW",
      path: "/lecturer/change-password",
    },
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

        <nav className="lecturer-sidebar-nav" aria-label="Lecturer navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `lecturer-nav-item${
                  item.requiresModule && !moduleId
                    ? ""
                    : isActive
                      ? " active"
                      : ""
                }`
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
              <strong>Lecturer</strong>
              <span>{email}</span>
            </div>
          </div>
          <button
            type="button"
            className="lecturer-layout-logout"
            onClick={handleLogout}
          >
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

export default LecturerLayout;
