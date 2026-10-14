
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { startAuthentication } from "@simplewebauthn/browser";
import * as faceapi from "@vladmandic/face-api";

function StudentCheckIn() {
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [method, setMethod] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [checkingClass, setCheckingClass] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const token = localStorage.getItem("access_token");
  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://labguard-dklp.onrender.com";

  const MODEL_URL =
    "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    loadActiveClass();
    fetchAttendance();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
    // Initial page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // ACTIVE CLASS
  // =====================================================

  const loadActiveClass = async () => {
    setCheckingClass(true);
    setActiveClass(null);

    try {
      // This is the existing attendance-session current endpoint.
      const response = await axios.get(
        `${API_URL}/attendance-session/current`,
        { headers: authHeaders }
      );

      const data = response.data;

      if (
        data &&
        data.status === "active"
      ) {
        setActiveClass(data);
      } else if (
        data &&
        (data.module_id || data.module_code || data.module_name)
      ) {
        setActiveClass(data);
      } else {
        setActiveClass(null);
      }
    } catch (err) {
      // No active class may be returned as 404 or 400 by the API.
      if (
        err.response?.status === 404 ||
        err.response?.status === 400
      ) {
        setActiveClass(null);
      } else {
        console.error("Active class lookup error:", err);
        setError(
          err.response?.data?.detail ||
            "Could not check the active class."
        );
      }
    } finally {
      setCheckingClass(false);
    }
  };

  // =====================================================
  // ATTENDANCE HISTORY
  // =====================================================

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/student/attendance`,
        { headers: authHeaders }
      );

      setAttendance(response.data);
    } catch (err) {
      console.error("Load attendance error:", err);
      setError("Could not load attendance records.");
    }
  };

  // =====================================================
  // STOP CAMERA
  // =====================================================

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  // Connect camera stream to the video element.
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error("Video playback error:", err);
      });
    }
  }, [cameraActive]);

  // =====================================================
  // FACE MODELS
  // =====================================================

  const loadFaceModels = async () => {
    setFaceLoading(true);

    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    } catch (err) {
      console.error("Face model loading error:", err);
      throw new Error("Unable to load face recognition models.");
    } finally {
      setFaceLoading(false);
    }
  };

  // =====================================================
  // FACE ATTENDANCE
  // =====================================================

  const handleFaceCheckIn = async () => {
    if (!activeClass) {
      setError("No class is active now.");
      return;
    }

    setLoading(true);
    setMethod("face");
    setMessage("");
    setError("");

    try {
      if (!cameraActive) {
        await loadFaceModels();

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not supported by this browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        streamRef.current = stream;
        setCameraActive(true);
        setMessage("Position your face inside the camera frame.");
        return;
      }

      if (!videoRef.current) {
        throw new Error("Camera is not ready. Please try again.");
      }

      setMessage("Detecting your face...");

      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("No face detected. Position your face clearly in the camera.");
        setMessage("");
        return;
      }

      const faceEmbedding = Array.from(detection.descriptor).join(",");
      setMessage("Face detected. Verifying...");

      const response = await axios.post(
        `${API_URL}/biometric/attendance/face/verify`,
        null,
        {
          params: {
            face_embedding: faceEmbedding,
          },
          headers: authHeaders,
        }
      );

      if (response.data.success) {
        setMessage(
          response.data.message ||
            "Face verified. Attendance recorded successfully."
        );
        stopCamera();
        await fetchAttendance();
        await loadActiveClass();
      }
    } catch (err) {
      console.error("Face attendance error:", err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Face verification failed."
      );
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FINGERPRINT ATTENDANCE
  // =====================================================

  const handleFingerprintCheckIn = async () => {
    if (!activeClass) {
      setError("No class is active now.");
      return;
    }

    setLoading(true);
    setMethod("fingerprint");
    setMessage("");
    setError("");

    try {
      const optionsResponse = await axios.get(
        `${API_URL}/biometric/attendance/fingerprint/options`,
        { headers: authHeaders }
      );

      setMessage("Follow the biometric prompt on your device.");

      const authenticationResponse = await startAuthentication({
        optionsJSON: optionsResponse.data,
      });

      setMessage("Biometric verified. Confirming attendance...");

      // The backend obtains the module from the active session.
      const response = await axios.post(
        `${API_URL}/biometric/attendance/fingerprint/verify`,
        authenticationResponse,
        {
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setMessage(
          response.data.message ||
            "Fingerprint verified. Attendance recorded successfully."
        );
        await fetchAttendance();
        await loadActiveClass();
      }
    } catch (err) {
      console.error("Fingerprint attendance error:", err);

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "AbortError"
      ) {
        setError("Biometric verification was cancelled.");
      } else {
        setError(
          err.response?.data?.detail ||
            "Fingerprint verification failed."
        );
      }

      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GPS ATTENDANCE
  // =====================================================

  const handleGPSCheckIn = async () => {
    if (!activeClass) {
      setError("No class is active now.");
      return;
    }

    if (!navigator.geolocation) {
      setError("Your browser does not support location services.");
      return;
    }

    setLoading(true);
    setMethod("gps");
    setMessage("");
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await axios.post(
            `${API_URL}/attendance/gps/check-in`,
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            { headers: authHeaders }
          );

          if (response.data.success) {
            setMessage(
              response.data.message ||
                "GPS attendance recorded successfully."
            );
            await fetchAttendance();
            await loadActiveClass();
          } else {
            setError("GPS attendance could not be confirmed.");
          }
        } catch (err) {
          console.error("GPS attendance error:", err);
          setError(
            err.response?.data?.detail ||
              "GPS attendance failed. Please try again."
          );
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);

        if (err.code === 1) {
          setError("Please allow location access to check in.");
        } else if (err.code === 2) {
          setError("Your location is unavailable. Please try again.");
        } else {
          setError("Location request timed out. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // =====================================================
  // CHECK-OUT
  // =====================================================

  const handleCheckOut = async () => {
    if (!activeClass) {
      setError("No class is active now.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/attendance/check-out`,
        {},
        { headers: authHeaders }
      );

      setMessage(response.data.message || "Check-out successful.");
      await fetchAttendance();
      await loadActiveClass();
    } catch (err) {
      console.error("Check-out error:", err);
      setError(
        err.response?.data?.detail ||
          "Check-out failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  const activeModuleName =
    activeClass?.module_code ||
    activeClass?.module_name ||
    activeClass?.module?.module_code ||
    activeClass?.module?.module_name ||
    "Active class";

  return (
    <div className="attendance-page">
      <header className="attendance-header">
        <div className="attendance-brand">
          <div className="tut-logo">TUT</div>
          <div className="brand-line"></div>
          <div>
            <h1>LabGuard</h1>
            <span>Laboratory Management System</span>
          </div>
        </div>

        <button
          type="button"
          className="attendance-back-button"
          onClick={() => navigate("/student")}
        >
          ← Back
        </button>
      </header>

      <main className="attendance-main">
        <div className="attendance-title">
          <p>STUDENT PORTAL</p>
          <h2>Lab Attendance</h2>
          <span>
            Your registered modules and active class session determine
            which class you can attend.
          </span>
        </div>

        <section className="checkin-card">
          <div className="card-heading">
            <div className="heading-icon">✓</div>
            <div>
              <h3>Lab Check-In / Check-Out</h3>
              <p>No manual module selection is required.</p>
            </div>
          </div>

          {checkingClass && (
            <div className="attendance-info">
              Checking for an active class...
            </div>
          )}

          {!checkingClass && activeClass && (
            <div className="attendance-success">
              <strong>Active class:</strong> {activeModuleName}
              {activeClass.laboratory
                ? ` — ${activeClass.laboratory}`
                : ""}
            </div>
          )}

          {!checkingClass && !activeClass && (
            <div className="attendance-error">
              No class is active now.
            </div>
          )}

          {message && (
            <div className="attendance-success" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="attendance-error" role="alert">
              {error}
            </div>
          )}

          <div className="attendance-form">
            <div className="attendance-actions">
              <button
                type="button"
                className="checkin-button"
                onClick={handleFaceCheckIn}
                disabled={loading || checkingClass || !activeClass}
              >
                {loading && method === "face"
                  ? faceLoading
                    ? "Loading Face Models..."
                    : cameraActive
                      ? "Verifying Face..."
                      : "Starting Camera..."
                  : cameraActive
                    ? "Verify Face & Check In"
                    : "👤 Verify Face & Check In"}
              </button>

              <button
                type="button"
                className="checkin-button"
                onClick={handleFingerprintCheckIn}
                disabled={loading || checkingClass || !activeClass}
              >
                {loading && method === "fingerprint"
                  ? "Verifying Fingerprint..."
                  : "🖐 Verify Fingerprint & Check In"}
              </button>

              <button
                type="button"
                className="checkin-button"
                onClick={handleGPSCheckIn}
                disabled={loading || checkingClass || !activeClass}
              >
                {loading && method === "gps"
                  ? "Checking Location..."
                  : "📍 GPS Check-In"}
              </button>

              <button
                type="button"
                className="checkout-button"
                onClick={handleCheckOut}
                disabled={loading || checkingClass || !activeClass}
              >
                ⇥ Check Out
              </button>
            </div>

            {cameraActive && (
              <div className="biometric-camera">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="biometric-video"
                />

                <button
                  type="button"
                  className="back-button"
                  onClick={() => {
                    stopCamera();
                    setMethod("");
                    setMessage("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Cancel Camera
                </button>
              </div>
            )}

            <div className="biometric-checkin-info">
              <p>
                <strong>Attendance information</strong>
              </p>
              <span>
                LabGuard uses the active class session to determine the
                module. Face and fingerprint verification require a
                registered biometric. GPS requires location permission
                and checks proximity to the saved classroom coordinates.
              </span>
            </div>

            <button
              type="button"
              className="back-button"
              onClick={() => {
                setError("");
                setMessage("");
                loadActiveClass();
                fetchAttendance();
              }}
              disabled={loading || checkingClass}
            >
              Refresh Class Status
            </button>
          </div>
        </section>

        <section className="history-card">
          <div className="history-header">
            <div>
              <h3>My Attendance</h3>
              <p>Your laboratory attendance records.</p>
            </div>
            <div className="attendance-count">
              {attendance.length} Records
            </div>
          </div>

          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {attendance.length > 0 ? (
                  attendance.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>
                          {record.module_code ||
                            record.module_name ||
                            "Module"}
                        </strong>
                      </td>
                      <td>{record.date || "-"}</td>
                      <td>{record.time_in || "-"}</td>
                      <td>{record.time_out || "-"}</td>
                      <td>
                        <span
                          className={
                            record.status === "Present"
                              ? "status-present"
                              : "status-absent"
                          }
                        >
                          {record.status || "Present"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-attendance">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="attendance-footer">
        <span>LabGuard • Laboratory Management System</span>
        <span>Tshwane University of Technology</span>
      </footer>
    </div>
  );
}

export default StudentCheckIn;

