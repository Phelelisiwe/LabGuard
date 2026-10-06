
import { useNavigate } from "react-router-dom";

function StudentDashboard() {
  const navigate = useNavigate();

  const email = localStorage.getItem("email") || "Student";
  const initials = email.charAt(0).toUpperCase();

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


        {/* =========================
            QUICK ACCESS
        ========================== */}

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
              onClick={() => navigate("/update-information")}
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