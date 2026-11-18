import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://labguard-dklp.onrender.com";

function StudentDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };

        const [profileRes, modulesRes, notifRes] = await Promise.all([
          axios.get(`${API_URL}/student/me`, { headers }),
          axios.get(`${API_URL}/student/modules`, { headers }),
          // Catch notification errors so the whole page doesn't crash
          axios.get(`${API_URL}/student/notifications`, { headers }).catch(() => ({ data: { notifications: [] } }))
        ]);

        setProfile(profileRes.data);
        setModules(modulesRes.data);
        
        // SAFE EXTRACTION: The backend returns { unread_count: 0, notifications: [...] }
        const fetchedNotifs = notifRes.data?.notifications || [];
        setNotifications(Array.isArray(fetchedNotifs) ? fetchedNotifs : []);

      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
          return;
        }
        setError(err.response?.data?.detail || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, token]);

  if (loading) {
    return (
      <main className="lecturer-main">
        <div className="lecturer-state">
          <div className="lecturer-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="lecturer-main">
      <header className="lecturer-topbar">
        <div>
          <p className="lecturer-eyebrow">STUDENT PORTAL</p>
          <h1>Welcome, {profile?.first_name || "Student"}</h1>
        </div>
        <div className="lecturer-topbar-profile">
          {/* Safe charAt extraction */}
          <div className="lecturer-avatar">
            {profile?.first_name && typeof profile.first_name === 'string' ? profile.first_name.charAt(0) : "S"}
          </div>
          <span>{profile?.email}</span>
        </div>
      </header>

      {error && <div className="lecturer-error">{error}</div>}

      <section className="lecturer-welcome" style={{ marginTop: "20px" }}>
        <div>
          <p className="lecturer-eyebrow">OVERVIEW</p>
          <h2>Your Academic Profile</h2>
          <p>Course: <strong>{profile?.course}</strong> | Year: <strong>{profile?.current_year}</strong></p>
        </div>
      </section>

      <section className="lecturer-stat-grid">
        <div className="lecturer-stat-card">
          <span>MODULES</span>
          <strong>{modules.length}</strong>
          <small>registered this semester</small>
        </div>
        <div className="lecturer-stat-card">
          <span>NOTIFICATIONS</span>
          <strong>{notifications.filter(n => !n.read).length}</strong>
          <small>unread alerts</small>
        </div>
      </section>

      <section className="lecturer-notification-panel">
        <div className="lecturer-section-heading">
          <div>
            <h2>Recent Alerts</h2>
            <p>Updates from your lecturers</p>
          </div>
        </div>
        
        <div className="lecturer-notification-list" style={{ minHeight: "200px" }}>
          {notifications.length === 0 ? (
            <div className="lecturer-notice-empty">No recent notifications.</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="lecturer-notice-item" style={{ opacity: n.read ? 0.6 : 1 }}>
                <div className="lecturer-notice-tag">{n.type === "late" ? "Late" : "Update"}</div>
                <div className="lecturer-notice-copy">
                  <strong>{n.title}</strong>
                  <span>{n.module_code}</span>
                  <p>{n.message}</p>
                </div>
                <small>{new Date(n.created_at).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default StudentDashboard;
