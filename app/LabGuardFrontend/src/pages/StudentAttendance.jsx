import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function StudentAttendance() {
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/student/attendance",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAttendance(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load your attendance records.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-attendance-page">

      {/* Header */}
      <header className="student-attendance-header">

        <div className="student-attendance-brand">

          <div className="tut-logo">
            TUT
          </div>

          <div className="brand-line"></div>

          <div>
            <h1>LabGuard</h1>
            <span>Laboratory Management System</span>
          </div>

        </div>

        <button
          className="attendance-back-button"
          onClick={() => navigate("/student")}
        >
          ← Back
        </button>

      </header>


      {/* Main */}
      <main className="student-attendance-main">

        <div className="student-attendance-title">

          <p>STUDENT PORTAL</p>

          <h2>My Attendance</h2>

          <span>
            View your laboratory attendance records and
            check-in history.
          </span>

        </div>


        {/* Attendance Card */}
        <section className="student-attendance-card">

          <div className="student-attendance-card-header">

            <div>

              <h3>Attendance Records</h3>

              <p>
                Your laboratory attendance history.
              </p>

            </div>

            <div className="attendance-record-count">
              {attendance.length} Records
            </div>

          </div>


          {loading && (
            <div className="student-attendance-message">
              Loading attendance records...
            </div>
          )}


          {error && (
            <div className="student-attendance-error">
              {error}
            </div>
          )}


          {!loading && !error && attendance.length === 0 && (
            <div className="student-no-attendance">

              <div className="attendance-empty-icon">
                📊
              </div>

              <h3>No Attendance Records</h3>

              <p>
                You do not have any laboratory attendance
                records yet.
              </p>

              <button
                onClick={() => navigate("/student/check-in")}
              >
                Go to Lab Attendance
              </button>

            </div>
          )}


          {!loading && attendance.length > 0 && (

            <div className="student-attendance-table-wrapper">

              <table className="student-attendance-table">

                <thead>

                  <tr>
                    <th>Module</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Status</th>
                  </tr>

                </thead>

                <tbody>

                  {attendance.map((record) => (

                    <tr key={record.id}>

                      <td>
                        <strong>
                          {record.module_code ||
                            record.module_name ||
                            "Module"}
                        </strong>
                      </td>

                      <td>
                        {record.date || "-"}
                      </td>

                      <td>
                        {record.time_in || "-"}
                      </td>

                      <td>
                        {record.time_out || "-"}
                      </td>

                      <td>

                        <span className="student-present-status">
                          {record.status || "Present"}
                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>


        {/* Quick Action */}
        <div className="student-attendance-actions">

          <button
            className="go-checkin-button"
            onClick={() => navigate("/student/check-in")}
          >
            Lab Check-In / Check-Out
          </button>

          <button
            className="attendance-dashboard-button"
            onClick={() => navigate("/student")}
          >
            Back to Dashboard
          </button>

        </div>

      </main>


      {/* Footer */}
      <footer className="student-attendance-footer">

        <span>
          LabGuard • Laboratory Management System
        </span>

        <span>
          Tshwane University of Technology
        </span>

      </footer>

    </div>
  );
}

export default StudentAttendance;