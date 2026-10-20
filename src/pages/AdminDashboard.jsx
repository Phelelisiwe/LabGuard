import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const navigation = [
  { label: "Dashboard", short: "DB", path: "/admin/dashboard" },
  { label: "Register Student", short: "ST", path: "/admin/register-student" },
  { label: "Register Employee", short: "EM", path: "/admin/register-employee" },
  { label: "Biometric Registration", short: "BR", path: "/admin/biometric" },
  { label: "Assign Lecturer", short: "AL", path: "/admin/assign-lecturer" },
  { label: "Delete User", short: "DU", path: "/admin/delete-user", danger: true },
];
function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div className="lg-dashboard">
      {/* Top navigation bar */}
      <header className="lg-navbar">
        <div className="lg-brand">
          <div className="lg-logo-mark" aria-hidden="true">
            LG
          </div>

          <div className="lg-brand-text">
            <span className="lg-brand-name">LabGuard</span>
            <span className="lg-brand-subtitle">
              LABORATORY MANAGEMENT SYSTEM
            </span>
          </div>
        </div>

        <div className="lg-nav-right">
          <span className="lg-admin-label">Super Admin</span>

          <button className="lg-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="lg-layout">
        {/* Sidebar */}
        <aside className="lg-sidebar">
          <div className="lg-sidebar-heading">WORKSPACE</div>

          <nav className="lg-sidebar-nav" aria-label="Admin navigation">
            {navigation.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`lg-sidebar-link ${
                  item.label === "Dashboard" ? "lg-sidebar-active" : ""
                } ${item.danger ? "lg-sidebar-danger" : ""}`}
                aria-current={
                  item.label === "Dashboard" ? "page" : undefined
                }
                onClick={() => navigate(item.path)}
              >
                <span className="lg-sidebar-icon">{item.short}</span>
                <span className="lg-sidebar-label">{item.label}</span>
                {item.label !== "Dashboard" && (
                  <span className="lg-sidebar-arrow" aria-hidden="true">
                    &gt;
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="lg-sidebar-bottom">
            <div className="lg-sidebar-bottom-line" />
            <span className="lg-sidebar-small-title">LABGUARD</span>
            <span className="lg-sidebar-small-text">
              Secure access. Smarter laboratories.
            </span>
          </div>
        </aside>

        {/* Main dashboard content */}
        <main className="lg-main">
          <section className="lg-page-top">
            <div>
              <span className="lg-eyebrow">ADMINISTRATION</span>
              <h1>Dashboard</h1>
              <p>
                Welcome to LabGuard. Manage laboratory users and access
                from one central workspace.
              </p>
            </div>

            <div className="lg-status">
              <span className="lg-status-dot" />
              <span>Admin portal</span>
            </div>
          </section>

          <section className="lg-overview">
            <div className="lg-overview-heading">
              <div>
                <span className="lg-eyebrow">YOUR WORKSPACE</span>
                <h2>System Overview</h2>
                <p>
                  Your central workspace for laboratory administration.
                </p>
              </div>
            </div>

            <div className="lg-overview-panel">
              <div className="lg-overview-accent" />

              <div className="lg-overview-content">
                <div className="lg-overview-symbol" aria-hidden="true">
                  LG
                </div>

                <h3>Manage LabGuard from one place</h3>

                <p>
                  Use the navigation menu to register students and
                  employees, assign lecturers to modules, and manage
                  user accounts.
                </p>

                <p className="lg-overview-hint">
                  Select an option from the sidebar to get started.
                </p>
              </div>
            </div>

            <div className="lg-notice">
              <span className="lg-notice-mark" aria-hidden="true">
                i
              </span>

              <p>
                Remember to verify user details before making account
                changes. User deletion should only be performed when
                authorised.
              </p>
            </div>
          </section>

          <footer className="lg-footer">
            <span>LabGuard</span>
            <span>Secure laboratory access and management</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;