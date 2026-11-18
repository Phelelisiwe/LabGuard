import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./LecturerStudents.css";

const API_URL = "https://labguard-dklp.onrender.com";

function StudentsPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchStudents = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API_URL}/lecturer/modules/${moduleId}/students`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }
        setError(err.response?.data?.detail || "Failed to load students.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [moduleId, navigate, token]);

  if (loading) {
    return (
      <main className="lecturer-main">
        <div className="lecturer-state">
          <div className="lecturer-spinner"></div>
          <p>Loading students...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="lecturer-main">
        <div className="lecturer-error">{error}</div>
      </main>
    );
  }

  return (
    <main className="lecturer-main">
      <button onClick={() => navigate("/lecturer/modules")} className="lecturer-back-btn">
        &larr; Back to Modules
      </button>

      <header className="lecturer-topbar" style={{ minHeight: "80px", paddingBottom: "20px" }}>
        <div>
          <p className="lecturer-eyebrow">MODULE STUDENTS</p>
          <h1 style={{ fontSize: "28px" }}>{data?.module.module_code}</h1>
          <p style={{ color: "var(--lecturer-muted)", marginTop: "4px" }}>
            {data?.module.module_name}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="lecturer-stat-card" style={{ padding: "12px 24px", display: "inline-block" }}>
            <span style={{ fontSize: "10px", color: "var(--lecturer-red)", fontWeight: "800", letterSpacing: "1px" }}>REGISTERED</span>
            <strong style={{ display: "block", fontSize: "24px", color: "var(--lecturer-blue)", marginTop: "4px" }}>
              {data?.total_students}
            </strong>
          </div>
        </div>
      </header>

      <section className="lecturer-module-panel" style={{ marginTop: "20px" }}>
        <div className="lecturer-section-heading">
          <div>
            <h2>Student List</h2>
            <p>Students currently registered for this module.</p>
          </div>
        </div>

        <div className="student-table-container">
          <table className="student-table">
            <thead>
              <tr>
                <th>Student No.</th>
                <th>Name</th>
                <th>Course</th>
                <th>Year</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {data?.students.map((student) => (
                <tr key={student.id}>
                  <td style={{ fontWeight: "600" }}>{student.student_number}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div className="student-avatar">
                        {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                      </div>
                      <div>
                        {student.first_name} {student.last_name}
                      </div>
                    </div>
                  </td>
                  <td>{student.course}</td>
                  <td>
                    <span className="lecturer-level-tag" style={{ fontSize: "11px", padding: "4px 8px" }}>
                      Year {student.current_year}
                    </span>
                  </td>
                  <td>
                    <a href={`mailto:${student.email}`} style={{ color: "var(--lecturer-blue)", textDecoration: "none" }}>
                      {student.email}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.students || data.students.length === 0) && (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--lecturer-muted)" }}>
              No students registered for this module.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default StudentsPage;
