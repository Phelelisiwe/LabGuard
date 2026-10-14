
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://labguard-dklp.onrender.com";

function AssignLecturer() {
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getConfig = () => {
    const token = localStorage.getItem("access_token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const getErrorMessage = (err) => {
    const detail = err.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (err.response?.status === 401) {
      return "Your session has expired. Please log in again.";
    }

    if (err.response?.status === 403) {
      return "Only the Super Admin can manage lecturer assignments.";
    }

    return err.message || "Something went wrong. Please try again.";
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const config = getConfig();

      const [timetableResponse, employeesResponse] =
        await Promise.all([
          axios.get(`${API_URL}/timetable/`, config),
          axios.get(`${API_URL}/admin/employees`, config),
        ]);

      setTimetable(timetableResponse.data);

      // Support common role formats returned by the backend.
      const lecturerEmployees = employeesResponse.data.filter(
        (employee) => {
          const role = String(employee.role || "")
            .trim()
            .toLowerCase()
            .replaceAll("_", " ");

          return (
            role === "lecturer" ||
            role === "assistant lecturer"
          );
        }
      );

      setLecturers(lecturerEmployees);

      // Prepare the selected lecturer for each timetable entry.
      const initialAssignments = {};

      for (const entry of timetableResponse.data) {
        initialAssignments[entry.id] =
          entry.lecturer_id == null
            ? ""
            : String(entry.lecturer_id);
      }

      setAssignments(initialAssignments);
    } catch (err) {
      console.error("Failed to load assignment data:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (entry) => {
    const lecturerId = assignments[entry.id];

    setMessage("");
    setError("");

    if (!lecturerId) {
      setError("Please select a lecturer first.");
      return;
    }

    setSavingId(entry.id);

    try {
      const response = await axios.put(
        `${API_URL}/timetable/${entry.id}/assign-lecturer`,
        null,
        {
          ...getConfig(),
          params: {
            lecturer_id: Number(lecturerId),
          },
        }
      );

      setMessage(
        `Lecturer assigned successfully to timetable entry #${entry.id}.`
      );

      // Use the returned record, then reload the saved assignments.
      setTimetable((previous) =>
        previous.map((item) =>
          item.id === entry.id ? response.data : item
        )
      );

      await loadData();
    } catch (err) {
      console.error("Assignment failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const handleUnassign = async (entry) => {
    if (
      !window.confirm(
        "Remove the lecturer from this timetable entry?"
      )
    ) {
      return;
    }

    setMessage("");
    setError("");
    setSavingId(entry.id);

    try {
      await axios.put(
        `${API_URL}/timetable/${entry.id}/unassign-lecturer`,
        null,
        getConfig()
      );

      setMessage(
        `Lecturer removed from timetable entry #${entry.id}.`
      );

      await loadData();
    } catch (err) {
      console.error("Unassignment failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const getLecturerName = (lecturerId) => {
    const lecturer = lecturers.find(
      (employee) => employee.id === lecturerId
    );

    if (!lecturer) {
      return lecturerId == null
        ? "Not assigned"
        : `Employee ID ${lecturerId}`;
    }

    return `${lecturer.first_name} ${lecturer.last_name}`;
  };

  const formatTime = (time) => {
    if (!time) return "—";

    // Handles both "09:00:00" and "09:00".
    return String(time).slice(0, 5);
  };

  return (
    <div className="admin-page">
      <nav className="admin-navbar">
        <div className="admin-logo">LabGuard</div>

        <button
          type="button"
          className="logout-button"
          onClick={() => navigate("/admin")}
        >
          Back to Admin
        </button>
      </nav>

      <main className="admin-content">
        <div className="admin-header">
          <h1>Lecturer Assignments</h1>
          <p>
            Assign lecturers to scheduled modules and laboratory
            sessions.
          </p>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="success-message" role="status">
            {message}
          </div>
        )}

        {loading ? (
          <p>Loading timetable and lecturers...</p>
        ) : (
          <>
            <div className="admin-card">
              <h2>Timetable Assignments</h2>

              <p>
                Select a lecturer for each scheduled entry. Changes
                are saved to the backend when you click Assign.
              </p>

              {timetable.length === 0 ? (
                <p>
                  No timetable entries were found. Create timetable
                  entries first, then return here to assign lecturers.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "760px",
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Day",
                          "Time",
                          "Module ID",
                          "Laboratory",
                          "Current Lecturer",
                          "Assign Lecturer",
                          "Actions",
                        ].map((heading) => (
                          <th
                            key={heading}
                            style={{
                              textAlign: "left",
                              padding: "12px 8px",
                              borderBottom: "2px solid #ddd",
                            }}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {timetable.map((entry) => (
                        <tr key={entry.id}>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #ddd",
                            }}
                          >
                            {entry.day_of_week}
                          </td>

                          <td
                            style={{
                              padding: "12px 8px",
                              whiteSpace: "nowrap",
                              borderBottom: "1px solid #ddd",
                            }}
                          >
                            {formatTime(entry.start_time)}–
                            {formatTime(entry.end_time)}
                          </td>

                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #ddd",
                            }}
                          >
                            {entry.module_id}
                          </td>

                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #ddd",
                            }}
                          >
                            {entry.laboratory || "—"}
                          </td>

                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #ddd",
                            }}
                          >
                            {getLecturerName(entry.lecturer_id)}
                          </td>

                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #ddd",
                            }}
                          >
                            <select
                              aria-label={`Lecturer for timetable entry ${entry.id}`}
                              value={assignments[entry.id] ?? ""}
                              onChange={(event) =>
                                setAssignments((previous) => ({
                                  ...previous,
                                  [entry.id]: event.target.value,
                                }))
                              }
                              disabled={savingId === entry.id}
                            >
                              <option value="">
                                -- Select Lecturer --
                              </option>

                              {lecturers.map((lecturer) => (
                                <option
                                  key={lecturer.id}
                                  value={String(lecturer.id)}
                                >
                                  {lecturer.first_name}{" "}
                                  {lecturer.last_name} (
                                  {lecturer.employee_number})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #ddd",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <button
                              type="button"
                              className="dashboard-button"
                              disabled={
                                savingId === entry.id ||
                                !assignments[entry.id] ||
                                lecturers.length === 0
                              }
                              onClick={() => handleAssign(entry)}
                            >
                              {savingId === entry.id
                                ? "Saving..."
                                : "Assign"}
                            </button>

                            {entry.lecturer_id != null && (
                              <button
                                type="button"
                                className="logout-button"
                                style={{ marginLeft: "6px" }}
                                disabled={savingId === entry.id}
                                onClick={() => handleUnassign(entry)}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {lecturers.length === 0 && (
                <p>
                  No lecturers or assistant lecturers were found.
                  Register an employee with the appropriate role first.
                </p>
              )}

              <button
                type="button"
                className="dashboard-button"
                style={{ marginTop: "18px" }}
                onClick={loadData}
                disabled={loading}
              >
                Refresh Assignments
              </button>
            </div>

            <div className="admin-card">
              <h2>Assignment Summary</h2>

              <p>
                Total timetable entries: {timetable.length}
              </p>

              <p>
                Assigned entries:{" "}
                {timetable.filter(
                  (entry) => entry.lecturer_id != null
                ).length}
              </p>

              <p>
                Unassigned entries:{" "}
                {timetable.filter(
                  (entry) => entry.lecturer_id == null
                ).length}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AssignLecturer;
