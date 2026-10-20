import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as faceapi from "@vladmandic/face-api";
import { useNavigate } from "react-router-dom";

const API_URL = "https://labguard-dklp.onrender.com";
const MODEL_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

function BiometricRegistration() {
  const navigate = useNavigate();

  const [personType, setPersonType] = useState("student");
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [faceStatus, setFaceStatus] = useState("Not Registered");
  const [fingerprintStatus, setFingerprintStatus] =
    useState("Not Registered");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [faceLoading, setFaceLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const deadlineRef = useRef(0);

  const getAuthConfig = () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      const err = new Error("AUTHENTICATION_REQUIRED");
      throw err;
    }

    return {
      headers: { Authorization: `Bearer ${token}` },
    };
  };

  const handleAuthError = (err) => {
    if (
      err.message === "AUTHENTICATION_REQUIRED" ||
      err.response?.status === 401
    ) {
      stopPolling();
      localStorage.removeItem("access_token");
      navigate("/login");
      return true;
    }

    return false;
  };

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setEnrolling(false);
  };

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

  const getPersonPath = () =>
    personType === "student" ? "students" : "employees";

  const loadPeople = async () => {
    setLoading(true);
    setError("");

    try {
      const config = getAuthConfig();

      const [studentResponse, employeeResponse] = await Promise.all([
        axios.get(`${API_URL}/admin/students`, config),
        axios.get(`${API_URL}/admin/employees`, config),
      ]);

      setStudents(Array.isArray(studentResponse.data)
        ? studentResponse.data
        : []);

      setEmployees(Array.isArray(employeeResponse.data)
        ? employeeResponse.data
        : []);
    } catch (err) {
      console.error("Load people error:", err);

      if (handleAuthError(err)) return;

      setError(
        err.response?.data?.detail ||
          "Could not load students and employees. Check the API URL and your admin permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshBiometricStatus = async (person) => {
    if (!person?.id) {
      throw new Error("The selected person's database ID is missing.");
    }

    const response = await axios.get(
      `${API_URL}/biometric/${getPersonPath()}/${person.id}`,
      getAuthConfig()
    );

    const biometric = response.data;

    const hasFace =
      biometric.face_registered ??
      biometric.has_face ??
      Boolean(biometric.face_embedding);

    const hasFingerprint =
      biometric.fingerprint_registered ??
      biometric.has_physical_fingerprint ??
      biometric.has_fingerprint ??
      (biometric.fingerprint_sensor_slot != null);

    setFaceStatus(hasFace ? "Registered" : "Not Registered");

    setFingerprintStatus(
      hasFingerprint
        ? "Registered"
        : biometric.fingerprint_enrollment_pending
          ? "Enrollment Pending"
          : "Not Registered"
    );

    return biometric;
  };

  useEffect(() => {
    loadPeople();

    let cancelled = false;

    const loadModels = async () => {
      try {
        setFaceLoading(true);

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
      } catch (err) {
        console.error("Face model loading error:", err);

        if (!cancelled) {
          setError(
            "Face recognition models could not load. Check your internet connection."
          );
        }
      } finally {
        if (!cancelled) setFaceLoading(false);
      }
    };

    loadModels();

    return () => {
      cancelled = true;
      stopCamera();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const people = personType === "student" ? students : employees;

  const filteredPeople = people.filter((person) => {
    const term = search.toLowerCase().trim();

    if (!term) return true;

    const fields =
      personType === "student"
        ? [
            person.student_number,
            person.first_name,
            person.last_name,
            person.email,
          ]
        : [
            person.employee_number,
            person.first_name,
            person.last_name,
            person.email,
            person.role,
          ];

    return fields.some((value) =>
      String(value || "").toLowerCase().includes(term)
    );
  });

  const handleTypeChange = (type) => {
    stopPolling();
    stopCamera();

    setPersonType(type);
    setSelectedId("");
    setSelectedPerson(null);
    setSearch("");
    setFaceStatus("Not Registered");
    setFingerprintStatus("Not Registered");
    setMessage("");
    setError("");
  };

  const handlePersonChange = async (id) => {
    stopPolling();
    stopCamera();

    setSelectedId(id);
    setSelectedPerson(null);
    setFaceStatus("Not Registered");
    setFingerprintStatus("Not Registered");
    setMessage("");
    setError("");

    if (!id) return;

    const person = people.find(
      (item) => String(item.id) === String(id)
    );

    if (!person) {
      setError("The selected person could not be found.");
      return;
    }

    setSelectedPerson(person);

    try {
      await refreshBiometricStatus(person);
    } catch (err) {
      console.error("Biometric status error:", err);

      if (handleAuthError(err)) return;

      setError(
        err.response?.data?.detail ||
          "Could not load biometric status. Check the backend response."
      );
    }
  };

  const startCamera = async () => {
    if (!selectedPerson) {
      setError("Select a person first.");
      return;
    }

    try {
      setError("");
      setMessage("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is unavailable. Use HTTPS or localhost and a supported browser."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);

      setError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser."
          : err.name === "NotFoundError"
            ? "No camera was found on this device."
            : err.message || "Could not start the camera."
      );
    }
  };

  const captureFace = async () => {
    if (!selectedPerson || !videoRef.current || !cameraActive) {
      setError("Select a person and start the camera first.");
      return;
    }

    try {
      setCapturing(true);
      setError("");
      setMessage("");

      const descriptors = [];
      const video = videoRef.current;

      for (let i = 0; i < 5; i++) {
        setMessage(`Capturing face ${i + 1} of 5. Keep still.`);

        const detections = await faceapi
          .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.6,
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length !== 1) {
          throw new Error(
            detections.length === 0
              ? "No face detected. Improve the lighting and position your face."
              : "More than one face is visible. Only one person should be in view."
          );
        }

        const detection = detections[0];
        const box = detection.detection.box;

        if (
          box.width / video.videoWidth < 0.2 ||
          box.height / video.videoHeight < 0.2
        ) {
          throw new Error("Move closer to the camera.");
        }

        if (
          detection.descriptor.length !== 128 ||
          !Array.from(detection.descriptor).every(Number.isFinite)
        ) {
          throw new Error("The face embedding is invalid.");
        }

        descriptors.push(Array.from(detection.descriptor));

        if (i < 4) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      const average = new Array(128).fill(0);

      for (let i = 0; i < 128; i++) {
        for (const descriptor of descriptors) {
          average[i] += descriptor[i] / descriptors.length;
        }
      }

      const response = await axios.post(
        `${API_URL}/biometric/${getPersonPath()}/${selectedPerson.id}/face`,
        { face_embedding: average.join(",") },
        getAuthConfig()
      );

      setFaceStatus("Registered");
      setMessage(
        response.data?.message || "Face registration completed."
      );
    } catch (err) {
      console.error("Face registration error:", err);

      if (handleAuthError(err)) return;

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Face registration failed."
      );
    } finally {
      setCapturing(false);
    }
  };

  const registerFingerprint = async () => {
    if (!selectedPerson) {
      setError("Select a person first.");
      return;
    }

    if (enrolling) return;

    try {
      setError("");
      setMessage("");

      const endpoint =
        personType === "student"
          ? `${API_URL}/biometric/students/${selectedPerson.id}/fingerprint/sensor/enroll`
          : `${API_URL}/biometric/employees/${encodeURIComponent(
              selectedPerson.employee_number
            )}/fingerprint/sensor/enroll`;

      const response = await axios.post(
        endpoint,
        {},
        getAuthConfig()
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "The enrollment request was rejected."
        );
      }

      setFingerprintStatus("Enrollment Pending");
      setMessage(
        "Fingerprint enrollment requested. The physical ESP32 and FPM10A sensor must be online to complete enrollment."
      );

      setEnrolling(true);
      deadlineRef.current = Date.now() + 90000;

      timerRef.current = setInterval(async () => {
        if (Date.now() >= deadlineRef.current) {
          stopPolling();
          try {
            const biometric = await refreshBiometricStatus(selectedPerson);
            const registered =
              biometric.fingerprint_registered ??
              biometric.has_physical_fingerprint ??
              biometric.has_fingerprint ??
              (biometric.fingerprint_sensor_slot != null);
            if (!registered) {
              setFingerprintStatus("Not Registered");
            }
          } catch (e) {
            setFingerprintStatus("Not Registered");
          }
          setError(
            "Enrollment timed out. Check the device connection and backend device-enrollment status."
          );
          return;
        }

        try {
          const biometric = await refreshBiometricStatus(selectedPerson);

          const registered =
            biometric.fingerprint_registered ??
            biometric.has_physical_fingerprint ??
            biometric.has_fingerprint ??
            (biometric.fingerprint_sensor_slot != null);

          if (registered) {
            stopPolling();
            setFingerprintStatus("Registered");
            setMessage("Physical fingerprint registration completed.");
            setError("");
          }
        } catch (err) {
          console.error("Fingerprint status check:", err);

          if (err.response?.status === 401) {
            stopPolling();
            handleAuthError(err);
          }
        }
      }, 2500);
    } catch (err) {
      console.error("Fingerprint enrollment error:", err);

      if (handleAuthError(err)) return;

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Could not start fingerprint enrollment."
      );
    }
  };

  const buttonStyle = (background, disabled = false) => ({
    padding: "12px 20px",
    border: "none",
    borderRadius: "6px",
    background: disabled ? "#aaa" : background,
    color: background === "#f2b705" ? "#041832" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  });

  const displayNumber =
    personType === "student"
      ? selectedPerson?.student_number
      : selectedPerson?.employee_number;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        padding: "30px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 30,
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#041832" }}>
              Biometric Registration
            </h1>
            <p style={{ color: "#666" }}>
              Register biometrics for LabGuard students and employees.
            </p>
          </div>

          <button
            onClick={() => navigate("/admin")}
            style={buttonStyle("#003b70")}
          >
            Back to Dashboard
          </button>
        </header>

        {message && (
          <div
            role="status"
            style={{
              padding: 14,
              marginBottom: 20,
              borderRadius: 6,
              background: "#e8f7ee",
              color: "#176b35",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              padding: 14,
              marginBottom: 20,
              borderRadius: 6,
              background: "#fdecec",
              color: "#a12626",
            }}
          >
            {typeof error === "string"
              ? error
              : "An unexpected error occurred."}
          </div>
        )}

        <main
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 25,
            boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ color: "#041832" }}>1. Select Person Type</h2>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => handleTypeChange("student")}
              style={buttonStyle(
                personType === "student" ? "#003b70" : "#777"
              )}
            >
              Students
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange("employee")}
              style={buttonStyle(
                personType === "employee" ? "#003b70" : "#777"
              )}
            >
              Employees
            </button>
          </div>

          <h2 style={{ color: "#041832" }}>
            2. Select {personType === "student" ? "Student" : "Employee"}
          </h2>

          <input
            type="search"
            placeholder={
              personType === "student"
                ? "Search by student number, name or email..."
                : "Search by employee number, name, email or role..."
            }
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedId("");
              setSelectedPerson(null);
              setFaceStatus("Not Registered");
              setFingerprintStatus("Not Registered");
              stopPolling();
              stopCamera();
              setMessage("");
              setError("");
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              marginBottom: 12,
              border: "1px solid #ccc",
              borderRadius: 6,
              fontSize: 15,
            }}
          />

          {loading ? (
            <p>Loading students and employees...</p>
          ) : (
            <select
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                handlePersonChange(event.target.value);
              }}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 20,
                border: "1px solid #ccc",
                borderRadius: 6,
                fontSize: 15,
              }}
            >
              <option value="">-- Select Person --</option>
              {filteredPeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {personType === "student"
                    ? `${person.student_number || person.id} `
                    : `${person.employee_number || person.id} `}
                  {person.first_name} {person.last_name}
                  {personType === "employee" && person.role
                    ? ` (${person.role})`
                    : ""}
                </option>
              ))}
            </select>
          )}

          {!loading && filteredPeople.length === 0 && (
            <p>No matching records found.</p>
          )}

          {selectedPerson && (
            <>
              <div
                style={{
                  padding: 15,
                  background: "#f5f7fa",
                  borderRadius: 8,
                  marginBottom: 25,
                }}
              >
                <strong>
                  {selectedPerson.first_name} {selectedPerson.last_name}
                </strong>
                <p>
                  {personType === "student"
                    ? "Student Number"
                    : "Employee Number"}
                  : {displayNumber || "Not provided"}
                </p>
                <p>Email: {selectedPerson.email}</p>

                {personType === "employee" && (
                  <p>Role: {selectedPerson.role || "Not specified"}</p>
                )}
              </div>

              <h2 style={{ color: "#041832" }}>3. Biometric Status</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 15,
                  marginBottom: 30,
                }}
              >
                {[
                  ["Face", faceStatus],
                  ["Physical Fingerprint", fingerprintStatus],
                ].map(([label, status]) => (
                  <div
                    key={label}
                    style={{
                      padding: 18,
                      borderRadius: 8,
                      background:
                        status === "Registered" ? "#e8f7ee" : "#fff4e5",
                      border:
                        status === "Registered"
                          ? "1px solid #b9e5c8"
                          : "1px solid #f0d19b",
                    }}
                  >
                    <strong>{label}</strong>
                    <div style={{ marginTop: 8 }}>{status}</div>
                  </div>
                ))}
              </div>

              <h2 style={{ color: "#041832" }}>4. Register Face</h2>

              <p style={{ color: "#555", lineHeight: 1.6 }}>
                Position one person's face in view of the camera. The system
                captures several samples before sending the face embedding to
                the LabGuard backend.
              </p>

              <div
                style={{
                  width: "100%",
                  maxWidth: 600,
                  margin: "0 auto 20px",
                  background: "#111",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    display: "block",
                    minHeight: 250,
                    objectFit: "cover",
                  }}
                />

                {!cameraActive && (
                  <p style={{ color: "#fff", textAlign: "center" }}>
                    Camera inactive
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginBottom: 35,
                }}
              >
                <button
                  onClick={cameraActive ? stopCamera : startCamera}
                  disabled={faceLoading || capturing}
                  style={buttonStyle(
                    "#003b70",
                    faceLoading || capturing
                  )}
                >
                  {cameraActive ? "Stop Camera" : "Start Camera"}
                </button>

                <button
                  onClick={captureFace}
                  disabled={!cameraActive || capturing || faceLoading}
                  style={buttonStyle(
                    "#f2b705",
                    !cameraActive || capturing || faceLoading
                  )}
                >
                  {capturing ? "Capturing..." : "Register Face"}
                </button>
              </div>

              {faceLoading && <p>Loading face recognition models...</p>}

              <h2 style={{ color: "#041832" }}>
                5. Register Physical Fingerprint
              </h2>

              <div
                style={{
                  padding: 25,
                  background: "#f5f7fa",
                  borderRadius: 10,
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#555", lineHeight: 1.7 }}>
                  This requests enrollment through the LabGuard ESP32 and
                  FPM10A sensor. The physical device must be connected to the
                  backend to capture and store the fingerprint.
                </p>

                <button
                  onClick={registerFingerprint}
                  disabled={
                    enrolling || fingerprintStatus === "Registered"
                  }
                  style={buttonStyle(
                    "#003b70",
                    enrolling || fingerprintStatus === "Registered"
                  )}
                >
                  {fingerprintStatus === "Registered"
                    ? "Fingerprint Registered"
                    : enrolling
                      ? "Waiting for Sensor..."
                      : "Start Fingerprint Enrollment"}
                </button>

                {enrolling && (
                  <>
                    <p role="status" style={{ marginTop: 15 }}>
                      Enrollment is pending. Keep the device powered and
                      connected.
                    </p>

                    <button
                      onClick={async () => {
                        stopPolling();
                        try {
                          if (selectedPerson) {
                            await refreshBiometricStatus(selectedPerson);
                          }
                        } catch (err) {
                          setFingerprintStatus("Not Registered");
                        }
                        setMessage("Fingerprint enrollment was cancelled.");
                        setError("");
                      }}
                      style={buttonStyle("#777")}
                    >
                      Cancel Enrollment
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default BiometricRegistration;