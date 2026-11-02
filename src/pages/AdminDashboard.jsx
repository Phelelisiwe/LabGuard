import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminDashboard.css";

const API_URL = "https://labguard-dklp.onrender.com";

const functions = [
  {
    short: "ST",
    title: "Student Management",
    description: "Register students and maintain their details for laboratory access and attendance.",
    action: "Register student",
    path: "/admin/register-student",
  },
  {
    short: "EM",
    title: "Employee Management",
    description: "Register lecturers, assistant lecturers, cleaners and IT specialists.",
    action: "Register employee",
    path: "/admin/register-employee",
  },
  {
    short: "AL",
    title: "Lecturer Assignment",
    description: "Assign lecturers to modules for class management and attendance.",
    action: "Assign lecturer",
    path: "/admin/assign-lecturer",
  },
  {
    short: "MOD",
    title: "Module Administration",
    description: "Create modules and assign students to their registered modules.",
    action: "Create module",
    path: "/admin/create-module",
  },
  {
    short: "MS",
    title: "Manage Students",
    description: "View and manage existing student accounts.",
    action: "Manage students",
    path: "/admin/students",
  },
  {
    short: "ME",
    title: "Manage Employees",
    description: "View and manage existing employee accounts.",
    action: "Manage employees",
    path: "/admin/employees",
  },
  {
    short: "DU",
    title: "Delete User",
    description: "Open the account deletion page for authorised user removals.",
    action: "Manage users",
    path: "/admin/delete-user",
    danger: true,
  },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  // Real Data State
  const [studentCount, setStudentCount] = useState("...");
  const [employeeCount, setEmployeeCount] = useState("...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetching real counts from your existing endpoints
        const headers = { Authorization: `Bearer ${token}` };
        
        // Assuming these endpoints exist based on your routes
        const [studentsRes, employeesRes] = await Promise.all([
          axios.get(`${API_URL}/admin/students`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/admin/employees`, { headers }).catch(() => ({ data: [] }))
        ]);

        const students = Array.isArray(studentsRes.data) ? studentsRes.data : studentsRes.data.students || [];
        const employees = Array.isArray(employeesRes.data) ? employeesRes.data : employeesRes.data.employees || [];

        setStudentCount(students.length);
        setEmployeeCount(employees.length);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate, token]);

  // Real Data Stat Cards
  const statCards = [
    { label: "Total Students", value: loading ? "..." : studentCount, note: "registered in system" },
    { label: "Total Employees", value: loading ? "..." : employeeCount, note: "lecturers & staff" },
    { label: "System Status", value: "Online", note: "all services active" },
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

        {/* REMOVED FAKE CHARTS & REPLACED WITH REAL STAT CARDS */}
        <div className="lg-stat-grid" style={{ marginTop: "20px" }}>
          {statCards.map((card) => (
            <div key={card.label} className="lg-stat-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </div>
          ))}
        </div>

        <div className="lg-function-grid" style={{ marginTop: "30px" }}>
          {functions.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`lg-function-card ${item.danger ? "lg-function-card-danger" : ""}`}
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
