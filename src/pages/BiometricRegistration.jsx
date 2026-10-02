import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as faceapi from "@vladmandic/face-api";
import { useNavigate } from "react-router-dom";
import { startRegistration } from "@simplewebauthn/browser";

function BiometricRegistration() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentData, setSelectedStudentData] = useState(null);
  const [faceStatus, setFaceStatus] = useState("Not Registered");
  const [fingerprintStatus, setFingerprintStatus] =
    useState("Not Registered");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const token = localStorage.getItem("access_token");

  const MODEL_URL =
    "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

  // =====================================================
  // LOAD STUDENTS
  // =====================================================

  useEffect(() => {
    fetchStudents();

    return () => {
      stopCamera();
    };
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "https://labguard-dklp.onrender.com/admin/students",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStudents(response.data);
    } catch (err) {
      console.error("Failed to load students:", err);

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail.map((item) => item.msg).join(", ")
        );
      } else {
        setError(
          typeof detail === "string"
            ? detail
            : "Failed to load students."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD FACE MODELS
  // =====================================================

  const loadFaceModels = async () => {
    try {
      setFaceLoading(true);
      setError("");

      await faceapi.nets.tinyFaceDetector.loadFromUri(
        MODEL_URL
      );

      await faceapi.nets.faceLandmark68Net.loadFromUri(
        MODEL_URL
      );

      await faceapi.nets.faceRecognitionNet.loadFromUri(
        MODEL_URL
      );

      setMessage("Face recognition models loaded.");
    } catch (err) {
      console.error(
        "Failed to load face recognition models:",
        err
      );

      setError(
        "Unable to load face recognition models. Check your internet connection and try again."
      );

      throw err;
    } finally {
      setFaceLoading(false);
    }
  };

  // =====================================================
  // SELECT STUDENT
  // =====================================================

 const handleStudentChange = async (e) => {
    const studentId = e.target.value;

    setSelectedStudent(studentId);
    setMessage("");
    setError("");

    setFaceStatus("Not Registered");
    setFingerprintStatus("Not Registered");

    stopCamera();

    if (!studentId) {
      setSelectedStudentData(null);
      return;
    }

    const student = students.find(
      (item) => String(item.id) === String(studentId)
    );

    setSelectedStudentData(student || null);

    try {
      const response = await axios.get(
        `https://labguard-dklp.onrender.com/biometric/students/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setFaceStatus(
        response.data.face_registered
          ? "Registered"
          : "Not Registered"
      );

      setFingerprintStatus(
        response.data.fingerprint_registered
          ? "Registered"
          : "Not Registered"
      );
    } catch (err) {
      console.error(
        "Failed to load biometric status:",
        err
      );

      const detail = err.response?.data?.detail;

      if (typeof detail === "string") {
        setError(detail);
      }
    }
  };

  // =====================================================
  // START CAMERA
  // =====================================================

  const startCamera = async () => {
    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }

    try {
      setError("");
      setMessage("");

      await loadFaceModels();

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera access is not supported by this browser."
        );
        return;
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setCameraActive(true);

      setMessage(
        "Camera is ready. Position the student's face in the frame."
      );
    } catch (err) {
      console.error("Camera error:", err);

      if (err.name === "NotAllowedError") {
        setError(
          "Camera permission was denied. Please allow camera access in your browser."
        );
      } else if (err.name === "NotFoundError") {
        setError(
          "No camera was found on this device."
        );
      } else if (err.name === "NotReadableError") {
        setError(
          "The camera is already being used by another application."
        );
      } else {
        setError(
          "Unable to start the camera."
        );
      }
    }
  };

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
  // CAPTURE FACE
  // =====================================================

  const captureFace = async () => {
    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }

    if (!videoRef.current) {
      setError("Camera is not available.");
      return;
    }

    try {
      setCapturing(true);
      setError("");
      setMessage("Detecting face...");

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
          "No face detected. Make sure the student's face is clearly visible and try again."
        );

        setMessage("");
        return;
      }

      const descriptor = detection.descriptor;

      if (!descriptor || descriptor.length !== 128) {
        setError(
          "Invalid face embedding generated. Please try again."
        );

        setMessage("");
        return;
      }

      const faceEmbedding =
        Array.from(descriptor).join(",");

      setMessage(
        "Face detected. Registering biometric information..."
      );

      const response = await axios.post(
        `https://labguard-dklp.onrender.com/biometric/students/${selectedStudent}/face`,
        {
          face_embedding: faceEmbedding,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setFaceStatus("Registered");

      setMessage(
        response.data.message ||
          "Face registered successfully."
      );

      stopCamera();
    } catch (err) {
      console.error(
        "Face registration error:",
        err
      );

      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item) => item.msg)
            .join(", ")
        );
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(
          "Face registration failed. Please try again."
        );
      }

      setMessage("");
    } finally {
      setCapturing(false);
    }
  };

  // =====================================================
  // FINGERPRINT
  // =====================================================

  const handleFingerprintRegistration = async () => {
  if (!selectedStudent) {
    setError("Please select a student first.");
    return;
  }

  if (faceStatus !== "Registered") {
    setError(
      "Register the student's face before registering the fingerprint."
    );
    return;
  }

  try {
    setError("");
    setMessage(
      "Preparing phone biometric registration..."
    );

    // --------------------------------------------------
    // 1. GET REGISTRATION OPTIONS FROM FASTAPI
    // --------------------------------------------------

    const optionsResponse = await axios.get(
      `https://labguard-dklp.onrender.com/biometric/students/${selectedStudent}/fingerprint/options`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const optionsJSON = optionsResponse.data;

    // --------------------------------------------------
    // 2. START REAL PHONE BIOMETRIC REGISTRATION
    // --------------------------------------------------

    setMessage(
      "Follow the biometric prompt on the phone."
    );

    const registrationResponse =
      await startRegistration({
        optionsJSON,
      });

    // --------------------------------------------------
    // 3. SEND THE AUTHENTICATOR RESPONSE TO FASTAPI
    // --------------------------------------------------

    setMessage(
      "Biometric captured. Verifying with LabGuard..."
    );

    const verificationResponse =
      await axios.post(
        `https://labguard-dklp.onrender.com/biometric/students/${selectedStudent}/fingerprint/verify`,
        registrationResponse,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

    // --------------------------------------------------
    // 4. REGISTRATION SUCCESS
    // --------------------------------------------------

    if (verificationResponse.data.verified) {
      setFingerprintStatus("Registered");

      setMessage(
        verificationResponse.data.message ||
          "Phone biometric registered successfully."
      );
    } else {
      setError(
        "The phone biometric could not be verified."
      );

      setMessage("");
    }

  } catch (err) {
    console.error(
      "Fingerprint registration error:",
      err
    );

    const detail =
      err.response?.data?.detail;

    if (typeof detail === "string") {
      setError(detail);
    } else if (
      err.name === "NotAllowedError"
    ) {
      setError(
        "The biometric registration was cancelled or not allowed."
      );
    } else if (
      err.name === "InvalidStateError"
    ) {
      setError(
        "This phone may already have a passkey registered for LabGuard."
      );
    } else {
      setError(
        "Fingerprint registration failed. Please try again."
      );
    }

    setMessage("");
  }
};

  // =====================================================
  // SEARCHED STUDENTS
  // =====================================================

  const searchResults =
    studentSearch.trim() === ""
      ? []
      : students.filter((student) =>
          String(student.student_number)
            .toLowerCase()
            .includes(
              studentSearch
                .trim()
                .toLowerCase()
            )
        );

  // =====================================================
  // SELECT SEARCH RESULT
  // =====================================================

  const selectStudentFromSearch = (student) => {
    setStudentSearch(
      String(student.student_number)
    );

    handleStudentChange({
      target: {
        value: String(student.id),
      },
    });
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="admin-page">

      {/* ========================= */}
      {/* NAVBAR */}
      {/* ========================= */}

      <nav className="admin-navbar">

        <div className="admin-logo">
          LabGuard
        </div>

        <button
          className="logout-button"
          onClick={() => navigate("/admin")}
        >
          Back
        </button>

      </nav>

      {/* ========================= */}
      {/* MAIN CONTENT */}
      {/* ========================= */}

      <main className="admin-content">

        <div className="admin-header">

          <h1>
            Biometric Registration
          </h1>

          <p>
            Register face and fingerprint information
            for laboratory access.
          </p>

        </div>

        {/* ========================= */}
        {/* MESSAGES */}
        {/* ========================= */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {/* ========================= */}
        {/* STUDENT SEARCH */}
        {/* ========================= */}

        <div className="admin-card">

          <h2>
            Find Student
          </h2>

          <p>
            Search for a student using their student
            number.
          </p>

          {loading ? (
            <p>
              Loading students...
            </p>
          ) : (
            <div className="form-group">

              <label htmlFor="student-search">
                Student Number
              </label>

              <input
                id="student-search"
                type="text"
                placeholder="Enter student number"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(
                    e.target.value
                  );

                  setSelectedStudent("");
                  setFaceStatus(
                    "Not Registered"
                  );
                  setFingerprintStatus(
                    "Not Registered"
                  );
                  setMessage("");
                  setError("");
                }}
              />

            </div>
          )}

          {/* ========================= */}
          {/* SEARCH RESULTS */}
          {/* ========================= */}

          {studentSearch.trim() !== "" && (
            <div className="student-search-results">

              {searchResults.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="student-result"
                  onClick={() =>
                    selectStudentFromSearch(
                      student
                    )
                  }
                >

                  <strong>
                    {student.student_number}
                  </strong>

                  <span>
                    {student.first_name}{" "}
                    {student.last_name}
                  </span>

                </button>
              ))}

              {searchResults.length === 0 && (
                <p>
                  No student found with that
                  student number.
                </p>
              )}

            </div>
          )}

        </div>

        {/* ========================= */}
        {/* SELECTED STUDENT */}
        {/* ========================= */}

        {selectedStudentData && (

          <div className="admin-card">

            <h2>
              Student Information
            </h2>

            <div className="biometric-student-info">

              <p>
                <strong>
                  Student Number:
                </strong>{" "}
                {selectedStudentData.student_number}
              </p>

              <p>
                <strong>
                  Name:
                </strong>{" "}
                {selectedStudentData.first_name}{" "}
                {selectedStudentData.last_name}
              </p>

              <p>
                <strong>
                  Course:
                </strong>{" "}
                {selectedStudentData.course}
              </p>

              <p>
                <strong>
                  Current Year:
                </strong>{" "}
                {selectedStudentData.current_year}
              </p>

            </div>

          </div>

        )}

        {/* ========================= */}
        {/* BIOMETRIC OPTIONS */}
        {/* ========================= */}

        {selectedStudent && (

          <div className="admin-grid">

            {/* ===================== */}
            {/* FACE */}
            {/* ===================== */}

            <div className="admin-card biometric-card">

              <div className="admin-card-icon">
                👤
              </div>

              <h2>
                Face Registration
              </h2>

              <p>
                Capture the student's facial
                information using the camera.
              </p>

              <div className="biometric-status">

                <span>
                  Status:
                </span>

                <strong>
                  {faceStatus}
                </strong>

              </div>

              {!cameraActive ? (

                <button
                  className="dashboard-button"
                  onClick={startCamera}
                  disabled={faceLoading}
                >
                  {faceLoading
                    ? "Loading..."
                    : "📷 Register Face"}
                </button>

              ) : (

                <div className="biometric-camera">

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="biometric-video"
                  />

                  <div className="camera-actions">

                    <button
                      className="dashboard-button"
                      onClick={captureFace}
                      disabled={capturing}
                    >
                      {capturing
                        ? "Detecting..."
                        : "📸 Capture Face"}
                    </button>

                    <button
                      className="back-button"
                      onClick={stopCamera}
                      disabled={capturing}
                    >
                      Cancel
                    </button>

                  </div>

                </div>

              )}

            </div>

            {/* ===================== */}
            {/* FINGERPRINT */}
            {/* ===================== */}

            <div className="admin-card biometric-card">

              <div className="admin-card-icon">
                🖐️
              </div>

              <h2>
                Fingerprint Registration
              </h2>

              <p>
                Register the student's phone
                biometric using secure WebAuthn
                authentication.
              </p>

              <div className="biometric-status">

                <span>
                  Status:
                </span>

                <strong>
                  {fingerprintStatus}
                </strong>

              </div>

              <button
                className="dashboard-button"
                onClick={
                  handleFingerprintRegistration
                }
                disabled={
                  faceStatus !== "Registered"
                }
              >
                🖐️ Register Fingerprint
              </button>

              {faceStatus !== "Registered" && (
                <small>
                  Face registration is required
                  first.
                </small>
              )}

            </div>

          </div>

        )}

        {/* ========================= */}
        {/* INFORMATION */}
        {/* ========================= */}

        <div className="admin-card biometric-information">

          <h2>
            Biometric Access
          </h2>

          <p>
            Registered biometric information will
            be used to verify students when they
            access the laboratory.
          </p>

          <ul>

            <li>
              Face registration uses the
              laboratory camera.
            </li>

            <li>
              Face data is converted into a
              biometric embedding before being
              stored.
            </li>

            <li>
              Fingerprint registration uses secure
              WebAuthn authentication.
            </li>

            <li>
              Biometric information is associated
              with the selected student's account.
            </li>

          </ul>

        </div>

      </main>

    </div>
  );
}

export default BiometricRegistration;
