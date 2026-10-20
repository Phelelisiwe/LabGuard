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

function LecturerAttendance() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/lecturer/modules/${moduleId}/attendance`,
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
  }, [moduleId, navigate]);

  const downloadCSV = () => {
    if (!data) return;

    const moduleCode = data.module?.module_code || "Module";
    const moduleName = data.module?.module_name || "Attendance Register";

    const rows = [
      ["LabGuard Attendance Register"],
      ["Module Code", moduleCode],
      ["Module Name", moduleName],
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
    link.download = `${moduleCode.replace(/[^a-z0-9_-]/gi, "_")}_attendance.csv`;

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