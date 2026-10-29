
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LecturerDashBoard.css";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerDashboard() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(
    localStorage.getItem("selected_lecturer_module") || ""
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendanceStarting, setAttendanceStarting] = useState(false);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationSending, setNotificationSending] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [noticeForm, setNoticeForm] = useState({
    type: "cancelled",
    title: "",
    message: "",
  });

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchModules = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/lecturer/modules`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("LECTURER MODULES RESPONSE:", response.data);
console.log("NUMBER OF MODULES:", response.data?.length);

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.modules || [];

        setModules(data);

        const savedModuleId = localStorage.getItem(
          "selected_lecturer_module"
        );

        const savedModuleExists = data.some(
          (module) => String(module.id) === String(savedModuleId)
        );

        if (savedModuleExists) {
          setSelectedModuleId(String(savedModuleId));
        } else if (data.length === 1) {
          setSelectedModuleId(String(data[0].id));
          localStorage.setItem(
            "selected_lecturer_module",
            String(data[0].id)
          );
        } else {
          setSelectedModuleId("");
          localStorage.removeItem("selected_lecturer_module");
        }
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Unable to load your assigned modules. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [navigate, token]);

  const handleModuleChange = (event) => {
    const moduleId = event.target.value;
    setSelectedModuleId(moduleId);

    if (moduleId) {
      localStorage.setItem("selected_lecturer_module", moduleId);
    } else {
      localStorage.removeItem("selected_lecturer_module");
    }
  };

  const openModulePage = (page) => {
    if (!selectedModuleId) {
      setError("Please select a module first.");
      return;
    }

    setError("");

    const routes = {
      students: `/lecturer/students/${selectedModuleId}`,
      attendance: `/lecturer/attendance/${selectedModuleId}`,
      overall: `/lecturer/attendance/${selectedModuleId}/overall`,
      prediction: `/lecturer/attendance/${selectedModuleId}/prediction`,
    };

    navigate(routes[page]);
  };

  const startAttendance = async (timetableId) => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setAttendanceStarting(true);
      setError("");
      setAttendanceMessage("");

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

      const response = await axios.post(
        `${API_URL}/attendance-session/start`,
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          params: timetableId ? { timetable_id: timetableId } : undefined,
        }
      );

      if (response.data.multiple_classes) {
        setScheduledClasses(response.data.classes || []);
        return;
      }

      const moduleId = String(response.data.module_id);
      localStorage.setItem("selected_lecturer_module", moduleId);
      setSelectedModuleId(moduleId);
      setScheduledClasses([]);
      setAttendanceMessage(
        response.data.already_active
          ? "An attendance session is already active."
          : "Attendance session started. Students can now check in from their phones."
      );
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to start attendance. Check your timetable and try again."
      );
    } finally {
      setAttendanceStarting(false);
    }
  };

  const selectedModule = modules.find(
    (module) => String(module.id) === String(selectedModuleId)
  );

  const lecturerEmail =
    localStorage.getItem("email") || "Lecturer";

  const lecturerInitial = lecturerEmail.charAt(0).toUpperCase();

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (!token || !selectedModuleId) {
        setNotifications([]);
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/lecturer/modules/${selectedModuleId}/notifications`,
          { headers: { Authorization: "Bearer " + token } }
        );
        if (active) setNotifications(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load notifications for this module."
          );
        }
      }
    };

    loadNotifications();
    return () => {
      active = false;
    };
  }, [navigate, selectedModuleId, token]);

  const handleNoticeChange = (event) => {
    const { name, value } = event.target;
    setNoticeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSendNotification = async (event) => {
    event.preventDefault();
    setNotificationMessage("");
    setError("");

    if (!selectedModuleId) {
      setError("Select a module before sending a class alert.");
      return;
    }

    const trimmedTitle = noticeForm.title.trim();
    const trimmedMessage = noticeForm.message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      setError("Add both a title and a message before sending the alert.");
      return;
    }

    try {
      setNotificationSending(true);
      const response = await axios.post(
        `${API_URL}/lecturer/modules/${selectedModuleId}/notifications`,
        {
          type: noticeForm.type,
          title: trimmedTitle,
          message: trimmedMessage,
        },
        { headers: { Authorization: "Bearer " + token } }
      );

      setNotifications((previous) =>
        [response.data.notification, ...previous].slice(0, 20)
      );
      setNoticeForm({ type: "cancelled", title: "", message: "" });

      const { sent, total, failed } = response.data.email_delivery;
      setNotificationMessage(
        failed
          ? `Alert added to the student app. Email delivered to ${sent} of ${total} students.`
          : `Alert sent to ${sent} students by email and added to the student app.`
      );
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }
      setError(
        err.response?.data?.detail || "Unable to send the student notification."
      );
    } finally {
      setNotificationSending(false);
    }
  };

  const notificationSummary = notifications.length
    ? `${notifications.length} recent alert${notifications.length === 1 ? "" : "s"}`
    : "No alerts yet";

  const weeklyAttendance = [78, 84, 72, 90, 88, 94, 92];
  const summaryCards = [
    { label: "Active students", value: "128", note: "+12 this week" },
    { label: "Attendance rate", value: "89%", note: "above target" },
    { label: "Alerts", value: String(notifications.length), note: notifications.length === 1 ? "recent alert" : "recent alerts" },
  ];
  const moduleHealth = [
    { name: "Web Dev", value: 92, color: "blue" },
    { name: "DB Systems", value: 88, color: "gold" },
    { name: "Networking", value: 81, color: "green" },
  ];

  return (
    <main className="lecturer-main">
        <header className="lecturer-topbar">
          <div>
            <p className="lecturer-eyebrow">LECTURER PORTAL</p>
            <h1>Dashboard</h1>
          </div>

          <button
            type="button"
            className="lecturer-start-attendance-button"
            onClick={() => startAttendance()}
            disabled={attendanceStarting}
          >
            {attendanceStarting ? "Starting..." : "Start attendance"}
          </button>

          <div className="lecturer-topbar-profile">
            <div className="lecturer-avatar">{lecturerInitial}</div>
            <span>{lecturerEmail}</span>
          </div>
        </header>

        {attendanceMessage && (
          <div className="lecturer-attendance-message" role="status">
            <span>{attendanceMessage}</span>
            <button
              type="button"
              onClick={() =>
                navigate(`/lecturer/attendance/${selectedModuleId}`)
              }
            >
              Open attendance register
            </button>
          </div>
        )}

        {scheduledClasses.length > 0 && (
          <section className="lecturer-scheduled-class-picker">
            <div>
              <h2>Select a class to start</h2>
              <p>More than one class is scheduled at this time.</p>
            </div>
            <div className="lecturer-scheduled-class-options">
              {scheduledClasses.map((scheduledClass) => {
                const module = modules.find(
                  (item) => item.id === scheduledClass.module_id
                );

                return (
                  <button
                    key={scheduledClass.timetable_id}
                    type="button"
                    onClick={() => startAttendance(scheduledClass.timetable_id)}
                    disabled={attendanceStarting}
                  >
                    <strong>
                      {module?.module_code || `Module ${scheduledClass.module_id}`}
                    </strong>
                    <span>
                      {scheduledClass.start_time}–{scheduledClass.end_time}
                      {" · "}
                      {scheduledClass.laboratory}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="lecturer-welcome">
          <div>
            <p className="lecturer-eyebrow">WELCOME BACK</p>
            <h2>Manage your modules</h2>
            <p>
              Choose one of your assigned modules to manage its students
              and attendance records.
            </p>
          </div>
          <div className="lecturer-welcome-icon">▤</div>
        </section>

        {error && (
          <div className="lecturer-error" role="alert">
            {error}
          </div>
        )}

        <section className="lecturer-analytics">
          <div className="lecturer-analytics-card">
            <div className="lecturer-section-heading compact-heading">
              <div>
                <h2>Attendance Overview</h2>
                <p>Weekly engagement for your classes</p>
              </div>
              <strong>89%</strong>
            </div>

            <div className="lecturer-mini-chart" aria-label="Weekly attendance chart">
              {weeklyAttendance.map((value, index) => (
                <div key={index} className="lecturer-mini-bar-group">
                  <div className="lecturer-mini-bar-track">
                    <div className="lecturer-mini-bar-fill" style={{ height: `${value}%` }} />
                  </div>
                  <span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lecturer-analytics-card">
            <div className="lecturer-section-heading compact-heading">
              <div>
                <h2>Module Health</h2>
                <p>Current participation status</p>
              </div>
            </div>

            <div className="lecturer-progress-list">
              {moduleHealth.map((item) => (
                <div key={item.name} className="lecturer-progress-item">
                  <div className="lecturer-progress-label">
                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="lecturer-progress-track">
                    <div className={`lecturer-progress-fill ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lecturer-stat-grid">
          {summaryCards.map((card) => (
            <div key={card.label} className="lecturer-stat-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </div>
          ))}
        </section>

        <section className="lecturer-module-panel">
          <div className="lecturer-section-heading">
            <div>
              <h2>Select a Module</h2>
              <p>
                {loading
                  ? "Loading your assigned modules..."
                  : `${modules.length} assigned module${modules.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="lecturer-state">
              <div className="lecturer-spinner" />
              <p>Loading modules...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="lecturer-state">
              <div className="lecturer-empty-icon">▤</div>
              <h3>No modules assigned</h3>
              <p>
                Your assigned modules will appear here. Contact the
                administrator if you believe this is incorrect.
              </p>
              <button
                className="lecturer-secondary-button"
                onClick={() => navigate("/lecturer/modules")}
              >
                View My Modules
              </button>
            </div>
          ) : (
            <>
              <label
                className="lecturer-field-label"
                htmlFor="lecturer-module-select"
              >
                Choose your module
              </label>

              <select
                id="lecturer-module-select"
                className="lecturer-module-select"
                value={selectedModuleId}
                onChange={handleModuleChange}
              >
                <option value="">-- Select a module --</option>

                {modules.map((module) => (
                  <option key={module.id} value={String(module.id)}>
                    {module.module_code} — {module.module_name}
                    {module.level ? ` (Level ${module.level})` : ""}
                  </option>
                ))}
              </select>

              {selectedModule && (
                <div className="lecturer-selected-module">
                  <div className="lecturer-selected-module-icon">▤</div>
                  <div>
                    <p className="lecturer-eyebrow">SELECTED MODULE</p>
                    <h3>{selectedModule.module_code}</h3>
                    <p>{selectedModule.module_name}</p>
                    {selectedModule.level && (
                      <span className="lecturer-level-tag">
                        Level {selectedModule.level}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="lecturer-section-heading lecturer-actions-heading">
                <div>
                  <h2>Module Management</h2>
                  <p>
                    Select a module above to open its records and reports.
                  </p>
                </div>
              </div>

              <div className="lecturer-action-grid">
                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("students")}
                >
                  <span className="lecturer-action-icon students-icon">
                    ♙
                  </span>
                  <span className="lecturer-action-title">
                    Student Records
                  </span>
                  <span className="lecturer-action-description">
                    View students registered for this module.
                  </span>
                  <span className="lecturer-action-link">
                    Open records →
                  </span>
                </button>

                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("attendance")}
                >
                  <span className="lecturer-action-icon attendance-icon">
                    ✓
                  </span>
                  <span className="lecturer-action-title">
                    Attendance Register
                  </span>
                  <span className="lecturer-action-description">
                    View attendance records for this module.
                  </span>
                  <span className="lecturer-action-link">
                    View attendance →
                  </span>
                </button>

                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("overall")}
                >
                  <span className="lecturer-action-icon overall-icon">
                    ▥
                  </span>
                  <span className="lecturer-action-title">
                    Overall Attendance
                  </span>
                  <span className="lecturer-action-description">
                    Review overall attendance for this module.
                  </span>
                  <span className="lecturer-action-link">
                    View overview →
                  </span>
                </button>

                <button
                  className="lecturer-action-card"
                  disabled={!selectedModuleId}
                  onClick={() => openModulePage("prediction")}
                >
                  <span className="lecturer-action-icon prediction-icon">
                    ↗
                  </span>
                  <span className="lecturer-action-title">
                    Attendance Predictions
                  </span>
                  <span className="lecturer-action-description">
                    Open the module's attendance prediction page.
                  </span>
                  <span className="lecturer-action-link">
                    View predictions →
                  </span>
                </button>
              </div>

              <div className="lecturer-module-footer">
                <span>
                  {selectedModule
                    ? `Managing: ${selectedModule.module_code}`
                    : "No module selected"}
                </span>

                <button
                  className="lecturer-secondary-button"
                  disabled={!selectedModuleId}
                  onClick={() => navigate("/lecturer/modules")}
                >
                  View All Modules
                </button>
              </div>
            </>
          )}
        </section>

        <section className="lecturer-notification-panel">
          <div className="lecturer-section-heading">
            <div>
              <h2>Send Student Notification</h2>
              <p>{notificationSummary}</p>
            </div>
          </div>

          <div className="lecturer-notification-layout">
            <form className="lecturer-notification-form" onSubmit={handleSendNotification}>
              <div className="lecturer-form-row">
                <label htmlFor="notice-type">Notification type</label>
                <select
                  id="notice-type"
                  name="type"
                  value={noticeForm.type}
                  onChange={handleNoticeChange}
                >
                  <option value="cancelled">Class cancelled</option>
                  <option value="late">Running late</option>
                </select>
              </div>

              <div className="lecturer-form-row">
                <label htmlFor="notice-title">Title</label>
                <input
                  id="notice-title"
                  name="title"
                  type="text"
                  placeholder={selectedModule ? `Update for ${selectedModule.module_code}` : "Class update"}
                  value={noticeForm.title}
                  onChange={handleNoticeChange}
                />
              </div>

              <div className="lecturer-form-row">
                <label htmlFor="notice-message">Message</label>
                <textarea
                  id="notice-message"
                  name="message"
                  rows="4"
                  placeholder="Tell students what changed and when to expect the next class or update."
                  value={noticeForm.message}
                  onChange={handleNoticeChange}
                />
              </div>

              <button
                type="submit"
                className="lecturer-primary-button"
                disabled={!selectedModuleId || notificationSending}
              >
                {notificationSending ? "Sending..." : "Send notification"}
              </button>
              {notificationMessage && (
                <p className="lecturer-notification-feedback" role="status">
                  {notificationMessage}
                </p>
              )}
            </form>

            <div className="lecturer-notification-list">
              <h3>Recent alerts</h3>

              {!selectedModuleId ? (
                <div className="lecturer-notice-empty">
                  Select a module to view its recent alerts.
                </div>
              ) : notifications.length === 0 ? (
                <div className="lecturer-notice-empty">
                  No student alerts sent yet.
                </div>
              ) : (
                notifications.map((item) => (
                  <div key={item.id} className="lecturer-notice-item">
                    <div className="lecturer-notice-tag">
                      {item.type === "late" ? "Late" : "Cancelled"}
                    </div>
                    <div className="lecturer-notice-copy">
                      <strong>{item.title}</strong>
                      <span>{item.module_code}</span>
                      <p>{item.message}</p>
                    </div>
                    <small>
                      {new Date(item.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <footer className="lecturer-footer">
          © 2026 LabGuard. All rights reserved.
        </footer>
    </main>
  );
}

export default LecturerDashboard;
