
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./LecturerAttendance.css";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerAttendance() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/lecturer/modules/${moduleId}/attendance`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setData(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Failed to load attendance."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [moduleId, navigate]);

  return (
    <div className="dashboard lecturer-page lecturer-attendance-page">
      <header className="lecturer-page-header">
        <div className="page-heading">
          <span className="page-label">LECTURER PORTAL</span>

          <h1>
            {data?.module?.module_code || "Module"} Attendance
          </h1>

          <p>
            {data?.module?.module_name || "Attendance register"}
          </p>
        </div>

        <button
          className="back-button"
          onClick={() => navigate("/lecturer/modules")}
        >
          ← Back to Modules
        </button>
      </header>

      <main className="lecturer-page-content">
        {loading && (
          <div className="status-card">
            <div className="loading-icon">⟳</div>
            <h2>Loading Attendance</h2>
            <p>Please wait while the attendance register is loaded.</p>
          </div>
        )}

        {error && (
          <div className="error-card">
            <div className="error-icon">!</div>
            <div>
              <h3>Unable to Load Attendance</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section className="attendance-hero-card">
              <div className="attendance-hero-icon">✓</div>

              <div className="attendance-hero-text">
                <span>ATTENDANCE REGISTER</span>
                <h2>{data.module.module_code}</h2>
                <p>{data.module.module_name}</p>
              </div>

              <div className="attendance-total">
                <strong>{data.total_records}</strong>
                <span>Attendance Records</span>
              </div>
            </section>

            <section className="attendance-actions-card">
              <div className="attendance-actions-description">
                <span>MODULE MANAGEMENT</span>
                <h2>Manage Attendance</h2>
                <p>
                  View students, monitor overall attendance,
                  or generate the next attendance prediction.
                </p>
              </div>

              <div className="quick-actions-buttons">
                <button
                  className="view-students-action"
                  onClick={() =>
                    navigate(`/lecturer/students/${moduleId}`)
                  }
                >
                  View Students <span>→</span>
                </button>

                <button
                  className="overall-attendance-action"
                  onClick={() =>
                    navigate(
                      `/lecturer/attendance/${moduleId}/overall`
                    )
                  }
                >
                  Overall Attendance <span>→</span>
                </button>

                <button
                  className="predict-attendance-action"
                  onClick={() =>
                    navigate(
                      `/lecturer/attendance/${moduleId}/prediction`
                    )
                  }
                >
                  Predict Attendance <span>→</span>
                </button>
              </div>
            </section>

            <section className="attendance-section">
              <div className="section-heading">
                <div>
                  <span>STUDENT ATTENDANCE</span>
                  <h2>Attendance Register</h2>
                  <p>
                    Attendance records for students registered
                    in this module.
                  </p>
                </div>

                <div className="attendance-count-badge">
                  {data.total_records} Records
                </div>
              </div>

              {data.attendance.length === 0 ? (
                <div className="empty-attendance">
                  <div className="empty-icon">📋</div>
                  <h3>No Attendance Records</h3>
                  <p>
                    No students have attended this module yet.
                  </p>
                </div>
              ) : (
                <div className="attendance-table-wrapper">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Student Number</th>
                        <th>Student</th>
                        <th>Date</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.attendance.map((record) => (
                        <tr key={record.attendance_id}>
                          <td>
                            <span className="student-number">
                              {record.student_number}
                            </span>
                          </td>

                          <td>
                            <div className="student-name-cell">
                              <div className="student-avatar">
                                {record.student_name
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>
                              <strong>{record.student_name}</strong>
                            </div>
                          </td>

                          <td>
                            <span className="date-value">
                              {record.date}
                            </span>
                          </td>

                          <td>{record.time_in || "-"}</td>
                          <td>{record.time_out || "-"}</td>

                          <td>
                            <span className="status-present">
                              ✓ {record.status || "Present"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="lecturer-page-footer">
        <strong>LabGuard</strong>
        <span>Laboratory Management System</span>
      </footer>
    </div>
  );
}

export default LecturerAttendance;
