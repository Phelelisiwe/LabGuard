import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);

  const showSection = (section) => {
    setActiveSection(
      activeSection === section ? null : section
    );
  };

  return (
    <div className="landing-page">

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">LabGuard</div>

        <div className="nav-links">

          <button onClick={() => showSection("about")}>
            About
          </button>

          <button onClick={() => showSection("features")}>
            Features
          </button>

          <button onClick={() => showSection("how")}>
            How It Works
          </button>

          <button onClick={() => showSection("contact")}>
            Contact
          </button>

          <button
            className="login-nav-button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

        </div>
      </nav>


      {/* Hero Section */}
      <main className="hero">

        <div className="hero-overlay"></div>

        <div className="hero-content">

          <span className="hero-badge">
            SECURE LABORATORY MANAGEMENT
          </span>

          <h1>
            Welcome to <span>LabGuard</span>
          </h1>

          <p>
            A secure laboratory access and management system
            designed to manage users, attendance and laboratory
            equipment from one centralized platform.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-button"
              onClick={() => navigate("/login")}
            >
              Get Started
            </button>

            <button
              className="secondary-button"
              onClick={() => showSection("about")}
            >
              Learn More
            </button>

          </div>

        </div>


        {/* Attendance Kiosk */}
        <div className="hero-card">

          <div className="kiosk-header">
            <div className="status-dot"></div>
            <span>LabGuard Access Point</span>
          </div>

          <div className="kiosk-screen">

            <div className="shield">
              ✓
            </div>

            <h2>Verify Your Identity</h2>

            <p>
              Face and fingerprint verification required
            </p>

            <div className="verification-step">

              <span>✓</span>

              <div>
                <strong>Face Recognition</strong>
                <small>Identity detected</small>
              </div>

            </div>

            <div className="verification-step">

              <span>✓</span>

              <div>
                <strong>Fingerprint</strong>
                <small>Verification successful</small>
              </div>

            </div>

            <div className="access-granted">
              ACCESS GRANTED
            </div>

          </div>

        </div>

      </main>


      {/* INFORMATION AREA */}
      <div className="information-area">

        {/* ABOUT */}
        {activeSection === "about" && (

          <section className="information-panel">

            <button
              className="close-information"
              onClick={() => setActiveSection(null)}
            >
              ×
            </button>

            <span className="information-label">
              ABOUT LABGUARD
            </span>

            <h2>
              A Smarter Way to Manage Laboratory Access
            </h2>

            <p>
              LabGuard is a laboratory access and management
              system designed to improve security, attendance
              monitoring and equipment management.
            </p>

            <p>
              The system provides authorised students and
              employees with controlled access to laboratory
              facilities while keeping important records in
              one centralized system.
            </p>

            <div className="information-cards">

              <div className="info-card">
                <div className="info-icon">🔐</div>

                <h3>Secure Access</h3>

                <p>
                  Laboratory access is controlled through
                  registered user verification.
                </p>
              </div>

              <div className="info-card">
                <div className="info-icon">📊</div>

                <h3>Attendance</h3>

                <p>
                  Student attendance can be recorded and
                  monitored through the system.
                </p>
              </div>

              <div className="info-card">
                <div className="info-icon">📦</div>

                <h3>Equipment</h3>

                <p>
                  Laboratory equipment borrowing and returns
                  can be recorded and tracked.
                </p>
              </div>

            </div>

          </section>

        )}


        {/* FEATURES */}
        {activeSection === "features" && (

          <section className="information-panel">

            <button
              className="close-information"
              onClick={() => setActiveSection(null)}
            >
              ×
            </button>

            <span className="information-label">
              LABGUARD FEATURES
            </span>

            <h2>
              What Can LabGuard Do?
            </h2>

            <p>
              LabGuard provides several features designed to
              support secure and efficient laboratory management.
            </p>

            <div className="information-cards">

              <div className="info-card">
                <div className="info-icon">🎓</div>

                <h3>Student Management</h3>

                <p>
                  Manage registered students and provide them
                  with controlled laboratory access.
                </p>
              </div>

              <div className="info-card">
                <div className="info-icon">👨‍🏫</div>

                <h3>Employee Management</h3>

                <p>
                  Support lecturers, assistant lecturers,
                  cleaners and IT specialists.
                </p>
              </div>

              <div className="info-card">
                <div className="info-icon">📅</div>

                <h3>Attendance Management</h3>

                <p>
                  Record laboratory attendance and maintain
                  attendance information for students and modules.
                </p>
              </div>

              <div className="info-card">
                <div className="info-icon">📦</div>

                <h3>Equipment Tracking</h3>

                <p>
                  Track equipment borrowing and returning using
                  barcode or QR identification.
                </p>
              </div>

              <div className="info-card">
                <div className="info-icon">🔒</div>

                <h3>Access Control</h3>

                <p>
                  Verify registered users before laboratory access
                  is granted.
                </p>
              </div>

              <div className="info-card">
                <div className="info-icon">📈</div>

                <h3>Reports</h3>

                <p>
                  Provide authorised users with relevant
                  attendance and equipment information.
                </p>
              </div>

            </div>

          </section>

        )}


        {/* HOW IT WORKS */}
        {activeSection === "how" && (

          <section className="information-panel">

            <button
              className="close-information"
              onClick={() => setActiveSection(null)}
            >
              ×
            </button>

            <span className="information-label">
              HOW IT WORKS
            </span>

            <h2>
              From Registration to Laboratory Access
            </h2>

            <p>
              LabGuard uses a controlled process to ensure that
              laboratory access is provided to registered users.
            </p>

            <div className="process-container">

              <div className="process-step">

                <div className="step-number">
                  01
                </div>

                <div>
                  <h3>Registration</h3>

                  <p>
                    The administrator registers students and
                    employees and creates their accounts.
                  </p>
                </div>

              </div>


              <div className="process-step">

                <div className="step-number">
                  02
                </div>

                <div>
                  <h3>Biometric Registration</h3>

                  <p>
                    The user's face and fingerprint are
                    registered for identity verification.
                  </p>
                </div>

              </div>


              <div className="process-step">

                <div className="step-number">
                  03
                </div>

                <div>
                  <h3>Identity Verification</h3>

                  <p>
                    When the user arrives at the laboratory,
                    their identity is verified.
                  </p>
                </div>

              </div>


              <div className="process-step">

                <div className="step-number">
                  04
                </div>

                <div>
                  <h3>Access & Attendance</h3>

                  <p>
                    Once verification is successful, laboratory
                    access is granted and attendance is recorded.
                  </p>
                </div>

              </div>

            </div>

          </section>

        )}


        {/* CONTACT */}
        {activeSection === "contact" && (

          <section className="information-panel">

            <button
              className="close-information"
              onClick={() => setActiveSection(null)}
            >
              ×
            </button>

            <span className="information-label">
              GET IN TOUCH
            </span>

            <h2>
              Contact LabGuard
            </h2>

            <p>
              For questions, feedback or information about
              the LabGuard project, you can get in touch using
              the details below.
            </p>

            <div className="contact-information">

              <div className="contact-item">

                <div className="contact-icon">
                  ✉
                </div>

                <div>
                  <h4>Email</h4>
                  <p>
                    YOUR-EMAIL@example.com
                  </p>
                </div>

              </div>


              <div className="contact-item">

                <div className="contact-icon">
                  🎓
                </div>

                <div>
                  <h4>Institution</h4>
                  <p>
                    Tshwane University of Technology
                  </p>
                </div>

              </div>


              <div className="contact-item">

                <div className="contact-icon">
                  💻
                </div>

                <div>
                  <h4>Project</h4>
                  <p>
                    LabGuard – Laboratory Access and
                    Management System
                  </p>
                </div>

              </div>

            </div>

          </section>

        )}

      </div>


      {/* Footer */}
      <footer className="landing-footer">

        <div className="footer-logo">
          LabGuard
        </div>

        <p>
          Laboratory Access and Management System
        </p>

        <p>
          © 2026 LabGuard. All rights reserved.
        </p>

      </footer>

    </div>
  );
}

export default LandingPage;
