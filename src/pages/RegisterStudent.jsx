import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function RegisterStudent() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    student_number: "",
    first_name: "",
    last_name: "",
    course: "",
    current_year: "",
    email: "",
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
      setError("You are not logged in. Please login again.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "https://labguard-dklp.onrender.com/admin/students/register",
        {
          student_number: formData.student_number,
          first_name: formData.first_name,
          last_name: formData.last_name,
          course: formData.course,
          current_year: Number(formData.current_year),
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirm_password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);

      setFormData({
        student_number: "",
        first_name: "",
        last_name: "",
        course: "",
        current_year: "",
        email: "",
        password: "",
        confirm_password: "",
      });
    } catch (err) {
      console.error(err);

      if (err.response) {
        setError(
          err.response.data.detail ||
          "Student registration failed."
        );
      } else {
        setError(
          "Could not connect to the LabGuard backend."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-page">
      <div className="registration-card">

        <h1>Register Student</h1>

        <p className="registration-description">
          Register a student for LabGuard.
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
            <label>Student Number</label>
            <input
              type="text"
              name="student_number"
              value={formData.student_number}
              onChange={handleChange}
              placeholder="Enter student number"
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
            <label>Course</label>
            <input
              type="text"
              name="course"
              value={formData.course}
              onChange={handleChange}
              placeholder="Enter course"
              required
            />
          </div>

          <div className="form-group">
            <label>Current Year</label>
            <input
              type="number"
              name="current_year"
              value={formData.current_year}
              onChange={handleChange}
              placeholder="Enter current year"
              min="1"
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
            {loading ? "Registering..." : "Register Student"}
          </button>

        </form>

        <button
          className="back-dashboard-button"
          onClick={() => navigate("/admin")}
        >
          Back to Dashboard
        </button>

      </div>
    </div>
  );
}

export default RegisterStudent;
