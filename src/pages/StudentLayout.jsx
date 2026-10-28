import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./StudentLayout.css";

const navigation = [
  { label: "Dashboard", short: "DB", path: "/student", end: true },
  { label: "My Modules", short: "MD", path: "/student/modules" },
  { label: "My Attendance", short: "AT", path: "/student/attendance" },
  { label: "Lab Check-In", short: "IN", path: "/student/check-in" },
  { label: "My Profile", short: "PR", path: "/student/update-information" },
  { label: "Change Password", short: "PW", path: "/student/change-password" },
];

function StudentLayout() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "Student";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="student-workspace">
      <aside className="student-sidebar">
        <div className="student-sidebar-brand">
          <span className="student-sidebar-logo">LG</span>
          <span>
            <strong>LabGuard</strong>
            <small>STUDENT PORTAL</small>
          </span>
        </div>

        <nav className="student-sidebar-nav" aria-label="Student navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `student-sidebar-link${isActive ? " active" : ""}`
              }
            >
              <span className="student-sidebar-icon">{item.short}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="student-sidebar-footer">
          <span className="student-sidebar-email">{email}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="student-workspace-content">
        <Outlet />
      </div>
    </div>
  );
}

export default StudentLayout;
