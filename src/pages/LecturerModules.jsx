import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function LecturerModules() {
  const [modules, setModules] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadModules = async () => {
      try {
        const token = localStorage.getItem("access_token");

        const response = await axios.get(
          `${API_URL}/employee/modules`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setModules(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          "Failed to load modules."
        );
      }
    };

    loadModules();
  }, []);

  return (
    <div className="dashboard">
      <header>
        <h1>My Modules</h1>

        <button onClick={() => navigate("/lecturer")}>
          Back
        </button>
      </header>

      <main>
        {error && <p className="error">{error}</p>}

        {modules.map((module) => (
          <div className="card" key={module.id}>
            <h3>{module.module_code}</h3>
            <p>{module.module_name}</p>

            <button
              onClick={() =>
                navigate(`/lecturer/attendance/${module.id}`)
              }
            >
              View Attendance
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}

export default LecturerModules;