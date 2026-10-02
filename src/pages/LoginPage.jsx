
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [role, setRole] = useState("");

  // STEP 1: Login with email and password
  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email: email.trim(),
          password: password,
        }
      );

      console.log("Login response:", response.data);

      setRole(response.data.role);

      setMessage(
        response.data.message ||
        "Password verified. OTP sent to your email."
      );

      setShowOtp(true);

    } catch (err) {
      console.error("Login error:", err);

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
        setError("Invalid email or password.");
      }

    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/verify-otp`,
        {
          otp: otp,
        }
      );

      console.log(
        "OTP verification response:",
        response.data
      );

      localStorage.setItem(
        "access_token",
        response.data.access_token
      );

      localStorage.setItem(
        "role",
        response.data.role
      );

      localStorage.setItem(
        "user_id",
        response.data.user_id
      );

      localStorage.setItem(
        "email",
        response.data.email
      );

      setMessage("Login successful.");

      const userRole = response.data.role?.trim();

      console.log("User role:", userRole);

      if (
        userRole === "super_admin" ||
        userRole === "Super Admin"
      ) {
        navigate("/admin");

      } else if (
        userRole === "student" ||
        userRole === "Student"
      ) {
        navigate("/student");

      } else if (
        userRole === "lecturer" ||
        userRole === "Lecturer"
      ) {
        navigate("/lecturer");

      } else {
        setError(
          `Unknown user role: ${response.data.role}`
        );
      }

    } catch (err) {
      console.error(
        "OTP verification error:",
        err
      );

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
        setError("Invalid or expired OTP.");
      }

    } finally {
      setLoading(false);
    }
  };

  // Return to the normal login form
  const handleBackToLogin = () => {
    setShowOtp(false);
    setOtp("");
    setError("");
    setMessage("");
    setRole("");
  };

  return (
    <div className="login-page">

      <div className="login-container">

        {/* Header */}
        <div className="login-header">

          <h1>
            LabGuard
          </h1>

          <p>
            Laboratory Management System
          </p>

        </div>

        {/* Login Card */}
        <div className="login-card">

          <h2>
            {showOtp
              ? "Verify OTP"
              : "Sign In"
            }
          </h2>

          <p className="login-description">
            {showOtp
              ? "Enter the verification code sent to your email."
              : "Sign in to access your LabGuard account."
            }
          </p>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          {/* STEP 1: LOGIN */}
          {!showOtp ? (

            <form onSubmit={handleLogin}>

              <div className="form-group">

                <label htmlFor="email">
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

              </div>

              <div className="form-group">

                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

              </div>

              {/* Forgot Password */}
              <div className="forgot-password-container">

                <button
                  type="button"
                  className="forgot-password-button"
                  onClick={() =>
                    navigate("/forgot-password")
                  }
                >
                  Forgot Password?
                </button>

              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Signing In..."
                  : "Login"
                }
              </button>

            </form>

          ) : (

            /* STEP 2: OTP */
            <form onSubmit={handleVerifyOtp}>

              <div className="otp-message">

                <p>
                  A verification code has been sent to:
                </p>

                <strong>
                  {email}
                </strong>

              </div>

              <div className="form-group">

                <label htmlFor="otp">
                  Verification Code
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  maxLength={6}
                  required
                />

              </div>

              <button
                type="submit"
                className="login-button"
                disabled={
                  loading ||
                  otp.length !== 6
                }
              >
                {loading
                  ? "Verifying..."
                  : "Verify OTP"
                }
              </button>

              <button
                type="button"
                className="back-button"
                onClick={handleBackToLogin}
              >
                ← Back to Login
              </button>

            </form>

          )}

          {/* Back to Home */}
          {!showOtp && (
            <button
              type="button"
              className="back-button"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          )}

        </div>

      </div>

    </div>
  );
}

export default LoginPage;

