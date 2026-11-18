import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email: email.trim(),
          password,
        }
      );

      const data = response.data;
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user_id", String(data.user_id));
      localStorage.setItem("email", data.email);

      const role = String(data.role || "").trim().toLowerCase();

      if (role === "super_admin") {
        navigate("/admin");
      } else if (role === "student") {
        navigate("/student");
      } else if (role === "lecturer" || role === "assistant lecturer") {
        navigate("/lecturer");
      } else {
        setError(`Unknown user role: ${data.role}`);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail.map((item) => item.msg || "Invalid field").join(", "));
      } else {
        setError(detail || "Invalid email or password.");
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
          <p>Laboratory Management System</p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <h2>Sign In</h2>
          <p className="login-description">
            Sign in to access your LabGuard account.
          </p>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* STEP 1: LOGIN */}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="forgot-password-container">
              <button
                type="button"
                className="forgot-password-button"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Login"}
            </button>
          </form>

          {/* Back to Home */}
          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

