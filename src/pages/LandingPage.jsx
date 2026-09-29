import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">

      {/* Navigation */}
      <nav className="landing-navbar">
        <div className="landing-logo">
          <span className="logo-shield">◈</span>
          LabGuard
        </div>

        <button
          className="landing-login-button"
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-overlay"></div>

        <div className="landing-hero-content">
          <div className="landing-badge">
            SMART LABORATORY SECURITY
          </div>

          <h1>
            Secure Access.
            <br />
            <span>Smart Attendance.</span>
          </h1>

          <p>
            LabGuard is a smart laboratory access and attendance system
            that combines biometric verification, automated attendance
            and connected hardware to create a safer laboratory environment.
          </p>

          <div className="landing-buttons">
            <button
              className="landing-primary-button"
              onClick={() => navigate("/login")}
            >
              Get Started →
            </button>

            <a href="#how-it-works" className="landing-secondary-button">
              See how it works
            </a>
          </div>

          <div className="landing-tags">
            <span>✓ Face Recognition</span>
            <span>✓ Fingerprint</span>
            <span>✓ Attendance</span>
            <span>✓ ESP32</span>
          </div>
        </div>

        {/* Kiosk preview */}
        <div className="kiosk-preview">
          <div className="kiosk-glow"></div>

          <div className="kiosk-screen">
            <div className="screen-top">
              <span className="screen-dot"></span>
              LABGUARD
            </div>

            <div className="face-scan">
              <div className="face-frame">
                <span></span>
              </div>
            </div>

            <h3>Identity Verification</h3>
            <p>Look at the camera</p>

            <div className="scan-status">
              <span></span>
              Scanning...
            </div>
          </div>

          <div className="kiosk-base"></div>

          <div className="hardware-label fingerprint-label">
            <strong>◉</strong>
            Fingerprint
          </div>

          <div className="hardware-label camera-label">
            <strong>◉</strong>
            Camera
          </div>

          <div className="hardware-label lcd-label">
            <strong>▣</strong>
            LCD Display
          </div>
        </div>
      </section>

      {/* System introduction */}
      <section className="landing-intro">
        <div className="landing-section-heading">
          <span>ABOUT LABGUARD</span>
          <h2>One system connecting the laboratory</h2>
          <p>
            LabGuard connects students, lecturers and laboratory hardware
            through one centralized system for secure access and attendance.
          </p>
        </div>

        <div className="landing-system-grid">

          <div className="landing-system-card">
            <div className="system-icon">⌁</div>
            <h3>Biometric Access</h3>
            <p>
              Students can be verified using facial recognition and
              fingerprint authentication before entering the laboratory.
            </p>
          </div>

          <div className="landing-system-card">
            <div className="system-icon">✓</div>
            <h3>Smart Attendance</h3>
            <p>
              Attendance is automatically recorded when an authorized
              student successfully checks into the laboratory.
            </p>
          </div>

          <div className="landing-system-card">
            <div className="system-icon">▣</div>
            <h3>Connected Hardware</h3>
            <p>
              ESP32 hardware connects the fingerprint scanner, sensors,
              LCD, buzzer and electronic door control.
            </p>
          </div>

          <div className="landing-system-card">
            <div className="system-icon">◫</div>
            <h3>Centralized Management</h3>
            <p>
              Administrators and lecturers can manage users, modules
              and attendance from the LabGuard system.
            </p>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section className="landing-how" id="how-it-works">

        <div className="landing-section-heading">
          <span>HOW IT WORKS</span>
          <h2>From entering the lab to recording attendance</h2>
        </div>

        <div className="landing-steps">

          <div className="landing-step">
            <div className="step-number">01</div>
            <h3>Approach</h3>
            <p>
              The distance sensor detects a person approaching the
              laboratory access point.
            </p>
          </div>

          <div className="landing-step">
            <div className="step-number">02</div>
            <h3>Verify</h3>
            <p>
              The camera and fingerprint scanner verify the student's
              registered biometric information.
            </p>
          </div>

          <div className="landing-step">
            <div className="step-number">03</div>
            <h3>Authorize</h3>
            <p>
              LabGuard checks the user's authorization and displays
              the result on the kiosk.
            </p>
          </div>

          <div className="landing-step">
            <div className="step-number">04</div>
            <h3>Record</h3>
            <p>
              Successful access records the student's attendance
              against the selected module.
            </p>
          </div>

        </div>
      </section>

      {/* Hardware section */}
      <section className="landing-hardware">

        <div className="hardware-content">
          <span>LABGUARD HARDWARE</span>

          <h2>
            Software meets the
            <br />
            physical laboratory.
          </h2>

          <p>
            LabGuard is designed to work together with physical laboratory
            hardware, creating a complete access-control and attendance
            solution.
          </p>

          <button
            className="landing-primary-button dark-button"
            onClick={() => navigate("/login")}
          >
            Access LabGuard →
          </button>
        </div>

        <div className="hardware-components">

          <div className="hardware-component">
            <span>01</span>
            <strong>ESP32</strong>
            <small>Controller</small>
          </div>

          <div className="hardware-component">
            <span>02</span>
            <strong>Fingerprint</strong>
            <small>Authentication</small>
          </div>

          <div className="hardware-component">
            <span>03</span>
            <strong>Camera</strong>
            <small>Face Recognition</small>
          </div>

          <div className="hardware-component">
            <span>04</span>
            <strong>LCD</strong>
            <small>User Feedback</small>
          </div>

          <div className="hardware-component">
            <span>05</span>
            <strong>Sensor</strong>
            <small>Presence Detection</small>
          </div>

          <div className="hardware-component">
            <span>06</span>
            <strong>Door Lock</strong>
            <small>Access Control</small>
          </div>

        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-cta">
        <div>
          <span>LABGUARD</span>
          <h2>Secure your laboratory with smarter access.</h2>
          <p>
            Manage laboratory users, biometric access and attendance
            from one centralized platform.
          </p>
        </div>

        <button
          className="landing-primary-button"
          onClick={() => navigate("/login")}
        >
          Login to LabGuard →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>
          <strong>LabGuard</strong>
          <span>Smart Laboratory Access & Attendance</span>
        </div>

        <p>Computer Systems Engineering Project</p>
      </footer>

    </div>
  );
}

export default LandingPage;