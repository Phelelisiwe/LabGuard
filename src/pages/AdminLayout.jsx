
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

const navigation = [
  { label: "Dashboard", short: "DB", path: "/admin/dashboard" },
  { label: "Register Student", short: "ST", path: "/admin/register-student" },
  { label: "Register Employee", short: "EM", path: "/admin/register-employee" },
  { label: "Manage Students", short: "MS", path: "/admin/students" },
  { label: "Manage Employees", short: "ME", path: "/admin/employees" },
  { label: "Create Module", short: "CM", path: "/admin/create-module" },
  { label: "Assign Student Module", short: "AS", path: "/admin/assign-student" },
  { label: "Assign Lecturer", short: "AL", path: "/admin/assign-lecturer" },
  { label: "Update Information", short: "UI", path: "/admin/update-information" },
  { label: "Change Password", short: "PW", path: "/admin/change-password" },
  { label: "Delete User", short: "DU", path: "/admin/delete-user", danger: true },
];

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <div className="admin-brand-mark">LG</div>
          <div>
            <h1>LabGuard</h1>
            <span>LABORATORY MANAGEMENT SYSTEM</span>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <span className="admin-role">Super Admin</span>
          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-title">ADMIN WORKSPACE</div>

          <nav className="admin-navigation" aria-label="Admin navigation">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `admin-nav-link ${isActive ? "active" : ""} ${
                    item.danger ? "danger" : ""
                  }`
                }
              >
                <span className="admin-nav-icon">{item.short}</span>
                <span className="admin-nav-label">{item.label}</span>
                <span className="admin-nav-arrow" aria-hidden="true">
                  ›
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <strong>LABGUARD</strong>
            <span>Secure access. Smarter laboratories.</span>
          </div>
        </aside>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
