
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

  const handleSubmit = async (e) => {
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

    } catch (err) {
      console.error("Reset password error:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg || "Invalid field")
            .join(", ")
        );
      } else if (typeof detail === "object" && detail !== null) {
        setError(
          detail.msg || "Password reset failed."
        );
      } else {
        setError(
          detail ||
          "Password reset failed. Please try again."
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

          <h2>Reset Password</h2>

          <p className="login-description">
            Enter your new password below.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit}>

              <div className="form-group">
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

              <div className="form-group">
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
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Resetting..."
                  : "Reset Password"}
              </button>

            </form>
          )}

          {message && (
            <button
              type="button"
              className="back-button"
              onClick={() => navigate("/login")}
            >
              ← Back to Login
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

export default ResetPassword;


