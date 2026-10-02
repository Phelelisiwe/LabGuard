import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function CreateModule() {
  const navigate = useNavigate();

  const [moduleCode, setModuleCode] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [lecturerId, setLecturerId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const createModule = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("access_token");

      await axios.post(
        `${API_URL}/modules/create`,
        {
          module_code: moduleCode,
          module_name: moduleName,
          lecturer_id: Number(lecturerId),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("Module created successfully.");
      setError("");

      setModuleCode("");
      setModuleName("");
      setLecturerId("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to create module."
      );
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Create Module</h1>

        <button onClick={() => navigate("/admin")}>
          Back
        </button>
      </header>

      <main>
        <form onSubmit={createModule}>
          <input
            placeholder="Module Code"
            value={moduleCode}
            onChange={(e) => setModuleCode(e.target.value)}
          />

          <input
            placeholder="Module Name"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
          />

          <input
            type="number"
            placeholder="Lecturer ID"
            value={lecturerId}
            onChange={(e) => setLecturerId(e.target.value)}
          />

          <button type="submit">
            Create Module
          </button>
        </form>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}

export default CreateModule;
