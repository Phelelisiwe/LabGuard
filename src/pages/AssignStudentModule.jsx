import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function AssignStudentModule() {
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const assign = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("access_token");

      await axios.post(
        `${API_URL}/student-modules/assign`,
        {
          student_id: Number(studentId),
          module_id: Number(moduleId),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("Student assigned to module successfully.");
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to assign student."
      );
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Assign Student to Module</h1>

        <button onClick={() => navigate("/admin")}>
          Back
        </button>
      </header>

      <main>
        <form onSubmit={assign}>
          <input
            type="number"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />

          <input
            type="number"
            placeholder="Module ID"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
          />

          <button type="submit">
            Assign Student
          </button>
        </form>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}

export default AssignStudentModule;
