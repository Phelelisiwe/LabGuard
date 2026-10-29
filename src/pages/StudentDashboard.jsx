
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./StudentNotifications.css";

function StudentDashboard() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationError, setNotificationError] = useState("");
  const token = localStorage.getItem("access_token");
  const API_URL =
    import.meta.env.VITE_API_URL || "https://labguard-dklp.onrender.com";

  const email = localStorage.getItem("email") || "Student";
  const initials = email.charAt(0).toUpperCase();

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/student/notifications`, {
          headers: { Authorization: "Bearer " + token },
        });
        if (active) setNotifications(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }
        if (active) {
          setNotificationError(
            err.response?.data?.detail || "Unable to load class notifications."
          );
        }
      } finally {
        if (active) setNotificationsLoading(false);
      }
    };

    loadNotifications();
    return () => {
      active = false;
    };
  }, [API_URL, navigate, token]);

  const attendanceTrend = [72, 84, 76, 91, 88, 96, 94];
  const moduleProgress = [
    { name: "Database Systems", value: 94, color: "blue" },
    { name: "Web Dev", value: 88, color: "gold" },
    { name: "Networking", value: 81, color: "green" },
    { name: "Software Testing", value: 76, color: "purple" },
  ];
  const summaryCards = [
    { label: "Attendance", value: "89%", note: "+7% this month" },
    { label: "Modules", value: "06", note: "active this term" },
    { label: "Check-ins", value: "24", note: "logged this week" },
  ];

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="modern-student-dashboard">

      {/* =========================
          TOP NAVIGATION
      ========================== */}

      <header className="modern-student-nav">

        <div
          className="modern-student-brand"
          onClick={() => navigate("/student")}
        >

          <div className="modern-student-logo">
            LG
          </div>

          <div className="modern-student-brand-text">
            <strong>LabGuard</strong>
            <span>Student Portal</span>
          </div>

        </div>


        <div className="modern-student-nav-right">

          <div className="modern-student-user">

            <div className="modern-student-avatar">
              {initials}
            </div>

            <div className="modern-student-user-info">
              <strong>Student</strong>
              <span>{email}</span>
            </div>

          </div>


          <button
            className="modern-student-logout"
            onClick={logout}
          >
            <span>↪</span>
            Logout
          </button>

        </div>

      </header>


      {/* =========================
          MAIN CONTENT
      ========================== */}

      <main className="modern-student-content">


        {/* =========================
            WELCOME
        ========================== */}

        <section className="modern-student-welcome">

          <div className="modern-student-welcome-text">

            <div className="modern-student-eyebrow">
              <span></span>
              STUDENT WORKSPACE
            </div>

            <h1>
              Welcome back
            </h1>

            <p>
              Manage your modules, attendance and laboratory
              access from one central workspace.
            </p>

          </div>


          <button
            className="modern-student-primary"
            onClick={() => navigate("/student/modules")}
          >
            <span>
              View My Modules
            </span>

            <span className="modern-student-arrow">
              →
            </span>
          </button>

        </section>

        <section className="student-notifications" aria-labelledby="student-notifications-title">
          <div className="student-notifications-heading">
            <div>
              <span>MODULE UPDATES</span>
              <h2 id="student-notifications-title">Class notifications</h2>
            </div>
            <span className="student-notifications-count">
              {notifications.length} recent
            </span>
          </div>

          {notificationError ? (
            <p className="student-notifications-state" role="alert">
              {notificationError}
            </p>
          ) : notificationsLoading ? (
            <p className="student-notifications-state" aria-live="polite">
              Loading class notifications...
            </p>
          ) : notifications.length === 0 ? (
            <p className="student-notifications-state">
              Class updates from your lecturers will appear here.
            </p>
          ) : (
            <div className="student-notifications-list">
              {notifications.slice(0, 5).map((notification) => (
                <article
                  className="student-notification-item"
                  key={notification.id}
                >
                  <div className="student-notification-meta">
                    <span>{notification.module_code}</span>
                    <time dateTime={notification.created_at}>
                      {new Date(notification.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                </article>
              ))}
            </div>
          )}
        </section>


        {/* =========================
            QUICK ACCESS
        ========================== */}

        <section className="student-analytics">
          <div className="student-chart-card">
            <div className="student-section-header">
              <div>
                <span>ATTENDANCE OVERVIEW</span>
                <h3>Weekly presence</h3>
              </div>
              <strong>89%</strong>
            </div>

            <div className="student-bar-chart" aria-label="Weekly attendance chart">
              {attendanceTrend.map((value, index) => (
                <div key={index} className="student-bar-group">
                  <div className="student-bar-track">
                    <div
                      className="student-bar-fill"
                      style={{ height: `${value}%` }}
                    />
                  </div>
                  <span>{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="student-progress-card">
            <div className="student-section-header">
              <div>
                <span>MODULE STATUS</span>
                <h3>Progress</h3>
              </div>
            </div>

            <div className="student-progress-list">
              {moduleProgress.map((item) => (
                <div key={item.name} className="student-progress-item">
                  <div className="student-progress-label-row">
                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                  <div className="student-progress-track">
                    <div
                      className={`student-progress-fill ${item.color}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="student-metric-grid" aria-label="Student dashboard summary metrics">
          {summaryCards.map((card) => (
            <div key={card.label} className="student-metric-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </div>
          ))}
        </section>

        <section className="modern-student-section">

          <div className="modern-student-section-heading">

            <div>
              <span>
                STUDENT SERVICES
              </span>

              <h2>
                Quick access
              </h2>
            </div>

          </div>


          <div className="modern-student-tools">


            {/* MY MODULES */}

            <button
              className="modern-student-tool"
              onClick={() => navigate("/student/modules")}
            >

              <div className="modern-student-tool-icon blue">
                ▦
              </div>

              <div className="modern-student-tool-content">

                <span>
                  MODULES
                </span>

                <h3>
                  My Modules
                </h3>

                <p>
                  View the modules you are registered for.
                </p>

              </div>

              <span className="modern-student-tool-arrow">
                →
              </span>

            </button>


            {/* ATTENDANCE */}

            <button
              className="modern-student-tool"
              onClick={() => navigate("/student/attendance")}
            >

              <div className="modern-student-tool-icon yellow">
                ✓
              </div>

              <div className="modern-student-tool-content">

                <span>
                  ATTENDANCE
                </span>

                <h3>
                  My Attendance
                </h3>

                <p>
                  View your attendance records and progress.
                </p>

              </div>

              <span className="modern-student-tool-arrow">
                →
              </span>

            </button>


            {/* LAB ACCESS */}

            <button
              className="modern-student-tool"
              onClick={() => navigate("/student/check-in")}
            >

              <div className="modern-student-tool-icon green">
                ◉
              </div>

              <div className="modern-student-tool-content">

                <span>
                  LABORATORY
                </span>

                <h3>
                  Laboratory Access
                </h3>

                <p>
                  Verify your identity before entering the lab.
                </p>

              </div>

              <span className="modern-student-tool-arrow">
                →
              </span>

            </button>


            {/* PROFILE */}

            <button
              className="modern-student-tool"
              onClick={() => navigate("/student/update-information")}
            >

              <div className="modern-student-tool-icon purple">
                ◌
              </div>

              <div className="modern-student-tool-content">

                <span>
                  ACCOUNT
                </span>

                <h3>
                  My Profile
                </h3>

                <p>
                  Update your student account information.
                </p>

              </div>

              <span className="modern-student-tool-arrow">
                →
              </span>

            </button>

          </div>

        </section>


        {/* =========================
            STUDENT WORKFLOW
        ========================== */}

        <section className="modern-student-workflow">

          <div className="modern-student-workflow-heading">

            <div>
              <span>
                LABGUARD WORKFLOW
              </span>

              <h2>
                Stay on top of your attendance
              </h2>
            </div>

            <div className="modern-student-status">
              <span></span>
              Student account active
            </div>

          </div>


          <div className="modern-student-workflow-grid">


            <div className="modern-student-workflow-step">

              <div className="modern-student-step-number">
                01
              </div>

              <div>
                <h3>
                  View your modules
                </h3>

                <p>
                  Check the modules you are currently registered for.
                </p>
              </div>

            </div>


            <div className="modern-student-workflow-line"></div>


            <div className="modern-student-workflow-step">

              <div className="modern-student-step-number">
                02
              </div>

              <div>
                <h3>
                  Verify attendance
                </h3>

                <p>
                  Use the available verification method when attending class.
                </p>
              </div>

            </div>


            <div className="modern-student-workflow-line"></div>


            <div className="modern-student-workflow-step">

              <div className="modern-student-step-number">
                03
              </div>

              <div>
                <h3>
                  Monitor your progress
                </h3>

                <p>
                  Review your attendance records and stay informed.
                </p>
              </div>

            </div>

          </div>

        </section>


        {/* =========================
            INFORMATION
        ========================== */}

        <section className="modern-student-info">

          <div>

            <span>
              LABGUARD
            </span>

            <h2>
              Your laboratory activity in one place
            </h2>

            <p>
              LabGuard helps you keep track of your modules,
              attendance and laboratory access through one
              secure student portal.
            </p>

          </div>

          <div className="modern-student-info-badge">
            <span>●</span>
            Secure Student Portal
          </div>

        </section>


      </main>


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="modern-student-footer">

        <span>
          © 2026 LabGuard
        </span>

        <span>
          Student Portal
        </span>

      </footer>

    </div>
  );
}

export default StudentDashboard;