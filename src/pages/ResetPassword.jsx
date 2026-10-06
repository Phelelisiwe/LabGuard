import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  // Controls the second confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("Invalid password reset link.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Do NOT update the database yet.
    // Show confirmation first.
    setShowConfirmation(true);
  };


  const confirmPasswordChange = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        "https://labguard-dklp.onrender.com/auth/reset-password",
        {
          reset_token: token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }
      );

      setMessage(
        response.data.message ||
        "Password reset successfully."
      );

      setNewPassword("");
      setConfirmPassword("");

      setShowConfirmation(false);

    } catch (err) {
      console.error("Reset password error:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg || "Invalid field")
            .join(", ")
        );
      } else if (
        typeof detail === "object" &&
        detail !== null
      ) {
        setError(
          detail.msg || "Password reset failed."
        );
      } else {
        setError(
          detail ||
          "Password reset failed. Please try again."
        );
      }

      setShowConfirmation(false);

    } finally {
      setLoading(false);
    }
  };


  const cancelPasswordChange = () => {
    setShowConfirmation(false);
  };


  return (
    <div className="modern-reset-page">

      <div className="modern-reset-container">

        {/* Brand */}
        <div className="modern-reset-brand">

          <div className="modern-reset-logo">
            LG
          </div>

          <div className="modern-reset-brand-text">
            <strong>LabGuard</strong>
            <span>Laboratory Management System</span>
          </div>

        </div>


        {/* Card */}
        <div className="modern-reset-card">

          {!message && !showConfirmation && (
            <>
              <div className="modern-reset-icon">
                🔐
              </div>

              <div className="modern-reset-heading">

                <span>PASSWORD SECURITY</span>

                <h1>Reset Password</h1>

                <p>
                  Enter your new password below.
                </p>

              </div>


              {error && (
                <div className="modern-reset-error">
                  {error}
                </div>
              )}


              <form onSubmit={handleSubmit}>

                <div className="modern-reset-form-group">

                  <label htmlFor="new-password">
                    New Password
                  </label>

                  <input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    required
                  />

                </div>


                <div className="modern-reset-form-group">

                  <label htmlFor="confirm-password">
                    Confirm Password
                  </label>

                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    required
                  />

                </div>


                <button
                  type="submit"
                  className="modern-reset-primary"
                >
                  Submit
                  <span>→</span>
                </button>

              </form>


              <button
                type="button"
                className="modern-reset-back"
                onClick={() => navigate("/login")}
              >
                ← Back to Login
              </button>
            </>
          )}


          {/* SECOND CONFIRMATION */}
          {showConfirmation && (
            <>
              <div className="modern-reset-confirm-icon">
                !
              </div>

              <div className="modern-reset-heading">

                <span>CONFIRM ACTION</span>

                <h1>Change Password?</h1>

                <p>
                  Are you sure you want to change your
                  LabGuard password?
                </p>

              </div>


              <div className="modern-reset-warning">

                <div>🔒</div>

                <p>
                  Your current password will be replaced
                  with the new password you entered.
                </p>

              </div>


              <div className="modern-reset-confirm-actions">

                <button
                  type="button"
                  className="modern-reset-cancel"
                  onClick={cancelPasswordChange}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="modern-reset-confirm"
                  onClick={confirmPasswordChange}
                  disabled={loading}
                >
                  {loading
                    ? "Changing..."
                    : "Yes, Change Password"}
                </button>

              </div>

            </>
          )}


          {/* SUCCESS */}
          {message && (
            <>
              <div className="modern-reset-success-icon">
                ✓
              </div>

              <div className="modern-reset-heading">

                <span>SUCCESS</span>

                <h1>Password Changed</h1>

                <p>
                  Your password has been successfully
                  updated.
                </p>

              </div>


              <div className="modern-reset-success-box">

                <div>✓</div>

                <p>
                  Your new password is now active.
                  You can use it the next time you log in.
                </p>

              </div>


              <button
                type="button"
                className="modern-reset-primary"
                onClick={() => navigate("/login")}
              >
                Back to Login
                <span>→</span>
              </button>

            </>
          )}

        </div>


        {/* Footer */}
        <footer className="modern-reset-footer">

          <span>© 2026 LabGuard</span>

          <span>
            Laboratory Management System
          </span>

        </footer>

      </div>

    </div>
  );
}

export default ResetPassword;