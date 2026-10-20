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

    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("You are not logged in. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "https://labguard-dklp.onrender.com/admin/students/register",
        {
          student_number: formData.student_number.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          course: formData.course.trim(),
          current_year: Number(formData.current_year),
          email: formData.email.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        response.data.message || "Student registered successfully."
      );

      setFormData({
        student_number: "",
        first_name: "",
        last_name: "",
        course: "",
        current_year: "",
        email: "",
      });
    } catch (err) {
      console.error("Student registration error:", err);

      if (err.response) {
        const detail = err.response.data?.detail;

        setError(
          typeof detail === "string"
            ? detail
            : "Student registration failed. Please check the details and try again."
        );
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
        <h1>Register Student</h1>

        <p className="registration-description">
          Register a student for LabGuard. The student can set their
          password through the designated account setup process.
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
            <label htmlFor="student_number">Student Number</label>
            <input
              id="student_number"
              type="text"
              name="student_number"
              value={formData.student_number}
              onChange={handleChange}
              placeholder="Enter student number"
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
            <label htmlFor="course">Course</label>
            <input
              id="course"
              type="text"
              name="course"
              value={formData.course}
              onChange={handleChange}
              placeholder="Enter course"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="current_year">Current Year</label>
            <input
              id="current_year"
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
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
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
          type="button"
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