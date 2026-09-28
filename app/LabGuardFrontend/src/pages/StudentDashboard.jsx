
import { useNavigate } from "react-router-dom";

function StudentDashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const email = localStorage.getItem("email");

  return (
    <div className="student-dashboard">

      {/* Top Navigation */}
      <header className="student-header">

        <div className="brand-section">

          <div className="tut-logo">
            TUT
          </div>

          <div className="brand-divider"></div>

          <div className="labguard-brand">
            <h1>LabGuard</h1>
            <span>Laboratory Management System</span>
          </div>

        </div>

        <div className="student-header-right">

          <div className="student-user">
            <div className="user-icon">
              {email ? email.charAt(0).toUpperCase() : "S"}
            </div>

            <div>
              <strong>Student</strong>
              <span>{email || "Student Account"}</span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* Main Content */}
      <main className="student-main">

        <section className="welcome-section">

          <div>
            <p className="welcome-label">
              STUDENT PORTAL
            </p>

            <h2>
              Welcome to LabGuard
            </h2>

            <p>
              Manage your laboratory modules, attendance and
              laboratory access from one place.
            </p>
          </div>

          <div className="welcome-accent"></div>

        </section>


        {/* Dashboard Cards */}
        <section className="dashboard-section">

          <div className="section-heading">
            <h3>Student Services</h3>
            <p>
              Select an option below to continue.
            </p>
          </div>


          <div className="student-card-grid">

            {/* Modules */}
            <button
              className="student-card"
              onClick={() => navigate("/student/modules")}
            >
              <div className="card-icon blue-icon">
                📚
              </div>

              <div className="card-content">
                <h4>My Modules</h4>
                <p>
                  View the modules you are registered for.
                </p>
              </div>

              <span className="card-arrow">
                →
              </span>
            </button>


            {/* Attendance */}
            <button
              className="student-card"
              onClick={() => navigate("/student/attendance")}
            >
              <div className="card-icon gold-icon">
                📊
              </div>

              <div className="card-content">
                <h4>My Attendance</h4>
                <p>
                  View your laboratory attendance records.
                </p>
              </div>

              <span className="card-arrow">
                →
              </span>
            </button>


            {/* Laboratory Access */}
            <button
              className="student-card"
              onClick={() => navigate("/student/check-in")}
            >
              <div className="card-icon red-icon">
                🔐
              </div>

              <div className="card-content">
                <h4>Laboratory Access</h4>
                <p>
                  Verify your identity and access the laboratory.
                </p>
              </div>

              <span className="card-arrow">
                →
              </span>
            </button>

          </div>

        </section>


        {/* Information Section */}
        <section className="student-info">

          <div className="info-header">
            <h3>LabGuard Information</h3>
          </div>

          <div className="info-grid">

            <div className="info-item">
              <strong>Attendance</strong>
              <p>
                Your laboratory attendance is recorded when
                you check in and out.
              </p>
            </div>

            <div className="info-item">
              <strong>Laboratory Access</strong>
              <p>
                Use the laboratory access option to verify
                your identity before entering the laboratory.
              </p>
            </div>

            <div className="info-item">
              <strong>Need Help?</strong>
              <p>
                Contact your lecturer or laboratory administrator
                if you experience any problems.
              </p>
            </div>

          </div>

        </section>

      </main>


      {/* Footer */}
      <footer className="student-footer">
        <p>
          LabGuard • Laboratory Management System
        </p>

        <span>
          Tshwane University of Technology
        </span>
      </footer>

    </div>
  );
}

export default StudentDashboard;

