import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as faceapi from "@vladmandic/face-api";
import { useNavigate } from "react-router-dom";
import { startRegistration } from "@simplewebauthn/browser";

const API_URL = "https://labguard-dklp.onrender.com";
const MODEL_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

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

  /*
   * ---------------------------------------------------------
   * AUTHENTICATION
   * ---------------------------------------------------------
   */

  const getAuthConfig = () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("AUTHENTICATION_REQUIRED");
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const handleAuthenticationError = (err) => {
    if (
      err.message === "AUTHENTICATION_REQUIRED" ||
      err.response?.status === 401
    ) {
      localStorage.removeItem("access_token");

      setError("Your session has expired. Please log in again.");

      navigate("/login");

      return true;
    }

    return false;
  };

  /*
   * ---------------------------------------------------------
   * LOAD FACE MODELS
   * ---------------------------------------------------------
   */

  const loadFaceModels = async () => {
    try {
      setFaceLoading(true);

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      console.log("Face models loaded successfully.");
    } catch (err) {
      console.error("Face model loading error:", err);
      setError("Failed to load face recognition models.");
    } finally {
      setFaceLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * FETCH STUDENTS
   * ---------------------------------------------------------
   */

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/admin/students`,
        getAuthConfig()
      );

      setStudents(response.data || []);
    } catch (err) {
      console.error("Fetch students error:", err);

      if (handleAuthenticationError(err)) {
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    fetchStudents();
    loadFaceModels();

    return () => {
      stopCamera();
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * STOP CAMERA
   * ---------------------------------------------------------
   */

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  /*
   * ---------------------------------------------------------
   * START CAMERA
   * ---------------------------------------------------------
   */

  const startCamera = async () => {
    try {
      setError("");
      setMessage("");

      if (!selectedStudent) {
        setError("Please select a student first.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
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
    } catch (err) {
      console.error("Camera error:", err);

      if (err.name === "NotAllowedError") {
        setError(
          "Camera permission was denied. Please allow camera access."
        );
      } else if (err.name === "NotFoundError") {
        setError("No camera was found on this device.");
      } else {
        setError("Unable to access the camera.");
      }
    }
  };

  /*
   * ---------------------------------------------------------
   * STUDENT SELECTION
   * ---------------------------------------------------------
   */

  const handleStudentChange = async (studentId) => {
    setSelectedStudent(studentId);
    setSelectedStudentData(null);

    setFaceStatus("Not Registered");
    setFingerprintStatus("Not Registered");

    setMessage("");
    setError("");

    stopCamera();

    if (!studentId) {
      return;
    }

    const student = students.find(
      (item) => String(item.id) === String(studentId)
    );

    setSelectedStudentData(student || null);

    try {
      const response = await axios.get(
        `${API_URL}/biometric/students/${studentId}`,
        getAuthConfig()
      );

      const biometric = response.data;

      setFaceStatus(
        biometric.face_registered
          ? "Registered"
          : "Not Registered"
      );

      setFingerprintStatus(
        biometric.fingerprint_registered
          ? "Registered"
          : "Not Registered"
      );
    } catch (err) {
      console.error("Biometric status error:", err);

      if (handleAuthenticationError(err)) {
        return;
      }

      if (err.response?.status === 404) {
        setFaceStatus("Not Registered");
        setFingerprintStatus("Not Registered");
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Failed to load biometric status."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * FACE REGISTRATION
   *
   * Improvements:
   * 1. Detect all faces.
   * 2. Require exactly one face.
   * 3. Check detection confidence.
   * 4. Check face size.
   * 5. Check face position.
   * 6. Capture 5 descriptors.
   * 7. Check descriptor consistency.
   * 8. Average the descriptors.
   * 9. Save the averaged descriptor.
   * ---------------------------------------------------------
   */

  const captureFace = async () => {
    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }

    if (!videoRef.current || !cameraActive) {
      setError("Camera is not active.");
      return;
    }

    try {
      setCapturing(true);
      setError("");
      setMessage("");

      const video = videoRef.current;

      const descriptors = [];

      const numberOfCaptures = 5;

      for (let i = 0; i < numberOfCaptures; i++) {
        setMessage(
          `Capturing face ${i + 1} of ${numberOfCaptures}. Please keep the student's face still.`
        );

        /*
         * Detect ALL faces.
         *
         * This is important because we do not want to register
         * a face while another person is also visible.
         */

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

        /*
         * -----------------------------------------------------
         * REQUIRE EXACTLY ONE FACE
         * -----------------------------------------------------
         */

        if (detections.length === 0) {
          setError(
            "No face detected. Please position the student's face clearly in front of the camera."
          );
          return;
        }

        if (detections.length > 1) {
          setError(
            "More than one face was detected. Only the student being registered should be visible."
          );
          return;
        }

        const detection = detections[0];

        /*
         * -----------------------------------------------------
         * CHECK DETECTION CONFIDENCE
         * -----------------------------------------------------
         */

        if (detection.detection.score < 0.6) {
          setError(
            "Face detection confidence is too low. Please improve the lighting and face the camera directly."
          );
          return;
        }

        /*
         * -----------------------------------------------------
         * CHECK CAMERA DIMENSIONS
         * -----------------------------------------------------
         */

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (!videoWidth || !videoHeight) {
          setError(
            "Camera image is not ready. Please wait a moment and try again."
          );
          return;
        }

        /*
         * -----------------------------------------------------
         * CHECK FACE SIZE
         * -----------------------------------------------------
         */

        const box = detection.detection.box;

        const faceWidth = box.width;
        const faceHeight = box.height;

        const faceWidthRatio =
          faceWidth / videoWidth;

        const faceHeightRatio =
          faceHeight / videoHeight;

        if (
          faceWidthRatio < 0.20 ||
          faceHeightRatio < 0.20
        ) {
          setError(
            "The student's face is too far from the camera. Please move closer."
          );
          return;
        }

        /*
         * -----------------------------------------------------
         * CHECK FACE POSITION
         * -----------------------------------------------------
         */

        const faceCenterX =
          box.x + box.width / 2;

        const faceCenterY =
          box.y + box.height / 2;

        const imageCenterX =
          videoWidth / 2;

        const imageCenterY =
          videoHeight / 2;

        const horizontalDistance =
          Math.abs(faceCenterX - imageCenterX) /
          videoWidth;

        const verticalDistance =
          Math.abs(faceCenterY - imageCenterY) /
          videoHeight;

        if (
          horizontalDistance > 0.25 ||
          verticalDistance > 0.25
        ) {
          setError(
            "Please position the student's face near the center of the camera."
          );
          return;
        }

        /*
         * -----------------------------------------------------
         * VALIDATE DESCRIPTOR
         * -----------------------------------------------------
         */

        const descriptor = detection.descriptor;

        if (!descriptor || descriptor.length !== 128) {
          setError(
            "Invalid face embedding detected. Please try again."
          );
          return;
        }

        descriptors.push(Array.from(descriptor));

        /*
         * Give the camera time to produce a new frame.
         */

        if (i < numberOfCaptures - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 300)
          );
        }
      }

      /*
       * ---------------------------------------------------------
       * CHECK DESCRIPTOR CONSISTENCY
       * ---------------------------------------------------------
       */

      const calculateDistance = (a, b) => {
        let sum = 0;

        for (let i = 0; i < 128; i++) {
          const difference = a[i] - b[i];

          sum += difference * difference;
        }

        return Math.sqrt(sum);
      };

      let totalDistance = 0;
      let comparisons = 0;

      for (let i = 0; i < descriptors.length; i++) {
        for (let j = i + 1; j < descriptors.length; j++) {
          totalDistance += calculateDistance(
            descriptors[i],
            descriptors[j]
          );

          comparisons++;
        }
      }

      const averageDistance =
        comparisons > 0
          ? totalDistance / comparisons
          : 0;

      console.log(
        "Average registration descriptor distance:",
        averageDistance
      );

      /*
       * If the descriptors vary too much, the capture was
       * unstable.
       */

      if (averageDistance > 0.45) {
        setError(
          "The face capture was inconsistent. Please keep the student's face still and try again."
        );
        return;
      }

      /*
       * ---------------------------------------------------------
       * CREATE AVERAGE FACE DESCRIPTOR
       * ---------------------------------------------------------
       */

      const averageDescriptor =
        new Array(128).fill(0);

      for (let i = 0; i < 128; i++) {
        let total = 0;

        for (const descriptor of descriptors) {
          total += descriptor[i];
        }

        averageDescriptor[i] =
          total / descriptors.length;
      }

      /*
       * ---------------------------------------------------------
       * VALIDATE FINAL DESCRIPTOR
       * ---------------------------------------------------------
       */

      if (averageDescriptor.length !== 128) {
        setError(
          "Failed to create a valid face embedding."
        );
        return;
      }

      const faceEmbedding =
        averageDescriptor.join(",");

      /*
       * ---------------------------------------------------------
       * SEND FACE TO BACKEND
       * ---------------------------------------------------------
       */

      const authConfig = getAuthConfig();

      const response = await axios.post(
        `${API_URL}/biometric/students/${selectedStudent}/face`,
        {
          face_embedding: faceEmbedding,
        },
        {
          ...authConfig,
          headers: {
            ...authConfig.headers,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Face registration response:",
        response.data
      );

      setFaceStatus("Registered");

      if (response.data.fingerprint_registered) {
        setFingerprintStatus("Registered");
      }

      setMessage(
        "Face registered successfully using multiple verified captures. You can now register the fingerprint."
      );
    } catch (err) {
      console.error(
        "Face registration error:",
        err
      );

      if (handleAuthenticationError(err)) {
        return;
      }

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to register face."
      );
    } finally {
      setCapturing(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * FINGERPRINT / WEBAUTHN REGISTRATION
   * ---------------------------------------------------------
   */

  const registerFingerprint = async () => {
    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }

    if (faceStatus !== "Registered") {
      setError(
        "Please register the student's face before registering the fingerprint."
      );
      return;
    }

    try {
      setError("");
      setMessage("");

      console.log(
        "Starting authenticated fingerprint registration..."
      );

      /*
       * STEP 1:
       * Request WebAuthn registration options.
       */

      const optionsResponse = await axios.get(
        `${API_URL}/biometric/students/${selectedStudent}/fingerprint/options`,
        getAuthConfig()
      );

      const optionsJSON = optionsResponse.data;

      console.log(
        "Fingerprint registration authenticated."
      );

      console.log(
        "WebAuthn options received:",
        optionsJSON
      );

      if (!optionsJSON) {
        throw new Error(
          "The server returned empty WebAuthn options."
        );
      }

      /*
       * STEP 2:
       * Ask the browser/device to perform biometric
       * authentication.
       */

      console.log(
        "Opening fingerprint/biometric prompt..."
      );

      const registrationResponse =
        await startRegistration({
          optionsJSON,
        });

      console.log(
        "Fingerprint biometric prompt completed."
      );

      console.log(
        "Registration response:",
        registrationResponse
      );

      /*
       * STEP 3:
       * Send WebAuthn response to backend.
       */

      const verifyAuthConfig = getAuthConfig();

      const verificationResponse =
        await axios.post(
          `${API_URL}/biometric/students/${selectedStudent}/fingerprint/verify`,
          registrationResponse,
          {
            ...verifyAuthConfig,
            headers: {
              ...verifyAuthConfig.headers,
              "Content-Type": "application/json",
            },
          }
        );

      console.log(
        "Fingerprint verification response:",
        verificationResponse.data
      );

      setFingerprintStatus("Registered");

      setMessage(
        "Fingerprint registered successfully."
      );
    } catch (err) {
      console.error(
        "Fingerprint registration error:",
        err
      );

      if (handleAuthenticationError(err)) {
        return;
      }

      if (err.name === "NotAllowedError") {
        setError(
          "Fingerprint registration was cancelled or not allowed."
        );
        return;
      }

      if (err.name === "InvalidStateError") {
        setError(
          "This biometric credential may already be registered on this device."
        );
        return;
      }

      if (
        err.name === "SecurityError" ||
        err.name === "NotSupportedError"
      ) {
        setError(
          "This browser or device does not support the required biometric authentication."
        );
        return;
      }

      if (err.response) {
        console.error(
          "Backend status:",
          err.response.status
        );

        console.error(
          "Backend response:",
          err.response.data
        );

        setError(
          err.response.data?.detail ||
            "The server rejected fingerprint registration."
        );

        return;
      }

      setError(
        err.message ||
          "Fingerprint registration failed."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * SEARCH STUDENTS
   * ---------------------------------------------------------
   */

  const filteredStudents = students.filter((student) => {
    const search = studentSearch
      .toLowerCase()
      .trim();

    if (!search) {
      return true;
    }

    const studentNumber =
      student.student_number?.toLowerCase() || "";

    const firstName =
      student.first_name?.toLowerCase() || "";

    const lastName =
      student.last_name?.toLowerCase() || "";

    const email =
      student.email?.toLowerCase() || "";

    return (
      studentNumber.includes(search) ||
      firstName.includes(search) ||
      lastName.includes(search) ||
      email.includes(search)
    );
  });

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: "#041832",
              }}
            >
              Biometric Registration
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#666",
              }}
            >
              Register face and fingerprint authentication
              for students.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "6px",
              background: "#003b70",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Back
          </button>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "6px",
              background: "#e8f7ee",
              color: "#176b35",
              border: "1px solid #b9e5c8",
            }}
          >
            {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "6px",
              background: "#fdecec",
              color: "#a12626",
              border: "1px solid #f2b8b8",
            }}
          >
            {error}
          </div>
        )}

        {/* MAIN CARD */}

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "25px",
            boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* STUDENT SELECTION */}

          <h2
            style={{
              color: "#041832",
              marginTop: 0,
            }}
          >
            1. Select Student
          </h2>

          <input
            type="text"
            placeholder="Search by student number, name or email..."
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setSelectedStudent("");
              setSelectedStudentData(null);
              setFaceStatus("Not Registered");
              setFingerprintStatus("Not Registered");
              stopCamera();
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              marginBottom: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "15px",
            }}
          />

          {loading ? (
            <p>Loading students...</p>
          ) : (
            <select
              value={selectedStudent}
              onChange={(e) =>
                handleStudentChange(e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                fontSize: "15px",
                marginBottom: "20px",
              }}
            >
              <option value="">
                -- Select Student --
              </option>

              {filteredStudents.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.student_number} -{" "}
                  {student.first_name}{" "}
                  {student.last_name}
                </option>
              ))}
            </select>
          )}

          {/* SELECTED STUDENT */}

          {selectedStudentData && (
            <div
              style={{
                padding: "15px",
                background: "#f5f7fa",
                borderRadius: "8px",
                marginBottom: "25px",
              }}
            >
              <strong>
                {selectedStudentData.first_name}{" "}
                {selectedStudentData.last_name}
              </strong>

              <div
                style={{
                  marginTop: "5px",
                  color: "#666",
                }}
              >
                Student Number:{" "}
                {selectedStudentData.student_number}
              </div>

              <div
                style={{
                  color: "#666",
                }}
              >
                Email:{" "}
                {selectedStudentData.email}
              </div>
            </div>
          )}

          {/* BIOMETRIC STATUS */}

          {selectedStudent && (
            <>
              <h2
                style={{
                  color: "#041832",
                }}
              >
                2. Biometric Status
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "15px",
                  marginBottom: "30px",
                }}
              >
                <div
                  style={{
                    padding: "18px",
                    borderRadius: "8px",
                    background:
                      faceStatus === "Registered"
                        ? "#e8f7ee"
                        : "#fff4e5",
                    border:
                      faceStatus === "Registered"
                        ? "1px solid #b9e5c8"
                        : "1px solid #f0d19b",
                  }}
                >
                  <strong>Face</strong>

                  <div
                    style={{
                      marginTop: "8px",
                    }}
                  >
                    {faceStatus}
                  </div>
                </div>

                <div
                  style={{
                    padding: "18px",
                    borderRadius: "8px",
                    background:
                      fingerprintStatus === "Registered"
                        ? "#e8f7ee"
                        : "#fff4e5",
                    border:
                      fingerprintStatus === "Registered"
                        ? "1px solid #b9e5c8"
                        : "1px solid #f0d19b",
                  }}
                >
                  <strong>Fingerprint</strong>

                  <div
                    style={{
                      marginTop: "8px",
                    }}
                  >
                    {fingerprintStatus}
                  </div>
                </div>
              </div>

              {/* FACE */}

              <h2
                style={{
                  color: "#041832",
                }}
              >
                3. Register Face
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "35px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    background: "#111",
                    borderRadius: "10px",
                    overflow: "hidden",
                    position: "relative",
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
                      minHeight: "300px",
                      objectFit: "cover",
                    }}
                  />

                  {!cameraActive && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        background:
                          "rgba(0,0,0,0.55)",
                      }}
                    >
                      Camera inactive
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "15px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {!cameraActive ? (
                    <button
                      onClick={startCamera}
                      disabled={faceLoading}
                      style={{
                        padding: "12px 20px",
                        border: "none",
                        borderRadius: "6px",
                        background: "#003b70",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Start Camera
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      style={{
                        padding: "12px 20px",
                        border: "none",
                        borderRadius: "6px",
                        background: "#777",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Stop Camera
                    </button>
                  )}

                  <button
                    onClick={captureFace}
                    disabled={
                      !cameraActive ||
                      capturing ||
                      faceLoading
                    }
                    style={{
                      padding: "12px 20px",
                      border: "none",
                      borderRadius: "6px",
                      background:
                        !cameraActive ||
                        capturing ||
                        faceLoading
                          ? "#aaa"
                          : "#f2b705",
                      color: "#041832",
                      cursor:
                        !cameraActive ||
                        capturing ||
                        faceLoading
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "700",
                    }}
                  >
                    {capturing
                      ? "Capturing..."
                      : "Register Face"}
                  </button>
                </div>

                {faceLoading && (
                  <p
                    style={{
                      color: "#666",
                      marginTop: "10px",
                    }}
                  >
                    Loading face recognition models...
                  </p>
                )}
              </div>

              {/* FINGERPRINT */}

              <h2
                style={{
                  color: "#041832",
                }}
              >
                4. Register Fingerprint
              </h2>

              <div
                style={{
                  padding: "25px",
                  background: "#f5f7fa",
                  borderRadius: "10px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    color: "#555",
                    lineHeight: "1.6",
                  }}
                >
                  The fingerprint is registered using
                  your device's built-in biometric
                  authentication, such as fingerprint or
                  another supported platform authenticator.
                </p>

                <button
                  onClick={registerFingerprint}
                  disabled={
                    faceStatus !== "Registered" ||
                    fingerprintStatus === "Registered"
                  }
                  style={{
                    padding: "13px 24px",
                    border: "none",
                    borderRadius: "6px",
                    background:
                      faceStatus !== "Registered" ||
                      fingerprintStatus === "Registered"
                        ? "#aaa"
                        : "#003b70",
                    color: "#fff",
                    cursor:
                      faceStatus !== "Registered" ||
                      fingerprintStatus === "Registered"
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "700",
                    fontSize: "15px",
                  }}
                >
                  {fingerprintStatus === "Registered"
                    ? "Fingerprint Registered"
                    : "Register Fingerprint"}
                </button>

                {faceStatus !== "Registered" && (
                  <p
                    style={{
                      marginTop: "12px",
                      color: "#a12626",
                    }}
                  >
                    Register the student's face first.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BiometricRegistration;