
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/auth/forgot-password",
        {
          email: email.trim(),
        }
      );

      setMessage(
        response.data.message ||
        "If the email exists, a password reset link has been sent."
      );

    } catch (err) {
      console.error("Forgot password error:", err);

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
          "Unable to process your request. Please try again."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* Header */}
        <div className="login-header">
          <h1>LabGuard</h1>

          <p>
            Laboratory Management System
          </p>
        </div>

        {/* Forgot Password Card */}
        <div className="login-card">

          <h2>Forgot Password?</h2>

          <p className="login-description">
            Enter the email address linked to your LabGuard
            account. We will send you a password reset link.
          </p>

          {/* Error */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="form-group">

              <label htmlFor="forgot-email">
                Email Address
              </label>

              <input
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"
              }
            </button>

          </form>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/login")}
          >
            ← Back to Login
          </button>

        </div>

      </div>

    </div>
  );
}

export default ForgotPassword;

