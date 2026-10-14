
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function LecturerDashboard() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");

  const email = localStorage.getItem("email") || "Lecturer";
  const initials = email.charAt(0).toUpperCase();

  const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  // Authenticated API requests
  const sessionRequest = async (endpoint, method = "GET", body) => {
    const token = getToken();

    if (!token) {
      throw new Error("Please log in again. Your login token was not found.");
    }

    const response = await fetch(
      `${API_URL}/attendance-session/${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {}),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "The attendance session request failed."
      );
    }

    return data;
  };

  // Load current session
  const refreshSession = useCallback(async () => {
    setSessionLoading(true);

    try {
      const data = await sessionRequest("current");
      setSession(data.active ? data : null);
      setSessionMessage("");
    } catch (error) {
      setSessionMessage(error.message);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Request the lecturer's current GPS location
  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("Your browser does not support location services.")
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          const messages = {
            1: "Location permission was denied. Allow location access in your browser and try again.",
            2: "Your location could not be determined. Check your device location settings and try again.",
            3: "Location request timed out. Please try again.",
          };

          reject(
            new Error(
              messages[error.code] ||
                "Could not obtain your location. Please try again."
            )
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });

  // Start a session using GPS
  const startSession = async () => {
    setSessionBusy(true);
    setSessionMessage("");

    try {
      const location = await getCurrentLocation();

      const data = await sessionRequest(
        "start",
        "POST",
        location
      );

      if (data.multiple_classes) {
        setSessionMessage(
          "More than one class is scheduled at this time. Please resolve the class selection before starting a session."
        );
        return;
      }

      if (!data.success) {
        setSessionMessage(
          data.message || "The attendance session could not be started."
        );
        return;
      }

      // Refresh from the backend to obtain the authoritative session.
      await refreshSession();

      setSessionMessage(
        data.already_active
          ? "Your attendance session is already active."
          : data.message || "Attendance session started successfully."
      );
    } catch (error) {
      setSessionMessage(error.message);
    } finally {
      setSessionBusy(false);
    }
  };

  // Close the active session
  const stopSession = async () => {
    if (
      !window.confirm(
        "Are you sure you want to stop the attendance session?"
      )
    ) {
      return;
    }

    setSessionBusy(true);
    setSessionMessage("");

    try {
      const data = await sessionRequest("close", "POST");
      setSession(null);
      setSessionMessage(
        data.message || "Attendance session closed successfully."
      );
    } catch (error) {
      setSessionMessage(error.message);
    } finally {
      setSessionBusy(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="modern-lecturer-dashboard">
      {/* NAVIGATION */}
      <header className="modern-dashboard-nav">
        <div
          className="modern-dashboard-brand"
          onClick={() => navigate("/lecturer")}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              navigate("/lecturer");
            }
          }}
        >
          <div className="modern-dashboard-logo">LG</div>
          <div className="modern-dashboard-brand-text">
            <strong>LabGuard</strong>
            <span>Lecturer Portal</span>
          </div>
        </div>

        <div className="modern-dashboard-nav-right">
          <div className="modern-dashboard-user">
            <div className="modern-dashboard-avatar">{initials}</div>
            <div className="modern-dashboard-user-info">
              <strong>Lecturer</strong>
              <span>{email}</span>
            </div>
          </div>

          <button
            className="modern-dashboard-logout"
            onClick={logout}
          >
            <span>↪</span> Logout
          </button>
        </div>
      </header>

      <main className="modern-dashboard-content">
        {/* WELCOME */}
        <section className="modern-dashboard-welcome">
          <div className="modern-dashboard-welcome-text">
            <div className="modern-dashboard-eyebrow">
              <span></span> LECTURER WORKSPACE
            </div>
            <h1>Welcome back</h1>
            <p>
              Manage your modules and monitor student attendance
              from one place.
            </p>
          </div>

          <button
            className="modern-dashboard-primary"
            onClick={() => navigate("/lecturer/modules")}
          >
            View My Modules
            <span className="modern-dashboard-arrow">→</span>
          </button>
        </section>

        {/* ATTENDANCE SESSION */}
        <section className="modern-dashboard-section">
          <div className="modern-dashboard-section-heading">
            <div>
              <span>CLASS MANAGEMENT</span>
              <h2>Attendance Session</h2>
            </div>

            {!sessionLoading && (
              <div className="modern-workflow-status">
                <span></span>
                {session ? "Session active" : "No active session"}
              </div>
            )}
          </div>

          <div className="modern-dashboard-tool">
            <div className="modern-tool-content">
              <span className="modern-tool-label">
                {session ? "SESSION IN PROGRESS" : "SESSION CONTROL"}
              </span>

              <h3>
                {session
                  ? "Your class is open"
                  : "Manage class attendance"}
              </h3>

              {sessionLoading ? (
                <p>Checking your attendance session...</p>
              ) : session ? (
                <>
                  <p>
                    <strong>Module:</strong>{" "}
                    {session.module_code || session.module_id || "Not available"}
                  </p>

                  {session.module_name && (
                    <p>
                      <strong>Module name:</strong> {session.module_name}
                    </p>
                  )}

                  <p>
                    <strong>Laboratory:</strong>{" "}
                    {session.laboratory || "Not specified"}
                  </p>

                  {session.opened_at && (
                    <p>
                      <strong>Started:</strong> {session.opened_at}
                    </p>
                  )}

                  <button
                    type="button"
                    className="modern-dashboard-logout"
                    onClick={stopSession}
                    disabled={sessionBusy}
                  >
                    {sessionBusy ? "Please wait..." : "Stop Session"}
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Start your scheduled class and allow location
                    access. The location will be saved for the
                    website backup attendance method. ESP32 fingerprint
                    attendance remains available separately.
                  </p>

                  <button
                    type="button"
                    className="modern-dashboard-primary"
                    onClick={startSession}
                    disabled={sessionBusy}
                  >
                    {sessionBusy
                      ? "Getting location..."
                      : "Start Session"}
                    <span className="modern-dashboard-arrow">→</span>
                  </button>
                </>
              )}

              {sessionMessage && (
                <p role="status" aria-live="polite">
                  {sessionMessage}
                </p>
              )}

              {!sessionLoading && (
                <button
                  type="button"
                  className="modern-dashboard-view-all"
                  onClick={refreshSession}
                  disabled={sessionBusy}
                >
                  Refresh session status <span>↻</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* QUICK ACCESS */}
        <section className="modern-dashboard-section">
          <div className="modern-dashboard-section-heading">
            <div>
              <span>LECTURER TOOLS</span>
              <h2>Quick access</h2>
            </div>
            <button
              className="modern-dashboard-view-all"
              onClick={() => navigate("/lecturer/modules")}
            >
              View all <span>→</span>
            </button>
          </div>

          <div className="modern-dashboard-tools">
            {[
              {
                icon: "▦",
                color: "blue",
                label: "MODULES",
                title: "My Modules",
                description: "View your assigned teaching modules.",
              },
              {
                icon: "✓",
                color: "yellow",
                label: "ATTENDANCE",
                title: "Attendance",
                description: "Review attendance records by module.",
              },
              {
                icon: "👥",
                color: "green",
                label: "STUDENTS",
                title: "Student Records",
                description: "View students registered in your modules.",
              },
              {
                icon: "↗",
                color: "purple",
                label: "INSIGHTS",
                title: "Attendance Prediction",
                description: "View attendance predictions for your modules.",
              },
            ].map((tool) => (
              <button
                key={tool.title}
                className="modern-dashboard-tool"
                onClick={() => navigate("/lecturer/modules")}
              >
                <div className={`modern-tool-icon ${tool.color}`}>
                  {tool.icon}
                </div>
                <div className="modern-tool-content">
                  <span className="modern-tool-label">{tool.label}</span>
                  <h3>{tool.title}</h3>
                  <p>{tool.description}</p>
                </div>
                <span className="modern-tool-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="modern-dashboard-workflow">
          <div className="modern-dashboard-workflow-heading">
            <div>
              <span>ATTENDANCE WORKFLOW</span>
              <h2>From module to insight</h2>
            </div>
            <div className="modern-workflow-status">
              <span></span> System ready
            </div>
          </div>

          <div className="modern-workflow-grid">
            {[
              ["01", "Choose a module", "Open one of your assigned modules."],
              ["02", "Review attendance", "Check student attendance and class records."],
              ["03", "Analyse results", "Review results and attendance predictions."],
            ].map(([number, title, description], index) => (
              <div key={number} className="modern-workflow-step">
                <div className="modern-step-number">{number}</div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ACCOUNT */}
        <section className="modern-dashboard-account">
          <div>
            <span>ACCOUNT</span>
            <h2>Manage your lecturer profile</h2>
            <p>Keep your personal and account information up to date.</p>
          </div>
          <button
            className="modern-dashboard-secondary"
            onClick={() => navigate("/update-information")}
          >
            Update Information <span>→</span>
          </button>
        </section>
      </main>

      <footer className="modern-dashboard-footer">
        <span>© 2026 LabGuard</span>
        <span>Lecturer Portal</span>
      </footer>
    </div>
  );
}

export default LecturerDashboard;
