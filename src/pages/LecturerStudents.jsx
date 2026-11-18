import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./LecturerStudents.css";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerStudents() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");

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
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setData(response.data);
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

    loadStudents();
  }, [moduleId, navigate]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const students = data?.students || [];

    if (!query) return students;

    return students.filter((student) =>
      [
        student.student_number,
        student.first_name,
        student.last_name,
        student.course,
        student.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [data, search]);

  const downloadStudentList = async () => {
    try {
      setDownloading(true);
      setError("");

      const token = localStorage.getItem("access_token");
      const response = await axios.get(
        `${API_URL}/lecturer/modules/${moduleId}/students/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      const moduleCode = data?.module?.module_code || "module";

      link.href = url;
      link.download = `${moduleCode}_students.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to download the student list.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="lecturer-students-page">
      <header className="ls-header">
        <div className="ls-header-text">
          <span className="ls-eyebrow">LECTURER PORTAL</span>
          <h1>{data?.module?.module_code || "Module"} students</h1>
          <p>
            {data?.module?.module_name ||
              "Review students registered for this module."}
          </p>
        </div>

        <button
          type="button"
          className="ls-back-button"
          onClick={() => navigate("/lecturer")}
        >
          <span aria-hidden="true">←</span> Dashboard
        </button>
      </header>

      <main className="ls-content">
        {loading && (
          <section className="ls-records-card ls-status-card" aria-live="polite">
            <div className="ls-spinner" />
            <h2>Loading students</h2>
            <p>Please wait while the module roster is loaded.</p>
          </section>
        )}

        {error && (
          <section className="ls-error-card" role="alert">
            <div className="ls-error-icon">!</div>
            <div>
              <h2>Unable to load students</h2>
              <p>{error}</p>
            </div>
          </section>
        )}

        {!loading && !error && data && (
          <>
            <section className="ls-module-card">
              <div className="ls-module-icon" aria-hidden="true">▤</div>
              <div className="ls-module-info">
                <span className="ls-eyebrow">MODULE ROSTER</span>
                <h2>{data.module.module_code}</h2>
                <p>{data.module.module_name}</p>
              </div>
              <div className="ls-total">
                <strong>{data.total_students}</strong>
                <span>Registered students</span>
              </div>
            </section>

            <section className="ls-records-card">
              <div className="ls-records-header">
                <div className="ls-records-title">
                  <span className="ls-eyebrow">REGISTERED STUDENTS</span>
                  <h2>Student list</h2>
                  <p>
                    Search the module roster or download the complete list as a
                    CSV file.
                  </p>
                </div>
                <button
                  type="button"
                  className="ls-download-button"
                  onClick={downloadStudentList}
                  disabled={downloading}
                >
                  {downloading ? "Preparing list..." : "Download student list"}
                </button>
              </div>

              <div className="ls-roster-toolbar">
                <label htmlFor="student-search">Search students</label>
                <input
                  id="student-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, number, course or email"
                />
                <span>
                  Showing {filteredStudents.length} of {data.total_students}
                </span>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="ls-empty">
                  <div className="ls-empty-icon" aria-hidden="true">⌕</div>
                  <h3>
                    {data.students.length === 0
                      ? "No students registered"
                      : "No students match your search"}
                  </h3>
                  <p>
                    {data.students.length === 0
                      ? "Students registered for this module will appear here."
                      : "Try another name, student number, course or email."}
                  </p>
                </div>
              ) : (
                <div className="ls-table-scroll">
                  <table className="ls-table">
                    <thead>
                      <tr>
                        <th>Student number</th>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Year</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <span className="ls-student-number">
                              {student.student_number}
                            </span>
                          </td>
                          <td>
                            <div className="ls-student-cell">
                              <div className="ls-avatar" aria-hidden="true">
                                {student.first_name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="ls-student-info">
                                <strong>
                                  {student.first_name} {student.last_name}
                                </strong>
                                <small>Student</small>
                              </div>
                            </div>
                          </td>
                          <td><span className="ls-course">{student.course}</span></td>
                          <td><span className="ls-year">Year {student.current_year}</span></td>
                          <td><span className="ls-email">{student.email}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="ls-actions-card">
              <div className="ls-actions-text">
                <span className="ls-eyebrow">MODULE MANAGEMENT</span>
                <h2>Continue managing this module</h2>
                <p>
                  Open the attendance register and choose a day, week, month or
                  semester period to review attendance.
                </p>
              </div>
              <div className="ls-actions">
                <button
                  type="button"
                  className="ls-button ls-button-yellow"
                  onClick={() => navigate(`/lecturer/attendance/${moduleId}`)}
                >
                  View attendance <span aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  className="ls-button ls-button-outline"
                  onClick={() => navigate("/lecturer/modules")}
                >
                  Back to modules
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
