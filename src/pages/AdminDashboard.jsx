
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const actions = [
  {
    icon: "♙",
    title: "Register Student",
    description: "Create student accounts and send their login details.",
    button: "Register Student",
    path: "/admin/register-student",
  },
  {
    icon: "♧",
    title: "Register Employee",
    description: "Register lecturers, assistants and laboratory staff.",
    button: "Register Employee",
    path: "/admin/register-employee",
  },
  {
    icon: "▤",
    title: "Assign Lecturer",
    description: "Manage lecturers assigned to teaching modules.",
    button: "Assign Lecturer",
    path: "/admin/assign-lecturer",
  },
  {
    icon: "⌫",
    title: "Delete User",
    description: "Remove a student or employee from LabGuard.",
    button: "Manage User Deletion",
    path: "/admin/delete-user",
    danger: true,
  },
];

function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div className="lg-dashboard">
      <header className="lg-navbar">
        <div className="lg-brand">
          <img
            src="/tut-logo.png"
            alt="Tshwane University of Technology logo"
            className="lg-logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div>
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

      <main className="lg-main">
        <div className="lg-welcome">
          <div>
            <span className="lg-eyebrow">ADMINISTRATION</span>
            <h1>Dashboard</h1>
            <p>
              Welcome to LabGuard. Manage users and laboratory access
              from one place.
            </p>
          </div>
          <div className="lg-status">
            <span className="lg-status-dot" />
            System management
          </div>
        </div>

        <section className="lg-section">
          <div className="lg-section-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Choose an action to continue.</p>
            </div>
          </div>

          <div className="lg-action-grid">
            {actions.map((action) => (
              <article
                className={`lg-action-card ${
                  action.danger ? "lg-danger-card" : ""
                }`}
                key={action.title}
              >
                <div className="lg-card-top">
                  <div className="lg-action-icon">{action.icon}</div>
                  {action.danger && (
                    <span className="lg-danger-tag">Sensitive action</span>
                  )}
                </div>

                <h3>{action.title}</h3>
                <p>{action.description}</p>

                <button
                  className={`lg-action-button ${
                    action.danger ? "lg-danger-button" : ""
                  }`}
                  onClick={() => navigate(action.path)}
                >
                  {action.button}
                  <span aria-hidden="true"> →</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <footer className="lg-footer">
          <span>LabGuard</span>
          <span>Secure laboratory access and management</span>
        </footer>
      </main>
    </div>
  );
}

export default AdminDashboard;
