
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./LecturerPrediction.css";

const API_URL = "https://labguard-dklp.onrender.com";

function LecturerPrediction() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrediction = async () => {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/lecturer/modules/${moduleId}/attendance/prediction`,
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
            "Failed to generate attendance prediction."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPrediction();
  }, [moduleId, navigate]);

  return (
    <div className="dashboard prediction-page">
      <header className="prediction-header">
        <div>
          <span className="prediction-header-label">
            LECTURER PORTAL
          </span>

          <h1>Attendance Prediction</h1>

          <p>
            {data?.module?.module_code || "Module"}{" "}
            {data?.module?.module_name || ""}
          </p>
        </div>

        <button
          className="prediction-back-button"
          onClick={() => navigate("/lecturer/modules")}
        >
          Back to Modules
        </button>
      </header>

      <main className="prediction-content">
        {loading && (
          <div className="prediction-loading">
            <div className="prediction-loading-icon">⟳</div>
            <h2>Generating Prediction</h2>
            <p>Loading attendance data for this module.</p>
          </div>
        )}

        {error && (
          <div className="prediction-error">
            <strong>Unable to Generate Prediction</strong>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {data.prediction === null ? (
              <div className="prediction-empty">
                <div className="prediction-empty-icon">!</div>

                <h2>No Prediction Available</h2>

                <p>{data.message}</p>
              </div>
            ) : (
              <>
                <section className="prediction-result">
                  <span className="prediction-result-label">
                    ATTENDANCE FORECAST
                  </span>

                  <h2>Predicted Next Attendance Rate</h2>

                  <div className="prediction-rate">
                    <strong>
                      {data.predicted_next_attendance_rate}
                    </strong>
                    <span>%</span>
                  </div>

                  <p className="prediction-result-description">
                    Based on the most recent{" "}
                    {data.classes_used} recorded classes.
                  </p>
                </section>

                <section className="prediction-history-card">
                  <div className="prediction-history-heading">
                    <div>
                      <span className="prediction-section-label">
                        HISTORICAL DATA
                      </span>

                      <h2>Recent Attendance Rates</h2>

                      <p>
                        Attendance recorded in the most recent
                        classes.
                      </p>
                    </div>

                    <span className="prediction-history-badge">
                      {data.classes_used} Classes
                    </span>
                  </div>

                  <div className="prediction-table-wrapper">
                    <table className="prediction-table">
                      <thead>
                        <tr>
                          <th>Class</th>
                          <th>Attendance Rate</th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.recent_attendance_rates.map(
                          (rate, index) => (
                            <tr key={index}>
                              <td>
                                <span className="prediction-class-number">
                                  Class {index + 1}
                                </span>
                              </td>

                              <td>
                                <div className="prediction-history-rate">
                                  <div className="prediction-history-bar">
                                    <div
                                      className="prediction-history-fill"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            Number(rate) || 0
                                          )
                                        )}%`,
                                      }}
                                    />
                                  </div>

                                  <strong>{rate}%</strong>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="prediction-method">
                    <div className="prediction-method-icon">
                      i
                    </div>

                    <div>
                      <strong>Prediction Method</strong>
                      <p>{data.prediction_method}</p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>

      <footer className="prediction-footer">
        <strong>LabGuard</strong>
        <span>Laboratory Access & Attendance Management</span>
      </footer>
    </div>
  );
}

export default LecturerPrediction;
