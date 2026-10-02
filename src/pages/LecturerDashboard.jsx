
import { useNavigate } from "react-router-dom";


function LecturerDashboard() {
  const navigate = useNavigate();

  const email = localStorage.getItem("email") || "Lecturer";

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="lecturer-dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-brand">
          <div className="logo-mark">LG</div>

          <div>
            <h2>LabGuard</h2>
            <span>Laboratory System</span>
          </div>
        </div>

        <nav className="sidebar-nav">

          <button
            className="nav-item active"
            onClick={() => navigate("/lecturer")}
          >
            <span className="nav-icon">⌂</span>
            Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/lecturer/modules")}
          >
            <span className="nav-icon">▦</span>
            My Modules
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/lecturer/modules")}
          >
            <span className="nav-icon">☷</span>
            Attendance
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-user">

            <div className="user-avatar">
              {email.charAt(0).toUpperCase()}
            </div>

            <div className="user-details">
              <strong>Lecturer</strong>
              <span>{email}</span>
            </div>

          </div>

          <button
            className="sidebar-logout"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </aside>


      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        {/* TOP BAR */}
        <header className="dashboard-topbar">

          <div>
            <span className="page-label">
              LECTURER PORTAL
            </span>

            <h1>Dashboard</h1>
          </div>

          <div className="topbar-user">

            <div className="top-avatar">
              {email.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>Lecturer</strong>
              <span>{email}</span>
            </div>

          </div>

        </header>


        {/* WELCOME SECTION */}
        <section className="welcome-section">

          <div>

            <span className="welcome-label">
              Welcome back
            </span>

            <h2>
              Manage your laboratory activities
            </h2>

            <p>
              View your modules and access attendance
              registers for the students assigned to each
              module.
            </p>

          </div>

          <button
            className="primary-action"
            onClick={() => navigate("/lecturer/modules")}
          >
            View My Modules
            <span>→</span>
          </button>
         <button
  className="dashboard-button"
  onClick={() => navigate("/update-information")}
>
  👤 Update Information
</button>
        </section>


        {/* QUICK OVERVIEW */}
        <section className="overview-section">

          <div className="section-title">

            <h3>
              Quick overview
            </h3>

            <p>
              Access your main lecturer services.
            </p>

          </div>


          <div className="overview-grid">

            {/* MODULES */}
            <button
              className="overview-card"
              onClick={() => navigate("/lecturer/modules")}
            >

              <div className="card-icon">
                ▦
              </div>

              <div className="card-text">

                <span>
                  MODULES
                </span>

                <h4>
                  My Modules
                </h4>

                <p>
                  View the modules assigned to you.
                </p>

              </div>

              <span className="card-arrow">
                →
              </span>

            </button>


            {/* ATTENDANCE */}
            <button
              className="overview-card"
              onClick={() => navigate("/lecturer/modules")}
            >

              <div className="card-icon">
                ☷
              </div>

              <div className="card-text">

                <span>
                  ATTENDANCE
                </span>

                <h4>
                  Attendance Register
                </h4>

                <p>
                  Select a module to view its attendance.
                </p>

              </div>

              <span className="card-arrow">
                →
              </span>

            </button>

          </div>

        </section>


        {/* ATTENDANCE WORKFLOW */}
        <section className="workflow-section">

          <div className="section-title">

            <h3>
              Attendance workflow
            </h3>

            <p>
              Attendance is organised according to your
              modules.
            </p>

          </div>


          <div className="workflow">

            {/* STEP 1 */}
            <div className="workflow-step">

              <div className="step-number">
                01
              </div>

              <div>

                <strong>
                  Select a module
                </strong>

                <p>
                  Open My Modules and select the module
                  you want to manage.
                </p>

              </div>

            </div>


            <div className="workflow-line"></div>


            {/* STEP 2 */}
            <div className="workflow-step">

              <div className="step-number">
                02
              </div>

              <div>

                <strong>
                  Open attendance
                </strong>

                <p>
                  View the attendance register belonging
                  to that specific module.
                </p>

              </div>

            </div>


            <div className="workflow-line"></div>


            {/* STEP 3 */}
            <div className="workflow-step">

              <div className="step-number">
                03
              </div>

              <div>

                <strong>
                  Monitor students
                </strong>

                <p>
                  Check student attendance records,
                  including check-in and check-out times.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* FOOTER */}
        <footer className="dashboard-footer">

          <span>
            LabGuard
          </span>

          <span>
            Laboratory Management System
          </span>

        </footer>

      </main>

    </div>
  );
}

export default LecturerDashboard;


