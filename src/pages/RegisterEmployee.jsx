import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function RegisterEmployee() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("You are not logged in. Please login as Super Admin.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "https://labguard-dklp.onrender.com/admin/employees/register",
        {
          employee_number: formData.employee_number.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          role: formData.role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        response.data.message ||
          "Employee registered. Account instructions will be sent by email."
      );

      setFormData({
        employee_number: "",
        first_name: "",
        last_name: "",
        email: "",
        role: "",
      });
    } catch (err) {
      console.error("Employee registration error:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail.map((item) => item.msg || "Invalid field").join(", ")
        );
      } else if (detail) {
        setError(String(detail));
      } else {
        setError("Could not connect to the LabGuard backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-page">
      <div className="registration-card">
        <h1>Register Employee</h1>

        <p className="registration-description">
          Register a lecturer or other LabGuard employee.
          Login instructions will be sent to their email address.
        </p>

        {message && (
          <div className="success-message" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="employee_number">Employee Number</label>
            <input
              id="employee_number"
              type="text"
              name="employee_number"
              value={formData.employee_number}
              onChange={handleChange}
              placeholder="Enter employee number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <input
              id="first_name"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <input
              id="last_name"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Enter last name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Employee Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="">Select role</option>
              <option value="Lecturer">Lecturer</option>
              <option value="Assistant Lecturer">Assistant Lecturer</option>
              <option value="Cleaner">Cleaner</option>
              <option value="IT Specialist">IT Specialist</option>
            </select>
          </div>

          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register Employee"}
          </button>
        </form>

        <button
          type="button"
          className="back-dashboard-button"
          onClick={() => navigate("/admin")}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default RegisterEmployee;