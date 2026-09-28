import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function BiometricRegistration() {
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState("");
  const [faceEmbedding, setFaceEmbedding] = useState("");
  const [fingerprintTemplate, setFingerprintTemplate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const registerFace = async () => {
    try {
      const token = localStorage.getItem("access_token");

      await axios.post(
        `${API_URL}/biometric/students/${studentId}/face`,
        {
          face_embedding: faceEmbedding,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("Face registered successfully.");
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to register face."
      );
    }
  };

  const registerFingerprint = async () => {
    try {
      const token = localStorage.getItem("access_token");

      await axios.post(
        `${API_URL}/biometric/students/${studentId}/fingerprint`,
        {
          fingerprint_template: fingerprintTemplate,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage("Fingerprint registered successfully.");
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Failed to register fingerprint."
      );
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Biometric Registration</h1>

        <button onClick={() => navigate("/admin")}>
          Back
        </button>
      </header>

      <main>
        <input
          type="number"
          placeholder="Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />

        <h3>Face</h3>

        <textarea
          placeholder="Face embedding"
          value={faceEmbedding}
          onChange={(e) => setFaceEmbedding(e.target.value)}
        />

        <button onClick={registerFace}>
          Register Face
        </button>

        <h3>Fingerprint</h3>

        <textarea
          placeholder="Fingerprint template"
          value={fingerprintTemplate}
          onChange={(e) =>
            setFingerprintTemplate(e.target.value)
          }
        />

        <button onClick={registerFingerprint}>
          Register Fingerprint
        </button>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}

export default BiometricRegistration;