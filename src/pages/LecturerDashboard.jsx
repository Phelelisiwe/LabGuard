
import { useNavigate } from "react-router-dom";

function LecturerDashboard() {
  const navigate = useNavigate();

  const email = localStorage.getItem("email") || "Lecturer";
  const initials = email.charAt(0).toUpperCase();

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="modern-lecturer-dashboard">

      {/* =========================
          TOP NAVIGATION
      ========================== */}

      <header className="modern-dashboard-nav">

        <div
          className="modern-dashboard-brand"
          onClick={() => navigate("/lecturer")}
        >
          <div className="modern-dashboard-logo">
            LG
          </div>

          <div className="modern-dashboard-brand-text">
            <strong>LabGuard</strong>
            <span>Lecturer Portal</span>
          </div>
        </div>


        <div className="modern-dashboard-nav-right">

          <div className="modern-dashboard-user">

            <div className="modern-dashboard-avatar">
              {initials}
            </div>

            <div className="modern-dashboard-user-info">
              <strong>Lecturer</strong>
              <span>{email}</span>
            </div>

          </div>


          <button
            className="modern-dashboard-logout"
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

      <main className="modern-dashboard-content">


        {/* =========================
            WELCOME HEADER
        ========================== */}

        <section className="modern-dashboard-welcome">

          <div className="modern-dashboard-welcome-text">

            <div className="modern-dashboard-eyebrow">
              <span></span>
              LECTURER WORKSPACE
            </div>

            <h1>
              Welcome back
            </h1>

            <p>
              Everything you need to manage your modules
              and monitor student attendance is here.
            </p>

          </div>


          <button
            className="modern-dashboard-primary"
            onClick={() => navigate("/lecturer/modules")}
          >
            <span>
              View My Modules
            </span>

            <span className="modern-dashboard-arrow">
              →
            </span>
          </button>

        </section>


        {/* =========================
            QUICK ACCESS
        ========================== */}

        <section className="modern-dashboard-section">

          <div className="modern-dashboard-section-heading">

            <div>
              <span>
                LECTURER TOOLS
              </span>

              <h2>
                Quick access
              </h2>
            </div>

            <button
              className="modern-dashboard-view-all"
              onClick={() => navigate("/lecturer/modules")}
            >
              View all
              <span>→</span>
            </button>

          </div>


          <div className="modern-dashboard-tools">


            {/* MODULES */}

            <button
              className="modern-dashboard-tool"
              onClick={() => navigate("/lecturer/modules")}
            >

              <div className="modern-tool-icon blue">
                ▦
              </div>

              <div className="modern-tool-content">

                <span className="modern-tool-label">
                  MODULES
                </span>

                <h3>
                  My Modules
                </h3>

                <p>
                  View your assigned teaching modules.
                </p>

              </div>

              <span className="modern-tool-arrow">
                →
              </span>

            </button>


            {/* ATTENDANCE */}

            <button
              className="modern-dashboard-tool"
              onClick={() => navigate("/lecturer/modules")}
            >

              <div className="modern-tool-icon yellow">
                ✓
              </div>

              <div className="modern-tool-content">

                <span className="modern-tool-label">
                  ATTENDANCE
                </span>

                <h3>
                  Attendance
                </h3>

                <p>
                  Review attendance records by module.
                </p>

              </div>

              <span className="modern-tool-arrow">
                →
              </span>

            </button>


            {/* STUDENTS */}

            <button
              className="modern-dashboard-tool"
              onClick={() => navigate("/lecturer/modules")}
            >

              <div className="modern-tool-icon green">
                👥
              </div>

              <div className="modern-tool-content">

                <span className="modern-tool-label">
                  STUDENTS
                </span>

                <h3>
                  Student Records
                </h3>

                <p>
                  View students registered in your modules.
                </p>

              </div>

              <span className="modern-tool-arrow">
                →
              </span>

            </button>


            {/* PREDICTION */}

            <button
              className="modern-dashboard-tool"
              onClick={() => navigate("/lecturer/modules")}
            >

              <div className="modern-tool-icon purple">
                ↗
              </div>

              <div className="modern-tool-content">

                <span className="modern-tool-label">
                  INSIGHTS
                </span>

                <h3>
                  Attendance Prediction
                </h3>

                <p>
                  View predicted attendance for your modules.
                </p>

              </div>

              <span className="modern-tool-arrow">
                →
              </span>

            </button>

          </div>

        </section>


        {/* =========================
            ATTENDANCE WORKFLOW
        ========================== */}

        <section className="modern-dashboard-workflow">

          <div className="modern-dashboard-workflow-heading">

            <div>
              <span>
                ATTENDANCE WORKFLOW
              </span>

              <h2>
                From module to insight
              </h2>
            </div>

            <div className="modern-workflow-status">
              <span></span>
              System ready
            </div>

          </div>


          <div className="modern-workflow-grid">


            <div className="modern-workflow-step">

              <div className="modern-step-number">
                01
              </div>

              <div>
                <h3>
                  Choose a module
                </h3>

                <p>
                  Open one of your assigned modules.
                </p>
              </div>

            </div>


            <div className="modern-workflow-connector"></div>


            <div className="modern-workflow-step">

              <div className="modern-step-number">
                02
              </div>

              <div>
                <h3>
                  Review attendance
                </h3>

                <p>
                  Check student attendance and class records.
                </p>
              </div>

            </div>


            <div className="modern-workflow-connector"></div>


            <div className="modern-workflow-step">

              <div className="modern-step-number">
                03
              </div>

              <div>
                <h3>
                  Analyse results
                </h3>

                <p>
                  View overall results and attendance predictions.
                </p>
              </div>

            </div>

          </div>

        </section>


        {/* =========================
            ACCOUNT
        ========================== */}

        <section className="modern-dashboard-account">

          <div>

            <span>
              ACCOUNT
            </span>

            <h2>
              Manage your lecturer profile
            </h2>

            <p>
              Keep your personal and account information
              up to date.
            </p>

          </div>


          <button
            className="modern-dashboard-secondary"
            onClick={() => navigate("/update-information")}
          >
            Update Information
            <span>→</span>
          </button>

        </section>


      </main>


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="modern-dashboard-footer">

        <span>
          © 2026 LabGuard
        </span>

        <span>
          Lecturer Portal
        </span>

      </footer>

    </div>
  );
}

export default LecturerDashboard;
