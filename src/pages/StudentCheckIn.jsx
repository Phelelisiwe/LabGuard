import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { startAuthentication } from "@simplewebauthn/browser";
import "./StudentCheckIn.css";

function StudentCheckIn() {
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingClass, setCheckingClass] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "https://labguard-dklp.onrender.com";

  const authHeaders = {
    Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
  };

  useEffect(() => {
    loadActiveClass();
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActiveClass = async () => {
    setCheckingClass(true);
    setActiveClass(null);

    try {
      const response = await axios.get(
        `${API_URL}/attendance-session/student/current`,
        { headers: authHeaders }
      );

      const data = response.data;

      if (data && data.status === "active") {
        setActiveClass(data);
      } else if (data && (data.module_id || data.module_code || data.module_name)) {
        setActiveClass(data);
      } else {
        setActiveClass(null);
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        setActiveClass(null);
      } else {
        console.error("Active class lookup error:", err);
        setError(err.response?.data?.detail || "Could not check the active class.");
      }
    } finally {
      setCheckingClass(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(`${API_URL}/student/attendance`, {
        headers: authHeaders,
      });

      setAttendance(response.data);
    } catch (err) {
      console.error("Load attendance error:", err);
      setError("Could not load attendance records.");
    }
  };

  const handleFingerprintCheckIn = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!activeClass) {
        throw new Error("There is no active class to check in to.");
      }
      if (!navigator.geolocation) {
        throw new Error("Location services are not supported by this browser.");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const optionsResponse = await axios.get(
        `${API_URL}/biometric/attendance/fingerprint/options`,
        { headers: authHeaders }
      );
      const credential = await startAuthentication({
        optionsJSON: optionsResponse.data,
      });
      const response = await axios.post(
        `${API_URL}/biometric/attendance/fingerprint/verify`,
        {
          credential,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        { headers: authHeaders }
      );

      setMessage(response.data.message || "Fingerprint attendance recorded.");
      await Promise.all([loadActiveClass(), fetchAttendance()]);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to verify your fingerprint attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  const activeModuleName =
    activeClass?.module_code ||
    activeClass?.module_name ||
    activeClass?.module?.module_code ||
    activeClass?.module?.module_name ||
    "Active class";

  return (
    <div className="modern-student-dashboard student-page-shell">
      <header className="modern-student-nav">
        <div className="modern-student-brand" onClick={() => navigate("/student")}>
          <div className="modern-student-logo">LG</div>
          <div className="modern-student-brand-text">
            <strong>LabGuard</strong>
            <span>Student Portal</span>
          </div>
        </div>

        <button type="button" className="modern-student-logout" onClick={() => navigate("/student")}>
          <span>←</span>
          Dashboard
        </button>
      </header>

      <main className="modern-student-content student-content-compact">
        <div className="attendance-title">
          <p>STUDENT PORTAL</p>
          <h2>Lab Attendance</h2>
          <span>
            Your registered modules and active class session determine which class you can attend.
          </span>
        </div>

        <section className="checkin-card">
          <div className="card-heading">
            <div className="heading-icon">✓</div>
            <div>
              <h3>Lab Check-In / Check-Out</h3>
              <p>No manual module selection is required.</p>
            </div>
          </div>

          {checkingClass && <div className="attendance-info">Checking for an active class...</div>}

          {!checkingClass && activeClass && (
            <div className="attendance-success">
              <strong>Active class:</strong> {activeModuleName}
              {activeClass.laboratory ? ` — ${activeClass.laboratory}` : ""}
            </div>
          )}

          {!checkingClass && !activeClass && <div className="attendance-error">No class is active now.</div>}

          {message && (
            <div className="attendance-success" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="attendance-error" role="alert">
              {error}
            </div>
          )}

          <div className="attendance-form">
            <div className="biometric-checkin-info">
              <p>
                <strong>Phone fingerprint attendance</strong>
              </p>
              <span>
                Use your phone's fingerprint prompt while within 50 metres of
                the lecturer's saved class location. The first verification
                records check-in and the next records check-out.
              </span>
            </div>

            <button
              type="button"
              className="fingerprint-checkin-button"
              onClick={handleFingerprintCheckIn}
              disabled={loading || checkingClass || !activeClass}
            >
              {loading ? "Verifying..." : "Take attendance with fingerprint"}
            </button>

            <button
              type="button"
              className="back-button"
              onClick={() => {
                setError("");
                setMessage("");
                loadActiveClass();
                fetchAttendance();
              }}
              disabled={loading || checkingClass}
            >
              Refresh Class Status
            </button>
          </div>
        </section>

        <section className="history-card">
          <div className="history-header">
            <div>
              <h3>My Attendance</h3>
              <p>Your laboratory attendance records.</p>
            </div>
            <div className="attendance-count">{attendance.length} Records</div>
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
                    <tr key={record.attendance_id}>
                      <td>
                        <strong>{record.module_code || record.module_name || "Module"}</strong>
                      </td>
                      <td>{record.date || "-"}</td>
                      <td>{record.time_in || "-"}</td>
                      <td>{record.time_out || "-"}</td>
                      <td>
                        <span className={record.status === "Present" ? "status-present" : "status-absent"}>
                          {record.status || "Present"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-attendance">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="modern-student-footer student-footer-compact">
        <span>LabGuard • Laboratory Management System</span>
        <span>Quick attendance access</span>
      </footer>
    </div>
  );
}

export default StudentCheckIn;
