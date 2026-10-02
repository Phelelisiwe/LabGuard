
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
    password: "",
    confirm_password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

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
          employee_number: formData.employee_number,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          confirm_password: formData.confirm_password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        response.data.message || "Employee registered successfully."
      );

      setFormData({
        employee_number: "",
        first_name: "",
        last_name: "",
        email: "",
        role: "",
        password: "",
        confirm_password: "",
      });
    } catch (err) {
      console.error("Employee registration error:", err);

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
        setError("Employee registration failed.");
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
        </p>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Employee Number</label>
            <input
              type="text"
              name="employee_number"
              value={formData.employee_number}
              onChange={handleChange}
              placeholder="Enter employee number"
              required
            />
          </div>

          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="Enter first name"
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Enter last name"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="form-group">
            <label>Employee Role</label>

            <select
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

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              minLength="8"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>

            <input
              type="password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Confirm password"
              minLength="8"
              required
            />
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


