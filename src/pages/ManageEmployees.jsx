import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function ManageEmployees() {
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `${API_URL}/admin/employees`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEmployees(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to load employees."
      );
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const deleteEmployee = async (employeeNumber) => {
    if (!window.confirm("Delete this employee?")) return;

    try {
      const token = localStorage.getItem("access_token");

      await axios.delete(
        `${API_URL}/admin/employees/${employeeNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      loadEmployees();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to delete employee."
      );
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Manage Employees</h1>

        <button onClick={() => navigate("/admin")}>
          Back
        </button>
      </header>

      <main>
        {error && <p className="error">{error}</p>}

        <table>
          <thead>
            <tr>
              <th>Employee Number</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.employee_number}</td>

                <td>
                  {employee.first_name} {employee.last_name}
                </td>

                <td>{employee.email}</td>

                <td>{employee.role}</td>

                <td>
                  <button
                    onClick={() =>
                      deleteEmployee(employee.employee_number)
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

export default ManageEmployees;
