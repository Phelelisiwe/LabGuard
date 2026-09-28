import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function StudentModules() {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);

      const studentResponse = await axios.get(
        "http://127.0.0.1:8000/student/me",
        config
      );

      setStudent(studentResponse.data);

      const modulesResponse = await axios.get(
        "http://127.0.0.1:8000/student/modules",
        config
      );

      setAvailableModules(modulesResponse.data);

      const selectedResponse = await axios.get(
        "http://127.0.0.1:8000/student-modules/",
        config
      );

      setSelectedModules(selectedResponse.data);

    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.detail ||
        "Could not load modules."
      );
    } finally {
      setLoading(false);
    }
  };

  const isSelected = (moduleId) => {
    return selectedModules.some(
      (item) => item.module_id === moduleId
    );
  };

  const selectModule = async (moduleId) => {
    try {
      setMessage("");
      setError("");

      await axios.post(
        "http://127.0.0.1:8000/student-modules/assign",
        null,
        {
          ...config,
          params: {
            module_id: moduleId,
          },
        }
      );

      setMessage("Module selected.");

      const response = await axios.get(
        "http://127.0.0.1:8000/student-modules/",
        config
      );

      setSelectedModules(response.data);

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not select module."
      );
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="simple-modules-page">
        <div className="simple-loading">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="simple-modules-page">

      <div className="simple-modules-container">

        {/* HEADER */}

        <div className="simple-modules-header">

          <div>
            <h1>My Modules</h1>

            {student && (
              <p>
                Level {student.current_year}
              </p>
            )}
          </div>

          <button
            className="simple-logout"
            onClick={logout}
          >
            Logout
          </button>

        </div>


        {/* MESSAGE */}

        {message && (
          <div className="simple-success">
            {message}
          </div>
        )}

        {error && (
          <div className="simple-error">
            {error}
          </div>
        )}


        {/* AVAILABLE MODULES */}

        <section className="simple-section">

          <h2>Available Modules</h2>

          <div className="simple-module-grid">

            {availableModules.map((module) => (

              <div
                className={`simple-module-card ${
                  isSelected(module.id)
                    ? "module-is-selected"
                    : ""
                }`}
                key={module.id}
              >

                <span className="simple-module-code">
                  {module.module_code}
                </span>

                <h3>
                  {module.module_name}
                </h3>

                <p>
                  Lecturer:{" "}
                  {module.lecturer_name || "Not assigned"}
                </p>

                {isSelected(module.id) ? (

                  <button
                    className="simple-selected-button"
                    disabled
                  >
                    Selected
                  </button>

                ) : (

                  <button
                    className="simple-select-button"
                    onClick={() =>
                      selectModule(module.id)
                    }
                  >
                    Select
                  </button>

                )}

              </div>

            ))}

          </div>

          {availableModules.length === 0 && (
            <p className="simple-empty">
              No modules available.
            </p>
          )}

        </section>


        {/* SELECTED MODULES */}

        <section className="simple-section selected-section">

          <h2>My Selected Modules</h2>

          {selectedModules.length === 0 ? (

            <p className="simple-empty">
              No modules selected.
            </p>

          ) : (

            <div className="simple-selected-list">

              {selectedModules.map((assignment) => {

                const module = availableModules.find(
                  (item) =>
                    item.id === assignment.module_id
                );

                return (
                  <div
                    className="simple-selected-item"
                    key={assignment.id}
                  >
                    <div>
                      <strong>
                        {module
                          ? module.module_name
                          : `Module ${assignment.module_id}`}
                      </strong>

                      {module && (
                        <span>
                          {module.module_code}
                        </span>
                      )}
                    </div>

                    <span className="selected-check">
                      ✓
                    </span>
                  </div>
                );
              })}

            </div>

          )}

        </section>


        <footer className="simple-modules-footer">
          LabGuard
        </footer>

      </div>

    </div>
  );
}

export default StudentModules;