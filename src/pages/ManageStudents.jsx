import "./UserManagement.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `${API_URL}/admin/students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStudents(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load students. Please sign in again if your session has expired."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const deleteStudent = async (studentNumber) => {
    if (!window.confirm(`Are you sure you want to delete student ${studentNumber}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

      await axios.delete(
        `${API_URL}/admin/students/${encodeURIComponent(studentNumber)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await loadStudents();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to delete student."
      );
    }
  };

  return (
    <div className="user-management-page">
      <header className="user-management-header">
        <div>
          <span className="user-management-eyebrow">
            LABGUARD ADMINISTRATION
          </span>

          <h1>Manage Students</h1>

          <p>View registered students and manage their accounts.</p>
        </div>

        <button
          type="button"
          className="user-management-back"
          onClick={() => navigate("/admin")}
        >
          ← Back to Dashboard
        </button>
      </header>

      <main className="user-management-card">
        <div className="user-management-card-heading">
          <div>
            <h2>Registered Students</h2>
            <p>Student account directory</p>
          </div>

          <span className="user-management-count">
            {students.length} {students.length === 1 ? "Student" : "Students"}
          </span>
        </div>

        {error && (
          <div className="user-management-message" role="alert">
            {error}
            <button type="button" onClick={loadStudents}>
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="user-management-empty">
            Loading student records...
          </div>
        ) : students.length === 0 && !error ? (
          <div className="user-management-empty">
            <h3>No students found</h3>
            <p>Registered student accounts will appear here.</p>
          </div>
        ) : (
          <div className="user-management-table-wrapper">
            <table className="user-management-table">
              <thead>
                <tr>
                  <th>Student Number</th>
                  <th>Student Name</th>
                  <th>Course</th>
                  <th>Email Address</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student.id ?? student.student_number}>
                    <td>
                      <span className="user-management-id">
                        {student.student_number}
                      </span>
                    </td>

                    <td className="user-management-name">
                      {student.first_name} {student.last_name}
                    </td>

                    <td>{student.course || "—"}</td>

                    <td>{student.email || "—"}</td>

                    <td>
                      <button
                        type="button"
                        className="user-management-delete"
                        onClick={() =>
                          deleteStudent(student.student_number)
                        }
                        disabled={!student.student_number}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="user-management-footer">
        LabGuard · Student Account Management
      </footer>
    </div>
  );
}

export default ManageStudents;