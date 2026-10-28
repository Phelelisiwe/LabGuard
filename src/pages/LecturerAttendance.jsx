import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./LecturerAttendance.css";

const API_URL = "https://labguard-dklp.onrender.com";

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAttendanceRange(period, selectedDate, semesterStart, semesterEnd) {
  if (period === "all") return null;

  if (period === "academic-year") {
    if (!/^\d{4}$/.test(String(selectedDate))) return null;
    return {
      start_date: `${selectedDate}-01-01`,
      end_date: `${selectedDate}-12-31`,
    };
  }

  if (period === "semester") {
    if (!semesterStart || !semesterEnd || semesterStart > semesterEnd) {
      return null;
    }

    return { start_date: semesterStart, end_date: semesterEnd };
  }

  const date = new Date(`${selectedDate}T00:00:00`);

  if (period === "day") {
    return { start_date: selectedDate, end_date: selectedDate };
  }

  if (period === "week") {
    const start = new Date(date);
    const dayOfWeek = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOfWeek);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      start_date: formatDateInput(start),
      end_date: formatDateInput(end),
    };
  }

  if (period === "month") {
    return {
      start_date: formatDateInput(
        new Date(date.getFullYear(), date.getMonth(), 1)
      ),
      end_date: formatDateInput(
        new Date(date.getFullYear(), date.getMonth() + 1, 0)
      ),
    };
  }

  return null;
}

