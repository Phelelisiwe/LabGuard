import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LecturerDashBoard.css"; // Use the sidebar CSS

const API_URL = "https://labguard-dklp.onrender.com";

const functions = [
  {
    short: "ST",
    title: "Student Management",
    description: "Register students and maintain their details for laboratory access.",
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
    short: "BIO",
    title: "Register Biometrics",
    description: "Capture physical FPM10A fingerprints and phone biometrics.",
    action: "Open biometrics",
    path: "/admin/register-biometrics",
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
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch real counts from your API
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

  const statCards = [
    { label: "Total Students", value: loading ? "..." : studentCount, note: "registered in system" },
    { label: "Total Employees", value: loading ? "..." : employeeCount, note: "lecturers & staff" },
    { label: "System Status", value: "Online", note: "all services active" },
  ];

  return (
    <main className="lecturer-main">
      <section className="lecturer-topbar">
        <div>
          <span className="lecturer-eyebrow">ADMINISTRATION</span>
          <h1>Dashboard</h1>
          <p>
            Manage laboratory users, access control and academic
            activities from one central workspace.
          </p>
        </div>

        <div className="lecturer-topbar-profile">
          <div className="lecturer-avatar">A</div>
          <span>Super Admin</span>
        </div>
      </section>

      <section className="lecturer-welcome" style={{ marginTop: "20px" }}>
        <div>
          <p className="lecturer-eyebrow">YOUR WORKSPACE</p>
          <h2>System Overview</h2>
          <p>Select a feature to manage the LabGuard system.</p>
        </div>
        <div className="lecturer-welcome-icon">▤</div>
      </section>

      {/* REAL DATA STAT CARDS */}
      <section className="lecturer-stat-grid" style={{ marginTop: "20px" }}>
        {statCards.map((card) => (
          <div key={card.label} className="lecturer-stat-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </div>
        ))}
      </section>

      {/* ACTION CARDS */}
      <section className="lecturer-module-panel" style={{ marginTop: "30px" }}>
        <div className="lecturer-section-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>Choose an action to continue.</p>
          </div>
        </div>

        <div className="lecturer-action-grid">
          {functions.map((item) => (
            <button
              key={item.path}
              type="button"
              className="lecturer-action-card"
              style={{ borderColor: item.danger ? "#f0c5cb" : "" }}
              onClick={() => navigate(item.path)}
            >
              <span className="lecturer-action-icon students-icon" style={{ background: item.danger ? "#fff1f2" : "#eaf2fb", color: item.danger ? "#8d1428" : "#003b70" }}>
                {item.short}
              </span>
              <span className="lecturer-action-title">{item.title}</span>
              <span className="lecturer-action-description">{item.description}</span>
              <span className="lecturer-action-link" style={{ color: item.danger ? "#8d1428" : "" }}>
                {item.action} →
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="lecturer-footer">
        <span>LabGuard</span>
        <span>Secure laboratory access and management</span>
      </footer>
    </main>
  );
}

export default AdminDashboard;
