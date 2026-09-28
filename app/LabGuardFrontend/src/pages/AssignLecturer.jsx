const API_URL = import.meta.env.VITE_API_URL;
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AssignLecturer() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [lecturers, setLecturers] = useState([]);

  const [selectedModule, setSelectedModule] = useState("");
  const [selectedLecturer, setSelectedLecturer] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
const [modulesResponse, employeesResponse] = await Promise.all([
  axios.get(
    `${API_URL}/admin/modules`,
    config
  ),
  axios.get(
    `${API_URL}/admin/employees`,
    config
  ),
]);

setModules(modulesResponse.data);

      setModules(modulesResponse.data);

      // Only show employees whose role is Lecturer
      const lecturerEmployees = employeesResponse.data.filter(
        (employee) => employee.role === "Lecturer"
      );

      setLecturers(lecturerEmployees);

    } catch (err) {
      console.error(err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail.map((item) => item.msg).join(", ")
        );
      } else {
        setError(
          typeof detail === "string"
            ? detail
            : "Failed to load modules and lecturers."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!selectedModule || !selectedLecturer) {
      setError("Please select a module and a lecturer.");
      return;
    }

    try {
      const response = await axios.put(
        `http://127.0.0.1:8000/admin/modules/${selectedModule}/assign-lecturer`,
        null,
        {
          params: {
            lecturer_id: selectedLecturer,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);

      // Refresh module list so the new lecturer appears
      await fetchData();

      setSelectedModule("");
      setSelectedLecturer("");

    } catch (err) {
      console.error(err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail.map((item) => item.msg).join(", ")
        );
      } else {
        setError(
          typeof detail === "string"
            ? detail
            : "Failed to assign lecturer."
        );
      }
    }
  };

  return (
    <div className="admin-page">

      <nav className="admin-navbar">

        <div className="admin-logo">
          LabGuard
        </div>

        <button
          className="logout-button"
          onClick={() => navigate("/admin")}
        >
          Back
        </button>

      </nav>

      <main className="admin-content">

        <div className="admin-header">

          <h1>Assign Lecturer</h1>

          <p>
            Assign a lecturer to a module they teach.
          </p>

        </div>

        {loading ? (
          <p>Loading modules and lecturers...</p>
        ) : (
          <div className="admin-card">

            <form onSubmit={handleAssign}>

              <div className="form-group">

                <label>
                  Select Module
                </label>

                <select
                  value={selectedModule}
                  onChange={(e) =>
                    setSelectedModule(e.target.value)
                  }
                  required
                >
                  <option value="">
                    -- Select Module --
                  </option>

                  {modules.map((module) => (
                    <option
                      key={module.id}
                      value={module.id}
                    >
                      {module.module_code} -{" "}
                      {module.module_name}
                      {" "} (Level {module.level})
                    </option>
                  ))}

                </select>

              </div>

              <div className="form-group">

                <label>
                  Select Lecturer
                </label>

                <select
                  value={selectedLecturer}
                  onChange={(e) =>
                    setSelectedLecturer(e.target.value)
                  }
                  required
                >
                  <option value="">
                    -- Select Lecturer --
                  </option>

                  {lecturers.map((lecturer) => (
                    <option
                      key={lecturer.id}
                      value={lecturer.id}
                    >
                      {lecturer.first_name}{" "}
                      {lecturer.last_name}
                      {" "} ({lecturer.employee_number})
                    </option>
                  ))}

                </select>

              </div>

              {error && (
                <p className="error-message">
                  {error}
                </p>
              )}

              {message && (
                <p className="success-message">
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="dashboard-button"
              >
                Assign Lecturer
              </button>

            </form>

          </div>
        )}

        {!loading && modules.length > 0 && (
          <div className="admin-card">

            <h2>Current Module Assignments</h2>

            {modules.map((module) => (
              <div
                key={module.id}
                style={{
                  padding: "12px 0",
                  borderBottom: "1px solid #ddd"
                }}
              >
                <strong>
                  {module.module_code}
                </strong>{" "}
                - {module.module_name}

                <br />

                <span>
                  Lecturer:{" "}
                  {module.lecturer_name || "Not assigned"}
                </span>

              </div>
            ))}

          </div>
        )}

      </main>

    </div>
  );
}

export default AssignLecturer;

