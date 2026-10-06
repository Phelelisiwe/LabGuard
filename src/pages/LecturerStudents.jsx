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
    <div className="dashboard lecturer-page">

      {/* HEADER */}
      <header className="lecturer-page-header">

        <div className="page-heading">

          <span className="page-label">
            LECTURER PORTAL
          </span>

          <h1>
            {data?.module?.module_code || "Module"} Students
          </h1>

          <p>
            {data?.module?.module_name ||
              "Students registered for this module"}
          </p>

        </div>

        <button
          className="back-button"
          onClick={() => navigate("/lecturer/modules")}
        >
          ← Back to Modules
        </button>

      </header>


      {/* MAIN */}
      <main className="lecturer-page-content">

        {/* LOADING */}
        {loading && (
          <div className="status-card">
            <div className="loading-icon">
              ⟳
            </div>

            <h2>
              Loading Students
            </h2>

            <p>
              Please wait while the student list is loaded.
            </p>
          </div>
        )}


        {/* ERROR */}
        {error && (
          <div className="error-card">

            <div className="error-icon">
              !
            </div>

            <div>
              <h3>
                Unable to Load Students
              </h3>

              <p>
                {error}
              </p>
            </div>

          </div>
        )}


        {/* CONTENT */}
        {!loading && !error && data && (
          <>

            {/* MODULE INTRO */}
            <section className="module-hero-card">

              <div className="module-hero-icon">
                👨‍🎓
              </div>

              <div className="module-hero-text">

                <span>
                  MODULE STUDENTS
                </span>

                <h2>
                  {data.module.module_code}
                </h2>

                <p>
                  {data.module.module_name}
                </p>

              </div>

              <div className="student-total">

                <strong>
                  {data.total_students}
                </strong>

                <span>
                  Students
                </span>

              </div>

            </section>


            {/* STUDENT LIST */}
            <section className="students-section">

              <div className="section-heading">

                <div>
                  <span>
                    REGISTERED STUDENTS
                  </span>

                  <h2>
                    Student List
                  </h2>

                  <p>
                    Students currently registered for this module.
                  </p>
                </div>

                <div className="student-count-badge">
                  {data.total_students} Registered
                </div>

              </div>


              {data.students.length === 0 ? (

                <div className="empty-students">

                  <div className="empty-icon">
                    👥
                  </div>

                  <h3>
                    No Students Registered
                  </h3>

                  <p>
                    There are currently no students registered
                    for this module.
                  </p>

                </div>

              ) : (

                <div className="student-table-wrapper">

                  <table className="students-table">

                    <thead>
                      <tr>
                        <th>
                          Student Number
                        </th>

                        <th>
                          Student
                        </th>

                        <th>
                          Course
                        </th>

                        <th>
                          Year
                        </th>

                        <th>
                          Email
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {data.students.map((student) => (

                        <tr key={student.id}>

                          <td>
                            <span className="student-number">
                              {student.student_number}
                            </span>
                          </td>

                          <td>

                            <div className="student-name-cell">

                              <div className="student-avatar">
                                {student.first_name
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {student.first_name}{" "}
                                  {student.last_name}
                                </strong>

                                <small>
                                  Student
                                </small>
                              </div>

                            </div>

                          </td>

                          <td>
                            <span className="course-badge">
                              {student.course}
                            </span>
                          </td>

                          <td>
                            <span className="year-badge">
                              Year {student.current_year}
                            </span>
                          </td>

                          <td>
                            <span className="student-email">
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


            {/* QUICK ACTIONS */}
            <section className="quick-actions-card">

              <div>

                <span>
                  MODULE MANAGEMENT
                </span>

                <h3>
                  Continue Managing This Module
                </h3>

                <p>
                  View attendance records or see the overall
                  attendance performance of your students.
                </p>

              </div>

              <div className="quick-actions-buttons">

                <button
                  onClick={() =>
                    navigate(
                      `/lecturer/attendance/${moduleId}`
                    )
                  }
                >
                  View Attendance
                </button>

                <button
                  onClick={() =>
                    navigate(
                      `/lecturer/attendance/${moduleId}/overall`
                    )
                  }
                >
                  Overall Attendance
                </button>

                <button
                  onClick={() =>
                    navigate("/lecturer/modules")
                  }
                  className="secondary-action"
                >
                  Back to Modules
                </button>

              </div>

            </section>

          </>
        )}

      </main>


      {/* FOOTER */}
      <footer className="lecturer-page-footer">

        <strong>
          LabGuard
        </strong>

        <span>
          Laboratory Management System
        </span>

      </footer>

    </div>
  );
}

export default LecturerStudents;