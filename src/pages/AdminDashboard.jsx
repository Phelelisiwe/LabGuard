
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const navigate = useNavigate();

  const [deleteType, setDeleteType] = useState("student");
  const [userNumber, setUserNumber] = useState("");

  const handleDelete = (e) => {
    e.preventDefault();

    if (!userNumber.trim()) {
      alert("Please enter a student or employee number.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this ${deleteType}?`
    );

    if (!confirmed) {
      return;
    }

    // We will connect this to the FastAPI DELETE endpoint later
    console.log("Delete:", deleteType, userNumber);

    alert(
      `${deleteType === "student" ? "Student" : "Employee"} deletion submitted.`
    );

    setUserNumber("");
  };

  return (
    <div className="admin-page">

      <nav className="admin-navbar">

        <div className="admin-logo">
          LabGuard
        </div>

        <button
          className="logout-button"
          onClick={() => navigate("/login")}
        >
          Logout
        </button>

      </nav>

      <main className="admin-content">

        <div className="admin-header">

          <h1>Super Admin Dashboard</h1>

          <p>
            Manage LabGuard students and employees.
          </p>

        </div>

        <div className="admin-actions">

          {/* Assign Lecturer */}

          <div className="admin-card">

            <div className="admin-card-icon">
              📚
            </div>

            <h2>Assign Lecturer</h2>

            <p>
              Assign lecturers to the modules they teach.
            </p>

            <button
              className="dashboard-button"
              onClick={() =>
                navigate("/admin/assign-lecturer")
              }
            >
              Assign Lecturer
            </button>

          </div>


          {/* Register Employee */}

          <div className="admin-card">

            <div className="admin-card-icon">
              👨‍💼
            </div>

            <h2>Register Employee</h2>

            <p>
              Register lecturers, assistant lecturers,
              cleaners and IT specialists.
            </p>

            <button
              className="dashboard-button"
              onClick={() =>
                navigate("/admin/register-employee")
              }
            >
              Register Employee
            </button>

          </div>


          {/* Register Student */}

          <div className="admin-card">

            <div className="admin-card-icon">
              🎓
            </div>

            <h2>Register Student</h2>

            <p>
              Register students who are authorized
              to access the laboratory.
            </p>

            <button
              className="dashboard-button"
              onClick={() =>
                navigate("/admin/register-student")
              }
            >
              Register Student
            </button>

          </div>


          {/* Biometric Registration */}

          <div className="admin-card">

            <div className="admin-card-icon">
              🔐
            </div>

            <h2>Biometric Registration</h2>

            <p>
              Register face and fingerprint biometrics
              for students and employees.
            </p>

            <button
              className="dashboard-button"
              onClick={() =>
                navigate("/admin/biometric")
              }
            >
              Register Biometrics
            </button>

          </div>


          {/* Delete User */}

          <div className="admin-card delete-card">

            <div className="admin-card-icon">
              🗑️
            </div>

            <h2>Delete User</h2>

            <p>
              Remove a student or employee from
              the LabGuard system.
            </p>

            <form onSubmit={handleDelete}>

              <div className="delete-form">

                <select
                  value={deleteType}
                  onChange={(e) =>
                    setDeleteType(e.target.value)
                  }
                >
                  <option value="student">
                    Student
                  </option>

                  <option value="employee">
                    Employee
                  </option>

                </select>

                <input
                  type="text"
                  placeholder={
                    deleteType === "student"
                      ? "Student number"
                      : "Employee number"
                  }
                  value={userNumber}
                  onChange={(e) =>
                    setUserNumber(e.target.value)
                  }
                  required
                />

                <button
                  type="submit"
                  className="delete-button"
                >
                  Delete User
                </button>

              </div>

            </form>

          </div>

        </div>

      </main>

    </div>
  );
}

export default AdminDashboard;
