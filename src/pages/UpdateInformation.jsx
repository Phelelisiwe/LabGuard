import { useNavigate } from "react-router-dom";
import "./UpdateInformation.css";

function UpdateInformation() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email") || "No email on file";
  const accountType = role
    ? role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Account";
  const changePasswordPath =
    role === "student"
      ? "/student/change-password"
      : role === "lecturer"
        ? "/lecturer/change-password"
        : role === "super_admin"
          ? "/admin/change-password"
          : "/change-password";

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

              <div className="modern-update-status">ACCOUNT</div>

            </div>

            <div className="modern-update-card-content">

              <h2>Account Email</h2>

              <p>
                This is the email address currently linked to your LabGuard
                account. Contact an administrator if it needs to be changed.
              </p>

            </div>

            <div className="modern-update-divider"></div>

            <div className="modern-update-account-detail">
              <span>EMAIL ADDRESS</span>
              <strong>{email}</strong>
              <small>{accountType} account</small>
            </div>

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
              onClick={() => navigate(changePasswordPath)}
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