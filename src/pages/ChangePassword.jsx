import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function ChangePassword() {
  const navigate = useNavigate();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      // Get the email of the currently logged-in user
      const email = localStorage.getItem("email");

      if (!email) {
        setError(
          "Your email address could not be found. Please log in again."
        );
        setLoading(false);
        return;
      }

      // Use the existing password-reset system
      const response = await axios.post(
        `${API_URL}/auth/forgot-password`,
        {
          email: email.trim(),
        }
      );

      setMessage(
        response.data.message ||
        "A password change link has been sent to your email."
      );

      setShowConfirmation(false);

    } catch (err) {
      console.error("Change password error:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg || "Invalid field")
            .join(", ")
        );
      } else if (detail) {
        setError(String(detail));
      } else {
        setError(
          "Unable to send the password change link. Please try again."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        <div className="login-header">
          <h1>LabGuard</h1>
          <p>Laboratory Management System</p>
        </div>

        <div className="login-card">

          {!message && !showConfirmation && (
            <>
              <h2>Change Password</h2>

              <p className="login-description">
                A secure password change link will be sent to
                your registered email address.
              </p>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                type="button"
                className="login-button"
                onClick={() => {
                  setError("");
                  setShowConfirmation(true);
                }}
              >
                Change Password
              </button>

              <button
                type="button"
                className="back-button"
                onClick={() => navigate("/update-information")}
              >
                ← Back
              </button>
            </>
          )}

          {!message && showConfirmation && (
            <>
              <h2>Are You Sure?</h2>

              <p className="login-description">
                A password change link will be sent to your
                registered email address.
              </p>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                type="button"
                className="login-button"
                onClick={handleChangePassword}
                disabled={loading}
              >
                {loading
                  ? "Sending..."
                  : "Yes, Send Link"}
              </button>

              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setShowConfirmation(false);
                  setError("");
                }}
                disabled={loading}
              >
                No, Go Back
              </button>
            </>
          )}

          {message && (
            <>
              <h2>Check Your Email</h2>

              <div className="success-message">
                {message}
              </div>

              <p className="login-description">
                Open the link in your email to enter your new
                password.
              </p>

              <button
                type="button"
                className="back-button"
                onClick={() => navigate("/update-information")}
              >
                ← Back to Update Information
              </button>
            </>
          )}

        </div>

      </div>

    </div>
  );
}

export default ChangePassword;