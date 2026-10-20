
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://labguard-dklp.onrender.com";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function timeToMinutes(time) {
  if (!time) return 0;
  const [hours, minutes, seconds = 0] = String(time).split(":").map(Number);
  return hours * 60 + minutes + seconds / 60;
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ");
}

function formatTime(time) {
  return time ? String(time).slice(0, 5) : "—";
}

function AssignLecturer() {
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedLecturerId, setSelectedLecturerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  });

  const getErrorMessage = (err) => {
    const detail = err.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg).join(", ");
    }
    if (typeof detail === "string") return detail;
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
      const [timetableResponse, employeesResponse] = await Promise.all([
        axios.get(`${API_URL}/timetable/`, config),
        axios.get(`${API_URL}/admin/employees`, config),
      ]);

      setTimetable(timetableResponse.data);

      setLecturers(
        employeesResponse.data.filter((employee) =>
          ["lecturer", "assistant lecturer"].includes(
            normalizeRole(employee.role)
          )
        )
      );
    } catch (err) {
      console.error("Failed to load lecturer assignment data:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group timetable entries into modules and keep each module's sessions.
  const modules = useMemo(() => {
    const grouped = new Map();

    for (const entry of timetable) {
      if (!entry.active) continue;

      if (!grouped.has(entry.module_id)) {
        grouped.set(entry.module_id, {
          id: entry.module_id,
          sessions: [],
          lecturerIds: new Set(),
        });
      }

      const module = grouped.get(entry.module_id);
      module.sessions.push(entry);

      if (entry.lecturer_id != null) {
        module.lecturerIds.add(Number(entry.lecturer_id));
      }
    }

    return [...grouped.values()]
      .map((module) => ({
        ...module,
        sessions: module.sessions.sort(
          (a, b) =>
            DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week) ||
            timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        ),
        assignedLecturerId:
          module.lecturerIds.size === 1
            ? [...module.lecturerIds][0]
            : null,
        hasMixedAssignments: module.lecturerIds.size > 1,
      }))
      .sort((a, b) => a.id - b.id);
  }, [timetable]);

  const selectedModule = modules.find(
    (module) => String(module.id) === selectedModuleId
  );

  // Only modules with no existing lecturer assignment are assignable.
  const unassignedModules = modules.filter(
    (module) =>
      module.lecturerIds.size === 0 && !module.hasMixedAssignments
  );

  const assignedModules = modules.filter(
    (module) => module.lecturerIds.size > 0
  );

  // A lecturer is available only if every session of the selected
  // module is free of clashes with their other active sessions.
  const availableLecturers = useMemo(() => {
    if (!selectedModule) return [];

    return lecturers.filter((lecturer) => {
      const lecturerId = Number(lecturer.id);

      return selectedModule.sessions.every((session) => {
        return !timetable.some((other) => {
          if (!other.active) return false;
          if (Number(other.lecturer_id) !== lecturerId) return false;
          if (Number(other.module_id) === Number(selectedModule.id)) {
            return false;
          }
          if (other.day_of_week !== session.day_of_week) return false;

          return (
            timeToMinutes(other.start_time) <
              timeToMinutes(session.end_time) &&
            timeToMinutes(other.end_time) >
              timeToMinutes(session.start_time)
          );
        });
      });
    });
  }, [selectedModule, lecturers, timetable]);

  const handleModuleChange = (value) => {
    setSelectedModuleId(value);
    setSelectedLecturerId("");
    setMessage("");
    setError("");
  };

  const handleAssign = async () => {
    if (!selectedModule) {
      setError("Please select a module.");
      return;
    }

    if (!selectedLecturerId) {
      setError("Please select an available lecturer.");
      return;
    }

    if (
      !availableLecturers.some(
        (lecturer) => Number(lecturer.id) === Number(selectedLecturerId)
      )
    ) {
      setError("That lecturer is no longer available. Refresh and try again.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.put(
        `${API_URL}/timetable/module/${selectedModule.id}/assign-lecturer`,
        null,
        {
          ...getConfig(),
          params: { lecturer_id: Number(selectedLecturerId) },
        }
      );

      setMessage(
        `Lecturer assigned successfully to module ${selectedModule.id} (${response.data.length} timetable sessions).`
      );

      setSelectedModuleId("");
      setSelectedLecturerId("");
      await loadData();
    } catch (err) {
      console.error("Module lecturer assignment failed:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const getLecturerName = (lecturerId) => {
    const lecturer = lecturers.find(
      (item) => Number(item.id) === Number(lecturerId)
    );

    return lecturer
      ? `${lecturer.first_name} ${lecturer.last_name}`
      : `Employee ID ${lecturerId}`;
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
            Assign one lecturer to a module for the entire weekly timetable.
            Availability is checked across all levels.
          </p>
        </div>

        {error && <div className="error-message" role="alert">{error}</div>}
        {message && <div className="success-message" role="status">{message}</div>}

        {loading ? (
          <p>Loading modules and lecturers...</p>
        ) : (
          <>
            <section className="admin-card">
              <h2>Assign a Lecturer to a Module</h2>

              {unassignedModules.length === 0 ? (
                <p>
                  No unassigned modules with active timetable sessions were
                  found. Create the module timetable first, or check the
                  existing assignments below.
                </p>
              ) : (
                <>
                  <label htmlFor="module-select">Module</label>
                  <select
                    id="module-select"
                    value={selectedModuleId}
                    onChange={(event) => handleModuleChange(event.target.value)}
                  >
                    <option value="">-- Select Module --</option>
                    {unassignedModules.map((module) => (
                      <option key={module.id} value={String(module.id)}>
                        {module.module_name || module.sessions?.[0]?.module?.module_name || `Module ${module.id}`}
                      </option>
                    ))}
                  </select>

                  {selectedModule && (
                    <>
                      <h3>Weekly sessions for Module {selectedModule.id}</h3>
                      <div style={{ overflowX: "auto" }}>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: "600px",
                          }}
                        >
                          <thead>
                            <tr>
                              <th>Day</th>
                              <th>Time</th>
                              <th>Laboratory</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedModule.sessions.map((session) => (
                              <tr key={session.id}>
                                <td>{session.day_of_week}</td>
                                <td>
                                  {formatTime(session.start_time)}–
                                  {formatTime(session.end_time)}
                                </td>
                                <td>{session.laboratory || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <label htmlFor="lecturer-select">Available lecturer</label>
                      <select
                        id="lecturer-select"
                        value={selectedLecturerId}
                        onChange={(event) =>
                          setSelectedLecturerId(event.target.value)
                        }
                        disabled={availableLecturers.length === 0}
                      >
                        <option value="">-- Select Lecturer --</option>
                        {availableLecturers.map((lecturer) => (
                          <option
                            key={lecturer.id}
                            value={String(lecturer.id)}
                          >
                            {lecturer.first_name} {lecturer.last_name}
                            {lecturer.employee_number
                              ? ` (${lecturer.employee_number})`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {availableLecturers.length === 0 && (
                        <p>
                          No lecturers are available for every session of
                          this module. Check the timetable for clashes.
                        </p>
                      )}

                      <button
                        type="button"
                        className="dashboard-button"
                        style={{ marginTop: "16px" }}
                        disabled={
                          saving ||
                          !selectedLecturerId ||
                          availableLecturers.length === 0
                        }
                        onClick={handleAssign}
                      >
                        {saving ? "Assigning..." : "Assign Lecturer to Module"}
                      </button>
                    </>
                  )}
                </>
              )}
            </section>

            <section className="admin-card">
              <h2>Existing Module Assignments</h2>
              {assignedModules.length === 0 ? (
                <p>No module assignments have been made yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "600px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th>Module ID</th>
                        <th>Lecturer</th>
                        <th>Weekly Sessions</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedModules.map((module) => (
                        <tr key={module.id}>
                          <td>{module.id}</td>
                          <td>
                            {module.hasMixedAssignments
                              ? "Multiple lecturers — needs review"
                              : getLecturerName(module.assignedLecturerId)}
                          </td>
                          <td>{module.sessions.length}</td>
                          <td>
                            {module.hasMixedAssignments
                              ? "Inconsistent assignment"
                              : "Assigned"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <button
              type="button"
              className="dashboard-button"
              onClick={loadData}
              disabled={loading || saving}
            >
              Refresh Assignments
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default AssignLecturer;

