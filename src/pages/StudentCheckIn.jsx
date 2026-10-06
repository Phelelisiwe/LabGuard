import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { startAuthentication } from "@simplewebauthn/browser";
import * as faceapi from "@vladmandic/face-api";

function StudentCheckIn() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState("");
  const [attendance, setAttendance] = useState([]);

  const [method, setMethod] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const token = localStorage.getItem("access_token");

  const MODEL_URL =
    "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

  useEffect(() => {
    fetchModules();
    fetchAttendance();

    return () => {
      stopCamera();
    };
  }, []);

  // =====================================================
  // LOAD MODULES
  // =====================================================

  const fetchModules = async () => {
    try {
      const response = await axios.get(
        "https://labguard-dklp.onrender.com/student/modules",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setModules(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load your modules.");
    }
  };

  // =====================================================
  // LOAD ATTENDANCE
  // =====================================================

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(
        "https://labguard-dklp.onrender.com/student/attendance",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAttendance(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load attendance records.");
    }
  };

  // =====================================================
  // LOAD FACE MODELS
  // =====================================================

  const loadFaceModels = async () => {
    setFaceLoading(true);

    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(
        MODEL_URL
      );

      await faceapi.nets.faceLandmark68Net.loadFromUri(
        MODEL_URL
      );

      await faceapi.nets.faceRecognitionNet.loadFromUri(
        MODEL_URL
      );
    } catch (err) {
      console.error(
        "Face model loading error:",
        err
      );

      throw new Error(
        "Unable to load face recognition models."
      );
    } finally {
      setFaceLoading(false);
    }
  };

  // =====================================================
  // START CAMERA
  // =====================================================

  const startCamera = async () => {
    try {
      setError("");
      setMessage("");

      await loadFaceModels();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 640,
            },
            height: {
              ideal: 480,
            },
            facingMode: "user",
          },
          audio: false,
        });

      streamRef.current = stream;

      setCameraActive(true);

      setMessage(
        "Position your face inside the camera frame."
      );
    } catch (err) {
      console.error("Camera error:", err);

      if (err.name === "NotAllowedError") {
        setError(
          "Camera permission was denied."
        );
      } else if (err.name === "NotFoundError") {
        setError(
          "No camera was found."
        );
      } else {
        setError(
          err.message ||
            "Unable to start the camera."
        );
      }
    }
  };

  // =====================================================
  // CONNECT VIDEO STREAM
  // =====================================================

  useEffect(() => {
    if (
      cameraActive &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject =
        streamRef.current;

      videoRef.current
        .play()
        .catch((err) =>
          console.error(
            "Video playback error:",
            err
          )
        );
    }
  }, [cameraActive]);

  // =====================================================
  // STOP CAMERA
  // =====================================================

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  // =====================================================
  // FACE ATTENDANCE
  // =====================================================

  const handleFaceCheckIn = async () => {
    if (!selectedModule) {
      setError("Please select a module first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!cameraActive) {
        await startCamera();
        setLoading(false);
        return;
      }

      setMessage("Detecting your face...");

      const detection =
        await faceapi
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
        setError(
          "No face detected. Position your face clearly in the camera."
        );

        setMessage("");
        return;
      }

      const descriptor =
        detection.descriptor;

      if (
        !descriptor ||
        descriptor.length !== 128
      ) {
        setError(
          "Invalid face biometric detected."
        );

        setMessage("");
        return;
      }

      const faceEmbedding =
        Array.from(descriptor).join(",");

      setMessage(
        "Face detected. Verifying..."
      );

      const response =
        await axios.post(
          `https://labguard-dklp.onrender.com/biometric/attendance/face/verify?module_id=${Number(
            selectedModule
          )}`,
          null,
          {
            params: {
              face_embedding:
                faceEmbedding,
            },
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (response.data.success) {
        setMessage(
          response.data.message ||
            "Face verified. Attendance recorded successfully."
        );

        stopCamera();

        await fetchAttendance();
      }

    } catch (err) {
      console.error(
        "Face attendance error:",
        err
      );

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

  const handleFingerprintCheckIn =
    async () => {

      if (!selectedModule) {
        setError(
          "Please select a module first."
        );
        return;
      }

      setLoading(true);
      setMessage("");
      setError("");

      try {

        const optionsResponse =
          await axios.get(
            "https://labguard-dklp.onrender.com/biometric/attendance/fingerprint/options",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const optionsJSON =
          optionsResponse.data;

        setMessage(
          "Follow the fingerprint or biometric prompt on your phone."
        );

        const authenticationResponse =
          await startAuthentication({
            optionsJSON,
          });

        setMessage(
          "Biometric verified by your device. Confirming attendance..."
        );

        const verificationResponse =
          await axios.post(
            `https://labguard-dklp.onrender.com/biometric/attendance/fingerprint/verify?module_id=${Number(
              selectedModule
            )}`,
            authenticationResponse,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },
            }
          );

        if (
          verificationResponse.data
            .success
        ) {
          setMessage(
            verificationResponse.data
              .message ||
              "Fingerprint verified. Attendance recorded successfully."
          );

          await fetchAttendance();
        }

      } catch (err) {

        console.error(
          "Fingerprint attendance error:",
          err
        );

        if (
          err?.name ===
            "NotAllowedError" ||
          err?.name ===
            "AbortError"
        ) {
          setError(
            "Biometric verification was cancelled. Attendance was not recorded."
          );
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
  // CHECK-OUT
  // =====================================================

  const handleCheckOut =
    async () => {

      if (!selectedModule) {
        setError(
          "Please select a module first."
        );
        return;
      }

      setLoading(true);
      setMessage("");
      setError("");

      try {

        const response =
          await axios.post(
            "https://labguard-dklp.onrender.com/attendance/check-out",
            {
              module_id:
                Number(selectedModule),
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setMessage(
          response.data.message
        );

        await fetchAttendance();

      } catch (err) {

        console.error(err);

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

  return (
    <div className="attendance-page">

      <header className="attendance-header">

        <div className="attendance-brand">

          <div className="tut-logo">
            TUT
          </div>

          <div className="brand-line"></div>

          <div>
            <h1>LabGuard</h1>
            <span>
              Laboratory Management System
            </span>
          </div>

        </div>

        <button
          className="attendance-back-button"
          onClick={() =>
            navigate("/student")
          }
        >
          ← Back
        </button>

      </header>

      <main className="attendance-main">

        <div className="attendance-title">

          <p>STUDENT PORTAL</p>

          <h2>
            Lab Attendance
          </h2>

          <span>
            Select your module and verify your
            identity using either Face or Fingerprint.
          </span>

        </div>

        <section className="checkin-card">

          <div className="card-heading">

            <div className="heading-icon">
              ✓
            </div>

            <div>
              <h3>
                Lab Check-In / Check-Out
              </h3>

              <p>
                Choose one biometric verification
                method.
              </p>
            </div>

          </div>

          {message && (
            <div className="attendance-success">
              {message}
            </div>
          )}

          {error && (
            <div className="attendance-error">
              {error}
            </div>
          )}

          <div className="attendance-form">

            <div className="module-field">

              <label>
                Module
              </label>

              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(
                    e.target.value
                  );
                  setError("");
                  setMessage("");
                }}
                disabled={loading}
              >

                <option value="">
                  Select a module
                </option>

                {modules.map((item) => (

                  <option
                    key={
                      item.id ||
                      item.module_id
                    }
                    value={
                      item.id ||
                      item.module_id
                    }
                  >
                    {item.module_code} -{" "}
                    {item.module_name}
                  </option>

                ))}

              </select>

            </div>

            <div className="attendance-actions">

              <button
                className="checkin-button"
                onClick={() => {
                  setMethod("face");
                  handleFaceCheckIn();
                }}
                disabled={
                  loading ||
                  !selectedModule
                }
              >
                {loading &&
                method === "face"
                  ? "Verifying Face..."
                  : "👤 Verify Face & Check In"}
              </button>

              <button
                className="checkin-button"
                onClick={() => {
                  setMethod("fingerprint");
                  handleFingerprintCheckIn();
                }}
                disabled={
                  loading ||
                  !selectedModule
                }
              >
                {loading &&
                method === "fingerprint"
                  ? "Verifying Fingerprint..."
                  : "🖐 Verify Fingerprint & Check In"}
              </button>

              <button
                className="checkout-button"
                onClick={
                  handleCheckOut
                }
                disabled={
                  loading ||
                  !selectedModule
                }
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
                  className="back-button"
                  onClick={() => {
                    stopCamera();
                    setMethod("");
                    setMessage("");
                  }}
                  disabled={loading}
                >
                  Cancel Camera
                </button>

              </div>
            )}

            <div className="biometric-checkin-info">

              <p>
                <strong>
                  Choose one verification method
                </strong>
              </p>

              <span>
                You can check in using either your
                registered face or your registered
                phone biometric. You do not need to
                use both.
              </span>

            </div>

          </div>

        </section>

        <section className="history-card">

          <div className="history-header">

            <div>
              <h3>
                My Attendance
              </h3>

              <p>
                Your laboratory attendance records.
              </p>
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

                  attendance.map(
                    (record) => (

                      <tr
                        key={record.id}
                      >

                        <td>
                          <strong>
                            {
                              record.module_code ||
                              record.module_name ||
                              "Module"
                            }
                          </strong>
                        </td>

                        <td>
                          {record.date ||
                            "-"}
                        </td>

                        <td>
                          {record.time_in ||
                            "-"}
                        </td>

                        <td>
                          {record.time_out ||
                            "-"}
                        </td>

                        <td>

                          <span
                            className={
                              record.status ===
                              "Present"
                                ? "status-present"
                                : "status-absent"
                            }
                          >
                            {record.status ||
                              "Present"}
                          </span>

                        </td>

                      </tr>

                    )
                  )

                ) : (

                  <tr>

                    <td
                      colSpan="5"
                      className="empty-attendance"
                    >
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

        <span>
          LabGuard • Laboratory Management System
        </span>

        <span>
          Tshwane University of Technology
        </span>

      </footer>

    </div>
  );
}

export default StudentCheckIn;