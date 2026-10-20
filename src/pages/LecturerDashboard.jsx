
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LecturerDashBoard.css";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerDashboard() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(
    localStorage.getItem("selected_lecturer_module") || ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchModules = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/lecturer/modules`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("LECTURER MODULES RESPONSE:", response.data);
console.log("NUMBER OF MODULES:", response.data?.length);

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.modules || [];

        setModules(data);

        const savedModuleId = localStorage.getItem(
          "selected_lecturer_module"
        );

        const savedModuleExists = data.some(
          (module) => String(module.id) === String(savedModuleId)
        );

        if (savedModuleExists) {
          setSelectedModuleId(String(savedModuleId));
        } else if (data.length === 1) {
          setSelectedModuleId(String(data[0].id));
          localStorage.setItem(
            "selected_lecturer_module",
            String(data[0].id)
          );
        } else {
          setSelectedModuleId("");
          localStorage.removeItem("selected_lecturer_module");
        }
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Unable to load your assigned modules. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [navigate, token]);

  const handleModuleChange = (event) => {
    const moduleId = event.target.value;
    setSelectedModuleId(moduleId);

    if (moduleId) {
      localStorage.setItem("selected_lecturer_module", moduleId);
    } else {
      localStorage.removeItem("selected_lecturer_module");
    }
  };

  const openModulePage = (page) => {
    if (!selectedModuleId) {
      setError("Please select a module first.");
      return;
    }

    setError("");

    const routes = {
      students: `/lecturer/students/${selectedModuleId}`,
      attendance: `/lecturer/attendance/${selectedModuleId}`,
      overall: `/lecturer/attendance/${selectedModuleId}/overall`,
      prediction: `/lecturer/attendance/${selectedModuleId}/prediction`,
    };

    navigate(routes[page]);
  };

  const selectedModule = modules.find(
    (module) => String(module.id) === String(selectedModuleId)
  );

  const lecturerEmail =
    localStorage.getItem("email") || "Lecturer";

  const lecturerInitial = lecturerEmail.charAt(0).toUpperCase();

  return (
    <div className="lecturer-dashboard">
      <aside className="lecturer-sidebar">
        <div className="lecturer-logo">
          <span className="lecturer-logo-icon">L</span>
          <span>LabGuard</span>
        </div>

        <nav className="lecturer-sidebar-nav">
          <button
            className="lecturer-nav-item active"
            onClick={() => navigate("/lecturer")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            className="lecturer-nav-item"
            onClick={() => navigate("/lecturer/modules")}
          >
            <span>▤</span>
            My Modules
          </button>

          <button
            className="lecturer-nav-item"
            onClick={() => navigate("/lecturer/update-information")}
          >
            <span>⚙</span>
            Update Information
          </button>
        </nav>

        <div className="lecturer-sidebar-bottom">
          <div className="lecturer-sidebar-user">
            <div className="lecturer-avatar">{lecturerInitial}</div>
            <div className="lecturer-user-details">
              <strong>Lecturer</strong>
              <span>{lecturerEmail}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="lecturer-main">
        <header className="lecturer-topbar">
          <div>
            <p className="lecturer-eyebrow">LECTURER PORTAL</p>
            <h1>Dashboard</h1>
          </div>

          <div className="lecturer-topbar-profile">
            <div className="lecturer-avatar">{lecturerInitial}</div>
            <span>{lecturerEmail}</span>
          </div>
        </header>

        <section className="lecturer-welcome">
          <div>
            <p className="lecturer-eyebrow">WELCOME BACK</p>
            <h2>Manage your modules</h2>
            <p>
              Choose one of your assigned modules to manage its students
              and attendance records.
            </p>
          </div>
          <div className="lecturer-welcome-icon">▤</div>
        </section>

        {error && (
          <div className="lecturer-error" role="alert">
            {error}
          </div>
        )}

        <section className="lecturer-module-panel">
          <div className="lecturer-section-heading">
            <div>
              <h2>Select a Module</h2>
              <p>
                {loading
                  ? "Loading your assigned modules..."
                  : `${modules.length} assigned module${modules.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="lecturer-state">
              <div className="lecturer-spinner" />
              <p>Loading modules...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="lecturer-state">
              <div className="lecturer-empty-icon">▤</div>
              <h3>No modules assigned</h3>
              <p>
                Your assigned modules will appear here. Contact the
                administrator if you believe this is incorrect.
              </p>
              <button
                className="lecturer-secondary-button"
                onClick={() => navigate("/lecturer/modules")}
              >
                View My Modules
              </button>
            </div>
          ) : (
            <>
              <label
                className="lecturer-field-label"
                htmlFor="lecturer-module-select"
              >
                Choose your module
              </label>

              <select
                id="lecturer-module-select"
                className="lecturer-module-select"
                value={selectedModuleId}
                onChange={handleModuleChange}
              >
                <option value="">-- Select a module --</option>

                {modules.map((module) => (
                  <option key={module.id} value={String(module.id)}>
                    {module.module_code} — {module.module_name}
                    {module.level ? ` (Level ${module.level})` : ""}
                  </option>
                ))}
              </select>

              {selectedModule && (
                <div className="lecturer-selected-module">
                  <div className="lecturer-selected-module-icon">▤</div>
                  <div>
                    <p className="lecturer-eyebrow">SELECTED MODULE</p>
                    <h3>{selectedModule.module_code}</h3>
                    <p>{selectedModule.module_name}</p>
                    {selectedModule.level && (
                      <span className="lecturer-level-tag">
                        Level {selectedModule.level}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="lecturer-section-heading lecturer-actions-heading">
                <div>
                  <h2>Module Management</h2>
                  <p>
                    Select a module above to open its records and reports.
                  </p>
                </div>
              </div>

              <div className="lecturer-action-grid">
                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("students")}
                >
                  <span className="lecturer-action-icon students-icon">
                    ♙
                  </span>
                  <span className="lecturer-action-title">
                    Student Records
                  </span>
                  <span className="lecturer-action-description">
                    View students registered for this module.
                  </span>
                  <span className="lecturer-action-link">
                    Open records →
                  </span>
                </button>

                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("attendance")}
                >
                  <span className="lecturer-action-icon attendance-icon">
                    ✓
                  </span>
                  <span className="lecturer-action-title">
                    Attendance Register
                  </span>
                  <span className="lecturer-action-description">
                    View attendance records for this module.
                  </span>
                  <span className="lecturer-action-link">
                    View attendance →
                  </span>
                </button>

                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("overall")}
                >
                  <span className="lecturer-action-icon overall-icon">
                    ▥
                  </span>
                  <span className="lecturer-action-title">
                    Overall Attendance
                  </span>
                  <span className="lecturer-action-description">
                    Review overall attendance for this module.
                  </span>
                  <span className="lecturer-action-link">
                    View overview →
                  </span>
                </button>

                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("prediction")}
                >
                  <span className="lecturer-action-icon prediction-icon">
                    ↗
                  </span>
                  <span className="lecturer-action-title">
                    Attendance Predictions
                  </span>
                  <span className="lecturer-action-description">
                    Open the module's attendance prediction page.
                  </span>
                  <span className="lecturer-action-link">
                    View predictions →
                  </span>
                </button>
              </div>

              <div className="lecturer-module-footer">
                <span>
                  {selectedModule
                    ? `Managing: ${selectedModule.module_code}`
                    : "No module selected"}
                </span>

                <button
                  className="lecturer-secondary-button"
                  disabled={!selectedModuleId}
                  onClick={() => navigate("/lecturer/modules")}
                >
                  View All Modules
                </button>
              </div>
            </>
          )}
        </section>

        <footer className="lecturer-footer">
          © 2026 LabGuard. All rights reserved.
        </footer>
      </main>
    </div>
  );
}

export default LecturerDashboard;
