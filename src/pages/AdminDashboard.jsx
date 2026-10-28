
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const functions = [
  {
    short: "ST",
    title: "Student Management",
    description:
      "Register students and maintain their details for laboratory access and attendance.",
    action: "Register student",
    path: "/admin/register-student",
  },
  {
    short: "EM",
    title: "Employee Management",
    description:
      "Register lecturers, assistant lecturers, cleaners and IT specialists.",
    action: "Register employee",
    path: "/admin/register-employee",
  },
  {
    short: "AL",
    title: "Lecturer Assignment",
    description:
      "Assign lecturers to modules for class management and attendance.",
    action: "Assign lecturer",
    path: "/admin/assign-lecturer",
  },
  {
    short: "MOD",
    title: "Module Administration",
    description:
      "Create modules and assign students to their registered modules.",
    action: "Create module",
    path: "/admin/create-module",
  },
  {
    short: "MS",
    title: "Manage Students",
    description:
      "View and manage existing student accounts.",
    action: "Manage students",
    path: "/admin/students",
  },
  {
    short: "ME",
    title: "Manage Employees",
    description:
      "View and manage existing employee accounts.",
    action: "Manage employees",
    path: "/admin/employees",
  },
  {
    short: "DU",
    title: "Delete User",
    description:
      "Open the account deletion page for authorised user removals.",
    action: "Manage users",
    path: "/admin/delete-user",
    danger: true,
  },
];

function AdminDashboard() {
  const navigate = useNavigate();

  const attendanceTrend = [68, 77, 70, 84, 92, 88, 96];
  const operations = [
    { name: "Students", value: 86, color: "blue" },
    { name: "Access checks", value: 74, color: "gold" },
    { name: "Module activity", value: 91, color: "green" },
    { name: "Access alerts", value: 62, color: "red" },
  ];
  const statCards = [
    { label: "Students", value: "1,248", note: "+8% this term" },
    { label: "Attendance", value: "89%", note: "healthy rate" },
    { label: "Alerts", value: "14", note: "requires review" },
  ];

  return (
    <div className="lg-main">
      <section className="lg-page-top">
        <div>
          <span className="lg-eyebrow">ADMINISTRATION</span>
          <h1>Dashboard</h1>
          <p>
            Manage laboratory users, access control and academic
            activities from one central workspace.
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
            <p>Select a feature to manage the LabGuard system.</p>
          </div>
        </div>

        <div className="lg-dashboard-welcome">
          <div className="lg-welcome-mark" aria-hidden="true">
            LG
          </div>

          <div className="lg-welcome-text">
            <h2>Welcome to LabGuard Administration</h2>
            <p>
              LabGuard helps manage laboratory users, module assignments,
              access control and secure attendance. Use the shortcuts below
              to access available features.
            </p>
          </div>
        </div>

        <div className="lg-analytics-row">
          <div className="lg-analytics-card">
            <div className="lg-analytics-header">
              <div>
                <span>ATTENDANCE</span>
                <h3>Weekly overview</h3>
              </div>
              <strong>89%</strong>
            </div>

            <div className="lg-mini-chart" aria-label="Weekly attendance chart">
              {attendanceTrend.map((value, index) => (
                <div key={index} className="lg-mini-bar-group">
                  <div className="lg-mini-bar-track">
                    <div className="lg-mini-bar-fill" style={{ height: `${value}%` }} />
                  </div>
                  <span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg-analytics-card">
            <div className="lg-analytics-header">
              <div>
                <span>OPERATIONS</span>
                <h3>System health</h3>
              </div>
            </div>

            <div className="lg-progress-list">
              {operations.map((item) => (
                <div key={item.name} className="lg-progress-item">
                  <div className="lg-progress-label">
                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="lg-progress-track">
                    <div className={`lg-progress-fill ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg-stat-grid">
          {statCards.map((card) => (
            <div key={card.label} className="lg-stat-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </div>
          ))}
        </div>

        <div className="lg-function-grid">
          {functions.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`lg-function-card ${
                item.danger ? "lg-function-card-danger" : ""
              }`}
              onClick={() => navigate(item.path)}
            >
              <span className="lg-function-icon">{item.short}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <span className="lg-function-link">
                {item.action} <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}

          <div className="lg-function-card lg-function-card-info">
            <span className="lg-function-icon">ATT</span>
            <h3>Attendance Management</h3>
            <p>
              Support secure attendance tracking for registered modules
              using the LabGuard verification workflow.
            </p>
            <span className="lg-function-note">
              Uses the attendance workflow configured in LabGuard.
            </span>
          </div>

          <div className="lg-function-card lg-function-card-info">
            <span className="lg-function-icon">SEC</span>
            <h3>Access Control</h3>
            <p>
              Support secure laboratory access through registered
              users and verified phone-based checks.
            </p>
            <span className="lg-function-note">
              Access depends on registration and verification.
            </span>
          </div>
        </div>

        <div className="lg-notice">
          <span className="lg-notice-mark" aria-hidden="true">i</span>
          <p>
            <strong>Security reminder:</strong> Verify user details
            before making account changes. Only authorised administrators
            should manage user accounts and continue the attendance workflow.
          </p>
        </div>
      </section>

      <footer className="lg-footer">
        <span>LabGuard</span>
        <span>Secure laboratory access and management</span>
      </footer>
    </div>
  );
}

export default AdminDashboard;
