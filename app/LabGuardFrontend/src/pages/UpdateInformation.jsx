
import { useNavigate } from "react-router-dom";

function UpdateInformation() {
  const navigate = useNavigate();

  return (
    <div className="update-page">

      <nav className="update-navbar">

        <div className="update-logo">
          LabGuard
        </div>

        <button
          className="update-back-button"
          onClick={() => navigate(-1)}
        >
          Back
        </button>

      </nav>

      <main className="update-content">

        <div className="update-header">
          <h1>Update Information</h1>

          <p>
            Manage your account information and password.
          </p>
        </div>

        <div className="update-cards">

          {/* Change Email */}

          <div className="update-card">

            <div className="update-card-icon">
              📧
            </div>

            <h2>Change Email</h2>

            <p>
              Update the email address linked to your
              LabGuard account.
            </p>

            <button
              className="update-button"
              onClick={() =>
                navigate("/update-email")
              }
            >
              Change Email
            </button>

          </div>


          {/* Change Password */}

          <div className="update-card">

            <div className="update-card-icon">
              🔐
            </div>

            <h2>Change Password</h2>

            <p>
              Request a secure link to change your
              LabGuard password.
            </p>

            <button
              className="update-button"
              onClick={() =>
                navigate("/change-password")
              }
            >
              Change Password
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

export default UpdateInformation;

