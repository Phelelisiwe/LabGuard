import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function RegisterBiometrics() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [students, setStudents] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [userType, setUserType] = useState("student"); 
  
  const [loading, setLoading] = useState(false);
  const [isPending, setIsPending] = useState(false); 
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUsers = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API_URL}/admin/students`, { headers }).catch(() => ({ data: [] }));
        const fetchedStudents = Array.isArray(res.data) ? res.data : res.data.students || [];
        setStudents(fetchedStudents);
      } catch (err) {
        setError("Failed to load users. Please refresh the page.");
      }
    };

    fetchUsers();
  }, [navigate, token]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setError("Please select a user first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await axios.post(
        `${API_URL}/admin/register-fpm10a`, 
        { user_id: selectedUser, user_type: userType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("Waiting for fingerprint... Please place their finger on the scanner.");
      setIsPending(true); 
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to initiate enrollment.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await axios.post(
        `${API_URL}/admin/cancel-fpm10a`, 
        { user_id: selectedUser, user_type: userType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("Enrollment cancelled.");
      setIsPending(false); 
      setSelectedUser(""); 
    } catch (err) {
      setError("Failed to cancel enrollment.");
    }
  };

  return (
    <main className="lecturer-main">
      <header className="lecturer-topbar">
        <div>
          <p className="lecturer-eyebrow">SECURITY</p>
          <h1>Register Lab Biometrics</h1>
          <p>Link a physical fingerprint (FPM10A) to a user's account.</p>
        </div>
      </header>

      <section className="lecturer-module-panel" style={{ maxWidth: "600px", margin: "40px auto" }}>
        
        <div className="lecturer-empty-icon" style={{ margin: "0 auto 20px", background: "#eaf2fb", color: "#003b70" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
            <path d="M12 12 2.1 12"/>
            <path d="M12 12 19 19"/>
          </svg>
        </div>

        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>FPM10A Hardware Enrollment</h2>
        
        <form onSubmit={handleEnroll} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div className="lecturer-form-row">
            <label>User Type</label>
            <select value={userType} onChange={(e) => setUserType(e.target.value)} disabled={isPending}>
              <option value="student">Student</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="lecturer-form-row">
            <label>Select User</label>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              required
              disabled={isPending} 
            >
              <option value="">-- Choose a user --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_number || s.employee_number} - {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>

          {!isPending ? (
            <button 
              type="submit" 
              disabled={loading || !selectedUser}
              className="lecturer-primary-button"
              style={{ marginTop: "10px", padding: "16px" }}
            >
              {loading ? "Starting..." : "Start Enrollment on Scanner"}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleCancel}
              className="lecturer-secondary-button"
              style={{ marginTop: "10px", padding: "16px", color: "#8d1428", borderColor: "#f0c5cb" }}
            >
              Cancel Enrollment
            </button>
          )}
        </form>

        {message && <div style={{ marginTop: "20px", padding: "16px", background: "#eaf8f0", color: "#247747", borderRadius: "8px", fontWeight: "bold", textAlign: "center" }}>{message}</div>}
        {error && <div style={{ marginTop: "20px", padding: "16px", background: "#fff1f2", color: "#8d1428", borderRadius: "8px", fontWeight: "bold", textAlign: "center" }}>{error}</div>}
      </section>
    </main>
  );
}

export default RegisterBiometrics;
