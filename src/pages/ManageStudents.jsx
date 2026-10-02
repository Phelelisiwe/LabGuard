import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadStudents = async () => {
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

      setStudents(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to load students."
      );
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const deleteStudent = async (studentNumber) => {
    if (!window.confirm("Delete this student?")) return;

    try {
      const token = localStorage.getItem("access_token");

      await axios.delete(
        `${API_URL}/admin/students/${studentNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      loadStudents();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to delete student."
      );
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Manage Students</h1>

        <button onClick={() => navigate("/admin")}>
          Back
        </button>
      </header>

      <main>
        {error && <p className="error">{error}</p>}

        <table>
          <thead>
            <tr>
              <th>Student Number</th>
              <th>Name</th>
              <th>Course</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.student_number}</td>

                <td>
                  {student.first_name} {student.last_name}
                </td>

                <td>{student.course}</td>

                <td>{student.email}</td>

                <td>
                  <button
                    onClick={() =>
                      deleteStudent(student.student_number)
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default ManageStudents;
