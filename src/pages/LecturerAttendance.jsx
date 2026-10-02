import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerAttendance() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  const loadAttendance = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `${API_URL}/employee/modules/${moduleId}/attendance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: date
            ? { attendance_date: date }
            : {},
        }
      );

      setAttendance(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to load attendance."
      );
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [moduleId]);

  return (
    <div className="dashboard">
      <header>
        <h1>Attendance Register</h1>

        <button onClick={() => navigate("/lecturer/modules")}>
          Back
        </button>
      </header>

      <main>
        <div>
          <label>Filter by date: </label>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button onClick={loadAttendance}>
            Search
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <table>
          <thead>
            <tr>
              <th>Student Number</th>
              <th>Student Name</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Present</th>
            </tr>
          </thead>

          <tbody>
            {attendance.map((record) => (
              <tr key={record.attendance_id}>
                <td>{record.student_number}</td>
                <td>{record.student_name}</td>
                <td>{record.date}</td>
                <td>{record.time_in}</td>
                <td>{record.time_out || "-"}</td>
                <td>Yes</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default LecturerAttendance;
