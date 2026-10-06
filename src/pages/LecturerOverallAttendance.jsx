import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerOverallAttendance() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverallAttendance = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/lecturer/modules/${moduleId}/attendance/overall`,
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
            "Failed to load overall attendance."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOverallAttendance();
  }, [moduleId, navigate]);

  return (
    <div className="overall-page">

      {/* HEADER */}
      <header className="overall-header">
        <div>
          <span className="overall-label">
            LECTURER PORTAL
          </span>

          <h1>Overall Attendance</h1>

          <p>
            {data?.module?.module_code || "Module"}{" "}
            {data?.module?.module_name || ""}
          </p>
        </div>

        <button
          className="overall-back-button"
          onClick={() => navigate("/lecturer/modules")}
        >
          ← Back to Modules
        </button>
      </header>


      <main className="overall-content">

        {/* LOADING */}
        {loading && (
          <div className="overall-message">
            <div className="overall-loading">⟳</div>

            <h2>Calculating Attendance</h2>

            <p>
              Please wait while the attendance information is loaded.
            </p>
          </div>
        )}


        {/* ERROR */}
        {error && (
          <div className="overall-error">
            <strong>Unable to load attendance</strong>
            <p>{error}</p>
          </div>
        )}


        {!loading && !error && data && (
          <>

            {/* MODULE SUMMARY */}
            <section className="overall-module">

              <div className="overall-module-icon">
                %
              </div>

              <div className="overall-module-info">

                <span>ATTENDANCE OVERVIEW</span>

                <h2>
                  {data.module.module_code}
                </h2>

                <p>
                  {data.module.module_name}
                </p>

              </div>

              <div className="overall-main-rate">

                <strong>
                  {data.overall_attendance_rate}%
                </strong>

                <span>
                  Overall Attendance
                </span>

              </div>

            </section>


            {/* STATISTICS */}
            <section className="overall-stats">

              <div className="overall-stat students">
                <div className="overall-stat-icon">
                  👥
                </div>

                <div>
                  <span>Total Students</span>
                  <strong>{data.total_students}</strong>
                </div>
              </div>


              <div className="overall-stat classes">
                <div className="overall-stat-icon">
                  📅
                </div>

                <div>
                  <span>Classes Held</span>
                  <strong>{data.classes_held}</strong>
                </div>
              </div>


              <div className="overall-stat present">
                <div className="overall-stat-icon">
                  ✓
                </div>

                <div>
                  <span>Present Records</span>
                  <strong>{data.total_present_records}</strong>
                </div>
              </div>


              <div className="overall-stat rate">
                <div className="overall-stat-icon">
                  %
                </div>

                <div>
                  <span>Attendance Rate</span>
                  <strong>
                    {data.overall_attendance_rate}%
                  </strong>
                </div>
              </div>

            </section>


            {/* STUDENT TABLE */}
            <section className="overall-table-card">

              <div className="overall-table-heading">

                <div>
                  <span>STUDENT PERFORMANCE</span>

                  <h2>
                    Student Attendance
                  </h2>

                  <p>
                    Attendance performance for students
                    registered for this module.
                  </p>
                </div>

                <div className="overall-student-count">
                  {data.total_students} Students
                </div>

              </div>


              {data.students.length === 0 ? (

                <div className="overall-empty">

                  <div>👥</div>

                  <h3>
                    No Students Registered
                  </h3>

                  <p>
                    There are currently no students
                    registered for this module.
                  </p>

                </div>

              ) : (

                <div className="overall-table-wrapper">

                  <table className="overall-table">

                    <thead>
                      <tr>
                        <th>Student Number</th>
                        <th>Student</th>
                        <th>Attended</th>
                        <th>Missed</th>
                        <th>Attendance Rate</th>
                      </tr>
                    </thead>

                    <tbody>

                      {data.students.map((student) => {

                        const rate = Math.min(
                          Math.max(
                            Number(student.attendance_rate) || 0,
                            0
                          ),
                          100
                        );

                        return (
                          <tr key={student.student_id}>

                            <td>
                              <span className="overall-student-number">
                                {student.student_number}
                              </span>
                            </td>

                            <td>
                              <div className="overall-student-name">

                                <div className="overall-avatar">
                                  {student.student_name
                                    ?.charAt(0)
                                    .toUpperCase()}
                                </div>

                                <strong>
                                  {student.student_name}
                                </strong>

                              </div>
                            </td>

                            <td>
                              <span className="overall-attended">
                                {student.classes_attended}
                              </span>
                            </td>

                            <td>
                              <span className="overall-missed">
                                {student.classes_missed}
                              </span>
                            </td>

                            <td>

                              <div className="overall-rate">

                                <div className="overall-bar">
                                  <div
                                    className="overall-bar-fill"
                                    style={{
                                      width: `${rate}%`,
                                    }}
                                  />
                                </div>

                                <strong>
                                  {student.attendance_rate}%
                                </strong>

                              </div>

                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>

                </div>
              )}

            </section>

          </>
        )}

      </main>


      <footer className="overall-footer">
        <strong>LabGuard</strong>
        <span>Laboratory Management System</span>
      </footer>

    </div>
  );
}

export default LecturerOverallAttendance;