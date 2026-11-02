import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./LecturerStudents.css";

const API_URL = "https://labguard-dklp.onrender.com";

const formatTime = (timeString) => {
  if (!timeString) return "-";
  if (!timeString.includes("T") && timeString.includes(":")) {
    return timeString.split(".")[0]; 
  }
  try {
    const dateObj = new Date(timeString);
    if (isNaN(dateObj.getTime())) return timeString;
    return dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (err) {
    return timeString;
  }
};

function LecturerAttendance() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [data, setData] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filter States
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterStudentId, setFilterStudentId] = useState("");

  // Fetch Students List for the Dropdown
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/lecturer/modules/${moduleId}/students`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
      setStudentsList(res.data.students || []);
    }).catch(console.error);
  }, [moduleId, token]);

  // Fetch Attendance (Runs when filters change)
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      // Build query string
      const params = new URLSearchParams();
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);
      
      const res = await axios.get(
        `${API_URL}/lecturer/modules/${moduleId}/attendance?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
        return;
      }
      setError(err.response?.data?.detail || "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAttendance();
    // eslint-disable-next-line
  }, [moduleId, token]);

  // Client-side filter for the specific student
  const filteredSessions = data?.sessions.map(session => {
    if (!filterStudentId) return session; // Return whole class
    
    const filteredRecords = session.records.filter(r => String(r.student_id) === filterStudentId);
    const presentCount = filteredRecords.filter(r => r.status === "Present").length;
    
    return {
      ...session,
      records: filteredRecords,
      present: presentCount,
      absent: filteredRecords.length - presentCount,
      total_registered: filteredRecords.length
    };
  }).filter(s => s.records.length > 0) || []; // Hide sessions with no matching students

  // Download CSV
  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);
      if (filterStudentId) params.append("student_id", filterStudentId);

      const res = await axios.get(
        `${API_URL}/lecturer/modules/${moduleId}/attendance/download?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${data?.module.module_code}_attendance.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to download CSV.");
    }
  };

  // Download PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    const moduleName = `${data?.module.module_code} - ${data?.module.module_name}`;
    
    doc.text(`Attendance Register: ${moduleName}`, 14, 15);
    if (filterStartDate || filterEndDate) {
      doc.setFontSize(10);
      doc.text(`Period: ${filterStartDate || "Start"} to ${filterEndDate || "Present"}`, 14, 22);
    }

    let currentY = 30;

    filteredSessions.forEach((session) => {
      // Add Date Header
      doc.setFontSize(12);
      doc.text(`Date: ${session.date}`, 14, currentY);
      currentY += 5;

      // Prepare table data
      const tableData = session.records.map(r => [
        r.student_number,
        r.student_name,
        formatTime(r.time_in),
        formatTime(r.time_out),
        r.status
      ]);

      // Generate Table
      doc.autoTable({
        startY: currentY,
        head: [["Student No.", "Name", "Time In", "Time Out", "Status"]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 59, 112] },
        margin: { left: 14 },
      });

      // Update Y position for next table
      currentY = doc.lastAutoTable.finalY + 15;
      
      // Add page break if needed
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });

    doc.save(`${data?.module.module_code}_attendance.pdf`);
  };

  if (loading && !data) {
    return (
      <main className="lecturer-main">
        <div className="lecturer-state">
          <div className="lecturer-spinner"></div>
          <p>Loading attendance records...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="lecturer-main">
      <button onClick={() => navigate("/lecturer/modules")} className="lecturer-back-btn">
        Back to Modules
      </button>

      <header className="lecturer-topbar" style={{ minHeight: "80px", paddingBottom: "20px" }}>
        <div>
          <p className="lecturer-eyebrow">ATTENDANCE REGISTER</p>
          <h1 style={{ fontSize: "28px" }}>{data?.module.module_code}</h1>
          <p style={{ color: "var(--lecturer-muted)", marginTop: "4px" }}>
            {data?.module.module_name}
          </p>
        </div>
        <div style={{ textAlign: "right", display: "flex", gap: "12px" }}>
          <div className="lecturer-stat-card" style={{ padding: "12px 24px" }}>
            <span style={{ fontSize: "10px", color: "var(--lecturer-red)", fontWeight: "800" }}>CLASSES</span>
            <strong style={{ display: "block", fontSize: "24px", color: "var(--lecturer-blue)" }}>
              {filteredSessions.length}
            </strong>
          </div>
          <div className="lecturer-stat-card" style={{ padding: "12px 24px" }}>
            <span style={{ fontSize: "10px", color: "var(--lecturer-red)", fontWeight: "800" }}>PRESENT</span>
            <strong style={{ display: "block", fontSize: "24px", color: "#23834e" }}>
              {filteredSessions.reduce((acc, s) => acc + s.present, 0)}
            </strong>
          </div>
        </div>
      </header>

      {/* FILTER & DOWNLOAD PANEL */}
      <section className="lecturer-module-panel" style={{ marginBottom: "20px" }}>
        <div className="lecturer-section-heading">
          <div>
            <h2>Filter & Download</h2>
            <p>Choose a date range or specific student to filter the register.</p>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "16px", alignItems: "end" }}>
          <div className="lecturer-form-row" style={{ margin: 0 }}>
            <label>Start Date</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          </div>
          <div className="lecturer-form-row" style={{ margin: 0 }}>
            <label>End Date</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
          </div>
          <div className="lecturer-form-row" style={{ margin: 0 }}>
            <label>Student</label>
            <select value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)}>
              <option value="">Whole Class</option>
              {studentsList.map(s => (
                <option key={s.id} value={s.id}>{s.student_number} - {s.first_name} {s.last_name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={fetchAttendance} className="lecturer-primary-button" style={{ padding: "12px" }}>
              Apply
            </button>
            <button onClick={downloadCSV} className="lecturer-secondary-button" style={{ padding: "12px" }}>
              Export CSV
            </button>
            <button onClick={downloadPDF} className="lecturer-secondary-button" style={{ padding: "12px" }}>
              Export PDF
            </button>
          </div>
        </div>
      </section>

      {/* ATTENDANCE TABLES */}
      {error && <div className="lecturer-error">{error}</div>}

      {filteredSessions.length === 0 ? (
        <div className="lecturer-state">
          <div className="lecturer-empty-icon">▤</div>
          <h3>No Attendance Found</h3>
          <p>There are no records matching your current filters.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {filteredSessions.map((session) => (
            <section key={session.date} className="lecturer-module-panel" style={{ marginTop: 0 }}>
              <div className="lecturer-section-heading">
                <div>
                  <h2>Date: {session.date}</h2>
                  <p>Present: {session.present} / {session.total_registered} students</p>
                </div>
                <span className="lecturer-level-tag" style={{ background: session.absent > 0 ? "#fff1f2" : "#eaf8f0", color: session.absent > 0 ? "#8d1428" : "#247747" }}>
                  {session.absent} Absent
                </span>
              </div>

              <div className="student-table-container">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Student No.</th>
                      <th>Name</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.records.map((record) => (
                      <tr key={record.student_id}>
                        <td style={{ fontWeight: "600" }}>{record.student_number}</td>
                        <td>{record.student_name}</td>
                        <td>{formatTime(record.time_in)}</td>
                        <td>{formatTime(record.time_out)}</td>
                        <td>
                          <span style={{ 
                            padding: "4px 10px", 
                            borderRadius: "20px", 
                            fontSize: "11px", 
                            fontWeight: "700",
                            background: record.status === "Present" ? "#eaf8f0" : "#fff1f2",
                            color: record.status === "Present" ? "#247747" : "#8d1428"
                          }}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

export default LecturerAttendance;
