
import "./LecturerStudents.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerStudents() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/lecturer/modules/${moduleId}/students`,
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
            "Failed to load students."
        );
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [moduleId, navigate]);

  return (
    <div className="dashboard lecturer-page lecturer-students-page">
<<<<<<< HEAD

      {/* HEADER */}
      <header className="lecturer-page-header">

        <div className="page-heading">

          <span className="page-label">
            LECTURER PORTAL
          </span>
=======
      <header className="ls-header">
        <div className="ls-header-text">
          <span className="ls-eyebrow">LECTURER PORTAL</span>
>>>>>>> 230132a (Update LabGuard frontend and lecturer dashboard)

          <h1>
            {data?.module?.module_code || "Module"} Students
          </h1>

          <p>
            {data?.module?.module_name ||
              "Students registered for this module"}
          </p>
        </div>

        <button
          type="button"
          className="ls-back-button"
          onClick={() => navigate("/lecturer/modules")}
        >
          <span aria-hidden="true">←</span> Back to Modules
        </button>
      </header>

      <main className="ls-content">
        {loading && (
          <section className="ls-status-card">
            <div className="ls-spinner" />
            <h2>Loading Students</h2>
            <p>Please wait while the student list loads.</p>
          </section>
        )}

        {error && (
          <section className="ls-error-card">
            <span className="ls-error-icon">!</span>
            <div>
              <h2>Unable to Load Students</h2>
              <p>{error}</p>
            </div>
          </section>
        )}

        {!loading && !error && data && (
          <>
            <section className="ls-module-card">
              <div className="ls-module-icon" aria-hidden="true">
                👨‍🎓
              </div>

              <div className="ls-module-info">
                <span className="ls-eyebrow">
                  MODULE STUDENTS
                </span>
                <h2>{data.module.module_code}</h2>
                <p>{data.module.module_name}</p>
              </div>

              <div className="ls-total">
                <strong>{data.total_students}</strong>
                <span>Registered Students</span>
              </div>
            </section>

            <section className="ls-records-card">
              <div className="ls-records-header">
                <div className="ls-records-title">
                  <span className="ls-eyebrow">
                    REGISTERED STUDENTS
                  </span>
                  <h2>Student Records</h2>
                  <p>
                    View student details and registration
                    information for this module.
                  </p>
                </div>

                <span className="ls-count">
                  {data.total_students} Registered
                </span>
              </div>

              {data.students.length === 0 ? (
                <div className="ls-empty">
                  <div className="ls-empty-icon">👥</div>
                  <h3>No Students Registered</h3>
                  <p>
                    There are currently no students registered
                    for this module.
                  </p>
                </div>
              ) : (
                <div className="ls-table-scroll">
                  <table className="ls-table">
                    <thead>
                      <tr>
                        <th>Student Number</th>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Year</th>
                        <th>Email Address</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.students.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <span className="ls-student-number">
                              {student.student_number}
                            </span>
                          </td>

                          <td>
                            <div className="ls-student-cell">
                              <div className="ls-avatar">
                                {student.first_name
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="ls-student-info">
                                <strong>
                                  {student.first_name}{" "}
                                  {student.last_name}
                                </strong>
                                <small>Student</small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="ls-course">
                              {student.course}
                            </span>
                          </td>

                          <td>
                            <span className="ls-year">
                              Year {student.current_year}
                            </span>
                          </td>

                          <td>
                            <span className="ls-email">
                              {student.email}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="ls-actions-card">
              <div className="ls-actions-text">
                <span className="ls-eyebrow">
                  MODULE MANAGEMENT
                </span>
                <h2>Continue Managing This Module</h2>
                <p>
                  Access attendance records and review the
                  overall attendance performance of your students.
                </p>
              </div>

              <div className="ls-actions">
                <button
                  type="button"
                  className="ls-button ls-button-primary"
                  onClick={() =>
                    navigate(`/lecturer/attendance/${moduleId}`)
                  }
                >
                  View Attendance <span>→</span>
                </button>

                <button
                  type="button"
                  className="ls-button ls-button-yellow"
                  onClick={() =>
                    navigate(
                      `/lecturer/attendance/${moduleId}/overall`
                    )
                  }
                >
                  Overall Attendance <span>→</span>
                </button>

                <button
                  type="button"
                  className="ls-button ls-button-outline"
                  onClick={() => navigate("/lecturer/modules")}
                >
                  Back to Modules
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="ls-footer">
        <strong>LabGuard</strong>
        <span>Laboratory Management System</span>
      </footer>
    </div>
  );
}

export default LecturerStudents;
