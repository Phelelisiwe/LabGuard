import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function StudentCheckIn() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState("");
  const [attendance, setAttendance] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchModules();
    fetchAttendance();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await axios.get(
        "https://labguard-dklp.onrender.com/student/modules",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setModules(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load your modules.");
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(
        "https://labguard-dklp.onrender.com/student/attendance",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAttendance(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load attendance records.");
    }
  };

  const handleCheckIn = async () => {
    if (!selectedModule) {
      setError("Please select a module first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        "https://labguard-dklp.onrender.com/attendance/check-in",
        {
          module_id: Number(selectedModule),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);
      fetchAttendance();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Check-in failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedModule) {
      setError("Please select a module first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        "https://labguard-dklp.onrender.com/attendance/check-out",
        {
          module_id: Number(selectedModule),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);
      fetchAttendance();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Check-out failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-page">

      {/* Header */}
      <header className="attendance-header">

        <div className="attendance-brand">

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


      {/* Main Content */}
      <main className="attendance-main">

        <div className="attendance-title">

          <p>STUDENT PORTAL</p>

          <h2>Lab Attendance</h2>

          <span>
            Record your laboratory attendance by checking in
            and checking out of your selected module.
          </span>

        </div>


        {/* Check In Card */}
        <section className="checkin-card">

          <div className="card-heading">

            <div className="heading-icon">
              ✓
            </div>

            <div>
              <h3>Lab Check-In / Check-Out</h3>
              <p>
                Select the module you are attending.
              </p>
            </div>

          </div>


          {message && (
            <div className="attendance-success">
              {message}
            </div>
          )}

          {error && (
            <div className="attendance-error">
              {error}
            </div>
          )}


          <div className="attendance-form">

            <div className="module-field">

              <label>Module</label>

              <select
                value={selectedModule}
                onChange={(e) =>
                  setSelectedModule(e.target.value)
                }
              >
                <option value="">
                  Select a module
                </option>

                {modules.map((item) => (
                  <option
                    key={item.id || item.module_id}
                    value={item.id || item.module_id}
                  >
                    {item.module_code} - {item.module_name}
                  </option>
                ))}
              </select>

            </div>


            <div className="attendance-actions">

              <button
                className="checkin-button"
                onClick={handleCheckIn}
                disabled={loading}
              >
                ✓ Check In
              </button>

              <button
                className="checkout-button"
                onClick={handleCheckOut}
                disabled={loading}
              >
                ⇥ Check Out
              </button>

            </div>

          </div>

        </section>


        {/* Attendance History */}
        <section className="history-card">

          <div className="history-header">

            <div>
              <h3>My Attendance</h3>
              <p>
                Your laboratory attendance records.
              </p>
            </div>

            <div className="attendance-count">
              {attendance.length} Records
            </div>

          </div>


          <div className="attendance-table-wrapper">

            <table className="attendance-table">

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

                {attendance.length > 0 ? (

                  attendance.map((record) => (

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

                        <span
                          className={
                            record.status === "Present"
                              ? "status-present"
                              : "status-absent"
                          }
                        >
                          {record.status || "Present"}
                        </span>

                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td
                      colSpan="5"
                      className="empty-attendance"
                    >
                      No attendance records found.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>


      {/* Footer */}
      <footer className="attendance-footer">
        <span>LabGuard • Laboratory Management System</span>
        <span>Tshwane University of Technology</span>
      </footer>

    </div>
  );
}

export default StudentCheckIn;
