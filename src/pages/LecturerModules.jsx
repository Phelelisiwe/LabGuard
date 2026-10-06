import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerModules() {
  const [modules, setModules] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const loadModules = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/lecturer/modules`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setModules(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Failed to load your modules."
        );
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, [navigate]);

  const downloadAttendance = async (moduleId, moduleCode) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `${API_URL}/lecturer/modules/${moduleId}/attendance/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");

      link.href = url;
      link.setAttribute(
        "download",
        `${moduleCode}_attendance.csv`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to download attendance."
      );
    }
  };

  const email =
    localStorage.getItem("email") || "Lecturer";

  const initials = email
    .charAt(0)
    .toUpperCase();

  return (
    <div className="modern-modules-page">

      {/* TOP NAVIGATION */}
      <header className="modern-modules-nav">

        <div
          className="modern-brand"
          onClick={() => navigate("/lecturer")}
        >
          <div className="modern-brand-mark">
            LG
          </div>

          <div className="modern-brand-text">
            <strong>LabGuard</strong>
            <span>Lecturer Portal</span>
          </div>
        </div>

        <div className="modern-nav-right">

          <div className="modern-user">

            <div className="modern-user-avatar">
              {initials}
            </div>

            <div className="modern-user-info">
              <strong>Lecturer</strong>
              <span>{email}</span>
            </div>

          </div>

          <button
            className="modern-nav-back"
            onClick={() => navigate("/lecturer")}
          >
            <span>←</span>
            Dashboard
          </button>

        </div>

      </header>


      {/* PAGE CONTENT */}
      <main className="modern-modules-content">

        {/* HEADER */}
        <section className="modern-modules-heading">

          <div>

            <div className="modern-eyebrow">
              <span className="eyebrow-dot"></span>
              LECTURER WORKSPACE
            </div>

            <h1>
              My Modules
            </h1>

            <p>
              Manage your teaching modules, students and
              attendance from one workspace.
            </p>

          </div>

          <div className="module-summary">

            <span className="summary-number">
              {modules.length}
            </span>

            <div>
              <strong>
                Assigned
              </strong>

              <span>
                {modules.length === 1
                  ? "Active module"
                  : "Active modules"}
              </span>
            </div>

          </div>

        </section>


        {/* ERROR */}
        {error && (
          <div className="modern-error">
            <div className="modern-error-icon">
              !
            </div>

            <div>
              <strong>
                Something went wrong
              </strong>

              <p>
                {error}
              </p>
            </div>
          </div>
        )}


        {/* LOADING */}
        {loading && (
          <div className="modern-loading">

            <div className="modern-spinner"></div>

            <div>
              <strong>
                Loading modules
              </strong>

              <span>
                Getting your assigned modules...
              </span>
            </div>

          </div>
        )}


        {/* EMPTY STATE */}
        {!loading &&
          !error &&
          modules.length === 0 && (
            <div className="modern-empty">

              <div className="modern-empty-icon">
                +
              </div>

              <h2>
                No modules assigned
              </h2>

              <p>
                You currently do not have any modules
                assigned to your lecturer account.
              </p>

              <button
                onClick={() => navigate("/lecturer")}
              >
                Return to Dashboard
              </button>

            </div>
          )}


        {/* MODULES */}
        {!loading &&
          modules.length > 0 && (
            <section className="modern-module-section">

              <div className="modern-section-heading">

                <div>
                  <span>
                    YOUR TEACHING MODULES
                  </span>

                  <h2>
                    Assigned Modules
                  </h2>
                </div>

                <div className="module-count">
                  {modules.length}
                </div>

              </div>


              <div className="modern-module-grid">

                {modules.map((module) => (

                  <article
                    className="modern-module-card"
                    key={module.id}
                  >

                    {/* CARD TOP */}
                    <div className="modern-card-top">

                      <div className="modern-module-symbol">
                        <span>▦</span>
                      </div>

                      <div className="modern-module-level">
                        LEVEL {module.level}
                      </div>

                    </div>


                    {/* MODULE INFO */}
                    <div className="modern-module-info">

                      <span className="modern-module-code">
                        {module.module_code}
                      </span>

                      <h3>
                        {module.module_name}
                      </h3>

                      <p>
                        Lecturer module
                      </p>

                    </div>


                    {/* DIVIDER */}
                    <div className="modern-card-divider"></div>


                    {/* MODULE META */}
                    <div className="modern-module-meta">

                      <div className="modern-meta-item">

                        <div className="modern-meta-icon">
                          👥
                        </div>

                        <div>
                          <span>
                            Students
                          </span>

                          <strong>
                            Module class
                          </strong>
                        </div>

                      </div>

                      <div className="modern-meta-item">

                        <div className="modern-meta-icon">
                          ✓
                        </div>

                        <div>
                          <span>
                            Attendance
                          </span>

                          <strong>
                            Track records
                          </strong>
                        </div>

                      </div>

                    </div>


                    {/* PRIMARY ACTION */}
                    <button
                      className="modern-open-module"
                      onClick={() =>
                        navigate(
                          `/lecturer/attendance/${module.id}`
                        )
                      }
                    >
                      <span>
                        Open Module
                      </span>

                      <span className="open-arrow">
                        →
                      </span>
                    </button>


                    {/* SECONDARY ACTIONS */}
                    <div className="modern-module-actions">

                      <button
                        onClick={() =>
                          navigate(
                            `/lecturer/students/${module.id}`
                          )
                        }
                      >
                        <span>👥</span>
                        Students
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/lecturer/attendance/${module.id}`
                          )
                        }
                      >
                        <span>✓</span>
                        Attendance
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/lecturer/attendance/${module.id}/overall`
                          )
                        }
                      >
                        <span>◉</span>
                        Overall
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/lecturer/attendance/${module.id}/prediction`
                          )
                        }
                      >
                        <span>↗</span>
                        Prediction
                      </button>

                    </div>


                    {/* DOWNLOAD */}
                    <button
                      className="modern-download"
                      onClick={() =>
                        downloadAttendance(
                          module.id,
                          module.module_code
                        )
                      }
                    >
                      <span className="download-icon">
                        ↓
                      </span>

                      Download attendance CSV

                      <span className="download-arrow">
                        →
                      </span>
                    </button>

                  </article>

                ))}

              </div>

            </section>
          )}

      </main>


      {/* FOOTER */}
      <footer className="modern-modules-footer">

        <span>
          © 2026 LabGuard
        </span>

        <span>
          Laboratory Management System
        </span>

      </footer>

    </div>
  );
}

export default LecturerModules;