import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="logo">LabGuard</div>

        <button
          className="login-nav-button"
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </nav>

      <main className="hero">
        <div className="hero-content">
          <h1>Welcome to LabGuard</h1>

          <p>
            A secure laboratory access and management system
            designed to manage students, employees and laboratory
            activities.
          </p>

          <button
            className="primary-button"
            onClick={() => navigate("/login")}
          >
            Get Started
          </button>
        </div>

        <div className="hero-card">
          <div className="shield">LabGuard</div>

          <h2>Secure Laboratory Management</h2>

          <p>
            Manage laboratory users and access securely from one
            centralized system.
          </p>
        </div>
      </main>

      <section className="features">
        <div className="feature">
          <h3>Students</h3>
          <p>Secure laboratory access and attendance management.</p>
        </div>

        <div className="feature">
          <h3>Employees</h3>
          <p>Manage lecturers, assistants, cleaners and IT staff.</p>
        </div>

        <div className="feature">
          <h3>Administration</h3>
          <p>Centralized management of laboratory users.</p>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;