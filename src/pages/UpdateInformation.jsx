import { useNavigate } from "react-router-dom";

function UpdateInformation() {
  const navigate = useNavigate();

  return (
    <div className="modern-update-page">

      {/* Navigation */}
      <nav className="modern-update-navbar">

        <div
          className="modern-update-brand"
          onClick={() => navigate(-1)}
        >
          <div className="modern-update-logo">
            LG
          </div>

          <div className="modern-update-brand-text">
            <strong>LabGuard</strong>
            <span>Account Management</span>
          </div>
        </div>

        <button
          className="modern-update-back"
          onClick={() => navigate(-1)}
        >
          <span>←</span>
          Back
        </button>

      </nav>


      {/* Main Content */}
      <main className="modern-update-content">

        {/* Page Header */}
        <section className="modern-update-heading">

          <div className="modern-update-eyebrow">
            <span></span>
            ACCOUNT SETTINGS
          </div>

          <h1>Update Information</h1>

          <p>
            Manage your LabGuard account information and
            security settings from one place.
          </p>

        </section>


        {/* Settings Cards */}
        <section className="modern-update-grid">

          {/* Email Card */}
          <article className="modern-update-card">

            <div className="modern-update-card-top">

              <div className="modern-update-icon email-icon">
                <span>✉</span>
              </div>

              <div className="modern-update-status">
                ACCOUNT
              </div>

            </div>

            <div className="modern-update-card-content">

              <h2>Change Email</h2>

              <p>
                Update the email address linked to your
                LabGuard account. Your new email will be
                used for account communication and verification.
              </p>

            </div>

            <div className="modern-update-divider"></div>

            <button
              className="modern-update-action"
              onClick={() => navigate("/update-email")}
            >
              <span>Change Email</span>
              <span className="modern-update-arrow">→</span>
            </button>

          </article>


          {/* Password Card */}
          <article className="modern-update-card">

            <div className="modern-update-card-top">

              <div className="modern-update-icon password-icon">
                <span>🔒</span>
              </div>

              <div className="modern-update-status">
                SECURITY
              </div>

            </div>

            <div className="modern-update-card-content">

              <h2>Change Password</h2>

              <p>
                Request a secure link to change your
                LabGuard password and keep your account
                protected.
              </p>

            </div>

            <div className="modern-update-divider"></div>

            <button
              className="modern-update-action"
              onClick={() => navigate("/change-password")}
            >
              <span>Change Password</span>
              <span className="modern-update-arrow">→</span>
            </button>

          </article>

        </section>


        {/* Security Information */}
        <section className="modern-update-security">

          <div className="modern-security-icon">
            ✓
          </div>

          <div>
            <strong>Keep your account secure</strong>

            <p>
              Make sure your email address is up to date
              and use a strong password for your LabGuard account.
            </p>
          </div>

        </section>

      </main>


      {/* Footer */}
      <footer className="modern-update-footer">

        <span>© 2026 LabGuard</span>

        <span>
          Laboratory Management System
        </span>

      </footer>

    </div>
  );
}

export default UpdateInformation;