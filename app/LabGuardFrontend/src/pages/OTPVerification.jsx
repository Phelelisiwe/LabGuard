import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auth/verify-otp`,
        { otp }
      );

      const data = response.data;

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("email", data.email);

      setMessage("OTP verified successfully.");

      if (data.role === "super_admin") {
        navigate("/admin");
      } else if (data.role === "student") {
        navigate("/student");
      } else if (data.role === "lecturer") {
        navigate("/lecturer");
      } else {
        setError("Unknown user role.");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Invalid or expired OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>LabGuard</h1>
        <h2>Verify OTP</h2>

        <p>
          Enter the 6-digit OTP sent to:
        </p>

        <strong>{email || "your email address"}</strong>

        <form onSubmit={verifyOTP}>
          <input
            type="text"
            maxLength="6"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, ""))
            }
          />

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

export default OTPVerification;