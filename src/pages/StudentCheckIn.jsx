
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { startAuthentication } from "@simplewebauthn/browser";

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

  // =====================================================
  // FINGERPRINT CHECK-IN
  // =====================================================

  const handleFingerprintCheckIn = async () => {
    if (!selectedModule) {
      setError("Please select a module first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Step 1: Ask backend for WebAuthn authentication options
      const optionsResponse = await axios.get(
        "https://labguard-dklp.onrender.com/biometric/attendance/fingerprint/options",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const optionsJSON = optionsResponse.data;

      setMessage(
        "Follow the fingerprint or biometric prompt on your phone."
      );

      // Step 2: Phone/browser performs biometric verification
      const authenticationResponse = await startAuthentication({
        optionsJSON,
      });

      setMessage(
        "Biometric verified by your device. Confirming attendance..."
      );

      // Step 3: Backend verifies the WebAuthn assertion
      const verificationResponse = await axios.post(
        `https://labguard-dklp.onrender.com/biometric/attendance/fingerprint/verify?module_id=${Number(
          selectedModule
        )}`,
        authenticationResponse,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (verificationResponse.data.success) {
        setMessage(
          verificationResponse.data.message ||
            "Fingerprint verified. Attendance recorded successfully."
        );

        await fetchAttendance();
      } else {
        setError(
          verificationResponse.data.message ||
            "Fingerprint verification failed."
        );
        setMessage("");
      }
    } catch (err) {
      console.error(err);

      // User cancelled the phone biometric prompt
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "AbortError"
      ) {
        setError(
          "Biometric verification was cancelled. Attendance was not recorded."
        );
      } else {
        setError(
          err.response?.data?.detail ||
            "Fingerprint verification failed. Attendance was not recorded."
        );
      }

      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CHECK-OUT
  // =====================================================

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
      await fetchAttendance();
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

          <h2>
            Lab Attendance
          </h2>

          <span>
            Verify your identity using a registered
            biometric before recording attendance.
          </span>

        </div>

        {/* Check In Card */}
        <section className="checkin-card">

          <div className="card-heading">

            <div className="heading-icon">
              ✓
            </div>

            <div>
              <h3>
                Lab Check-In / Check-Out
              </h3>

              <p>
                Select the module you are attending
                and verify your identity.
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

              <label>
                Module
              </label>

              <select
                value={selectedModule}
                onChange={(e) =>
                  setSelectedModule(e.target.value)
                }
                disabled={loading}
              >

                <option value="">
                  Select a module
                </option>

                {modules.map((item) => (

                  <option
                    key={item.id || item.module_id}
                    value={item.id || item.module_id}
                  >
                    {item.module_code} -{" "}
                    {item.module_name}
                  </option>

                ))}

              </select>

            </div>

            {/* Biometric Check-In */}
            <div className="attendance-actions">

              <button
                className="checkin-button"
                onClick={handleFingerprintCheckIn}
                disabled={
                  loading || !selectedModule
                }
              >
                {loading
                  ? "Verifying..."
                  : "🖐 Verify Fingerprint & Check In"}
              </button>

              <button
                className="checkout-button"
                onClick={handleCheckOut}
                disabled={
                  loading || !selectedModule
                }
              >
                ⇥ Check Out
              </button>

            </div>

            <div className="biometric-checkin-info">

              <p>
                <strong>Secure biometric verification</strong>
              </p>

              <span>
                Your phone will verify your registered
                fingerprint using secure WebAuthn
                authentication. LabGuard does not receive
                or store your fingerprint image.
              </span>

            </div>

          </div>

        </section>

        {/* Attendance History */}
        <section className="history-card">

          <div className="history-header">

            <div>

              <h3>
                My Attendance
              </h3>

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
                          {record.status ||
                            "Present"}
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

export default StudentCheckIn;
