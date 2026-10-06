import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

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
    <div className="dashboard">

      <header>
        <div>
          <h1>
            Attendance Prediction
          </h1>

          <p>
            {data?.module?.module_code || "Module"}{" "}
            {data?.module?.module_name || ""}
          </p>
        </div>

        <button onClick={() => navigate("/lecturer/modules")}>
          Back to Modules
        </button>
      </header>

      <main>

        {loading && (
          <p>
            Generating prediction...
          </p>
        )}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {!loading && !error && data && (
          <>

            {data.prediction === null ? (
              <div className="card">
                <h2>No Prediction Available</h2>

                <p>
                  {data.message}
                </p>
              </div>
            ) : (
              <>

                <div className="card">
                  <h3>
                    Predicted Next Attendance Rate
                  </h3>

                  <h1>
                    {data.predicted_next_attendance_rate}%
                  </h1>

                  <p>
                    Based on the most recent{" "}
                    {data.classes_used} recorded classes.
                  </p>
                </div>

                <div className="card">

                  <h2>
                    Recent Attendance Rates
                  </h2>

                  <table>

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
                              Class {index + 1}
                            </td>

                            <td>
                              {rate}%
                            </td>
                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                  <p>
                    Prediction method:{" "}
                    {data.prediction_method}
                  </p>

                </div>

              </>
            )}

          </>
        )}

      </main>

    </div>
  );
}

export default LecturerPrediction;