function LecturerAttendance() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [periodDate, setPeriodDate] = useState(() =>
    formatDateInput(new Date())
  );
  const [periodYear, setPeriodYear] = useState(() =>
    String(new Date().getFullYear())
  );
  const [semesterStart, setSemesterStart] = useState("");
  const [semesterEnd, setSemesterEnd] = useState("");
  const [appliedRange, setAppliedRange] = useState(null);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/lecturer/modules/${moduleId}/attendance${
            appliedRange
              ? `?${new URLSearchParams(appliedRange).toString()}`
              : ""
          }`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setData(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Failed to load attendance."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [moduleId, navigate, appliedRange]);

  const applyPeriod = (event) => {
    event.preventDefault();
    setError("");

    if (
      period === "semester" &&
      (!semesterStart || !semesterEnd || semesterStart > semesterEnd)
    ) {
      setError("Enter a valid semester start and end date.");
      return;
    }

    const nextRange = getAttendanceRange(
      period,
      period === "academic-year" ? periodYear : periodDate,
      semesterStart,
      semesterEnd
    );

    if (period === "academic-year" && !nextRange) {
      setError("Enter a valid four-digit academic year.");
      return;
    }

    if (!nextRange && !appliedRange) return;

    setLoading(true);
    setAppliedRange(nextRange);
  };

  const clearPeriod = () => {
    setPeriod("all");
    setPeriodDate(formatDateInput(new Date()));
    setSemesterStart("");
    setSemesterEnd("");
    setError("");
    if (appliedRange) setLoading(true);
    setAppliedRange(null);
  };

  const downloadCSV = () => {
    if (!data) return;

    const moduleCode = data.module?.module_code || "Module";
    const moduleName = data.module?.module_name || "Attendance Register";

    const rows = [
      ["LabGuard Attendance Register"],
      ["Module Code", moduleCode],
      ["Module Name", moduleName],
      ...(appliedRange
        ? [["Period", `${appliedRange.start_date} to ${appliedRange.end_date}`]]
        : []),
      ["Total Records", data.attendance?.length || 0],
      [],
      [
        "Student Number",
        "Student Name",
        "Date",
        "Time In",
        "Time Out",
        "Status",
      ],
      ...(data.attendance || []).map((record) => [
        record.student_number,
        record.student_name,
        record.date,
        record.time_in || "-",
        record.time_out || "-",
        record.status || "Present",
      ]),
    ];

    const csvContent =
      "\uFEFF" +
      rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    const dateSuffix = appliedRange
      ? `_${appliedRange.start_date}_to_${appliedRange.end_date}`
      : "";
    link.download = `${moduleCode.replace(/[^a-z0-9_-]/gi, "_")}_attendance${dateSuffix}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!data) return;

    const moduleCode = data.module?.module_code || "Module";
    const moduleName = data.module?.module_name || "Attendance Register";
    const records = data.attendance || [];

    const tableRows = records
      .map(
        (record) => `
          <tr>
            <td>${escapeHtml(record.student_number)}</td>
            <td>${escapeHtml(record.student_name)}</td>
            <td>${escapeHtml(record.date)}</td>
            <td>${escapeHtml(record.time_in || "-")}</td>
            <td>${escapeHtml(record.time_out || "-")}</td>
            <td>${escapeHtml(record.status || "Present")}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError(
        "The print window was blocked. Allow pop-ups for LabGuard and try again."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(moduleCode)} Attendance Register</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #172b45;
              padding: 28px;
            }

            h1 {
              margin-bottom: 6px;
              color: #003b70;
            }

            .subtitle {
              margin-bottom: 24px;
              color: #53657a;
            }

            .details {
              margin-bottom: 20px;
              line-height: 1.8;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }

            th, td {
              padding: 9px 7px;
              border: 1px solid #d7dee8;
              text-align: left;
              overflow-wrap: anywhere;
            }

            th {
              background: #003b70;
              color: white;
            }

            tr:nth-child(even) {
              background: #f2f6fa;
            }

            footer {
              margin-top: 24px;
              font-size: 10px;
              color: #53657a;
            }

            @page {
              size: landscape;
              margin: 12mm;
            }

            @media print {
              body { padding: 0; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>LabGuard Attendance Register</h1>
          <div class="subtitle">Laboratory Management System</div>

          <div class="details">
            <strong>Module:</strong> ${escapeHtml(moduleCode)}<br />
            <strong>Module Name:</strong> ${escapeHtml(moduleName)}<br />
            ${
              appliedRange
                ? `<strong>Period:</strong> ${escapeHtml(appliedRange.start_date)} to ${escapeHtml(appliedRange.end_date)}<br />`
                : ""
            }
            <strong>Total Records:</strong> ${records.length}<br />
            <strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}
          </div>

          <table>
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                tableRows ||
                '<tr><td colspan="6">No attendance records available.</td></tr>'
              }
            </tbody>
          </table>

          <footer>LabGuard — Attendance Register</footer>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="dashboard lecturer-page lecturer-attendance-page">
      <header className="lecturer-page-header">
        <div className="page-heading">
          <span className="page-label">LECTURER PORTAL</span>

          <h1>
            {data?.module?.module_code || "Module"} Attendance
          </h1>

          <p>
            {data?.module?.module_name || "Attendance register"}
          </p>
        </div>

        <button
          className="back-button"
          onClick={() => navigate("/lecturer/modules")}
        >
          ← Back to Modules
        </button>
      </header>

      <main className="lecturer-page-content">
        {loading && (
          <div className="status-card">
            <div className="loading-icon">⟳</div>
            <h2>Loading Attendance</h2>
            <p>Please wait while the attendance register is loaded.</p>
          </div>
        )}

        {error && (
          <div className="error-card">
            <div className="error-icon">!</div>
            <div>
              <h3>Unable to Load Attendance</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section className="attendance-hero-card">
              <div className="attendance-hero-icon">✓</div>

              <div className="attendance-hero-text">
                <span>ATTENDANCE REGISTER</span>
                <h2>{data.module?.module_code || "Module"}</h2>
                <p>{data.module?.module_name || "Attendance register"}</p>
              </div>

              <div className="attendance-total">
                <strong>{data.attendance?.length || 0}</strong>
                <span>Attendance Records</span>
              </div>
            </section>

            <section className="attendance-period-card">
              <div className="attendance-period-heading">
                <h2>Attendance period</h2>
                <p>
                  Filter the register by day, week, month or the dates of a
                  semester. Downloads use the selected period.
                </p>
              </div>
              <form className="attendance-period-form" onSubmit={applyPeriod}>
                <div className="attendance-period-field">
                  <label htmlFor="attendance-period">Period</label>
                  <select
                    id="attendance-period"
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                  >
                    <option value="all">All records</option>
                    <option value="academic-year">Academic year</option>
                    <option value="semester">Semester</option>
                    <option value="month">Month</option>
                    <option value="week">Week</option>
                    <option value="day">Day</option>
                  </select>
                </div>

                {period === "academic-year" ? (
                  <div className="attendance-period-field">
                    <label htmlFor="attendance-period-year">Academic year</label>
                    <input
                      id="attendance-period-year"
                      type="number"
                      min="2000"
                      max="9999"
                      step="1"
                      value={periodYear}
                      onChange={(event) => setPeriodYear(event.target.value)}
                      required
                    />
                  </div>
                ) : period === "semester" ? (
                  <>
                    <div className="attendance-period-field">
                      <label htmlFor="semester-start">Semester starts</label>
                      <input
                        id="semester-start"
                        type="date"
                        value={semesterStart}
                        onChange={(event) => setSemesterStart(event.target.value)}
                        required
                      />
                    </div>
                    <div className="attendance-period-field">
                      <label htmlFor="semester-end">Semester ends</label>
                      <input
                        id="semester-end"
                        type="date"
                        value={semesterEnd}
                        onChange={(event) => setSemesterEnd(event.target.value)}
                        min={semesterStart || undefined}
                        required
                      />
                    </div>
                  </>
                ) : period !== "all" ? (
                  <div className="attendance-period-field">
                    <label htmlFor="attendance-period-date">
                      {period === "day" ? "Choose day" : "Choose a date"}
                    </label>
                    <input
                      id="attendance-period-date"
                      type="date"
                      value={periodDate}
                      onChange={(event) => setPeriodDate(event.target.value)}
                      required
                    />
                  </div>
                ) : null}

                <div className="attendance-period-buttons">
                  <button type="submit" className="attendance-download-button">
                    Apply period
                  </button>
                  {appliedRange && (
                    <button
                      type="button"
                      className="attendance-period-clear"
                      onClick={clearPeriod}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
              {appliedRange && (
                <p className="attendance-period-active">
                  Showing {appliedRange.start_date} through {appliedRange.end_date}
                </p>
              )}
            </section>

            <section className="attendance-actions-card">
              <div className="attendance-actions-description">
                <span>MODULE MANAGEMENT</span>
                <h2>Manage Attendance</h2>
                <p>
                  View students, monitor overall attendance,
                  or generate the next attendance prediction.
                </p>
              </div>

              <div className="quick-actions-buttons">
                <button
                  className="view-students-action"
                  onClick={() =>
                    navigate(`/lecturer/students/${moduleId}`)
                  }
                >
                  View Students <span>→</span>
                </button>

                <button
                  className="overall-attendance-action"
                  onClick={() =>
                    navigate(`/lecturer/attendance/${moduleId}/overall`)
                  }
                >
                  Overall Attendance <span>→</span>
                </button>

                <button
                  className="predict-attendance-action"
                  onClick={() =>
                    navigate(`/lecturer/attendance/${moduleId}/prediction`)
                  }
                >
                  Predict Attendance <span>→</span>
                </button>
              </div>
            </section>

            <section className="attendance-section">
              <div className="section-heading">
                <div>
                  <span>STUDENT ATTENDANCE</span>
                  <h2>Attendance Register</h2>
                  <p>
                    Attendance records for students registered
                    in this module.
                  </p>
                </div>

                <div className="attendance-count-badge">
                  {data.attendance?.length || 0} Records
                </div>
              </div>

              <div className="attendance-download-actions">
                <button
                  type="button"
                  className="attendance-download-button"
                  onClick={downloadCSV}
                >
                  Download CSV
                </button>

                <button
                  type="button"
                  className="attendance-download-button attendance-pdf-button"
                  onClick={downloadPDF}
                >
                  Download PDF
                </button>
              </div>

              {!data.attendance?.length ? (
                <div className="empty-attendance">
                  <div className="empty-icon">📋</div>
                  <h3>No Attendance Records</h3>
                  <p>
                    No students have attended this module yet.
                  </p>
                </div>
              ) : (
                <div className="attendance-table-wrapper">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Student Number</th>
                        <th>Student</th>
                        <th>Date</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.attendance.map((record) => (
                        <tr key={record.attendance_id}>
                          <td>
                            <span className="student-number">
                              {record.student_number}
                            </span>
                          </td>

                          <td>
                            <div className="student-name-cell">
                              <div className="student-avatar">
                                {record.student_name?.charAt(0).toUpperCase()}
                              </div>
                              <strong>{record.student_name}</strong>
                            </div>
                          </td>

                          <td>
                            <span className="date-value">
                              {record.date}
                            </span>
                          </td>

                          <td>{record.time_in || "-"}</td>
                          <td>{record.time_out || "-"}</td>

                          <td>
                            <span className="status-present">
                              ✓ {record.status || "Present"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="lecturer-page-footer">
        <strong>LabGuard</strong>
        <span>Laboratory Management System</span>
      </footer>
    </div>
  );
}

export default LecturerAttendance;