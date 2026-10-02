
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OTPVerification from "./pages/OTPVerification";
import ForgotPassword from "./pages/ForgotPassword";

import AdminDashboard from "./pages/AdminDashboard";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterEmployee from "./pages/RegisterEmployee";
import ManageStudents from "./pages/ManageStudents";
import ManageEmployees from "./pages/ManageEmployees";
import CreateModule from "./pages/CreateModule";
import AssignStudentModule from "./pages/AssignStudentModule";
import AssignLecturer from "./pages/AssignLecturer";
import BiometricRegistration from "./pages/BiometricRegistration";

import StudentDashboard from "./pages/StudentDashboard";
import StudentModules from "./pages/StudentModules";
import StudentAttendance from "./pages/StudentAttendance";
import StudentCheckIn from "./pages/StudentCheckIn";

import LecturerDashboard from "./pages/LecturerDashboard";
import LecturerModules from "./pages/LecturerModules";
import LecturerAttendance from "./pages/LecturerAttendance";

import UpdateInformation from "./pages/UpdateInformation";
import ResetPassword from "./pages/ResetPassword";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ========================= */}
        {/* LANDING PAGE */}
        {/* ========================= */}

        <Route
          path="/"
          element={<LandingPage />}
        />


        {/* ========================= */}
        {/* AUTHENTICATION */}
        {/* ========================= */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/verify-otp"
          element={<OTPVerification />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

         <Route
  path="/reset-password"
  element={<ResetPassword />}
/>
        {/* ========================= */}
        {/* SUPER ADMIN */}
        {/* ========================= */}

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/register-student"
          element={<RegisterStudent />}
        />

        <Route
          path="/admin/register-employee"
          element={<RegisterEmployee />}
        />

        <Route
          path="/admin/students"
          element={<ManageStudents />}
        />

        <Route
          path="/admin/employees"
          element={<ManageEmployees />}
        />

        <Route
          path="/admin/create-module"
          element={<CreateModule />}
        />

        <Route
          path="/admin/assign-student"
          element={<AssignStudentModule />}
        />

        <Route
          path="/admin/assign-lecturer"
          element={<AssignLecturer />}
        />

        <Route
          path="/admin/biometric"
          element={<BiometricRegistration />}
        />


        {/* ========================= */}
        {/* STUDENT */}
        {/* ========================= */}

        <Route
          path="/student"
          element={<StudentDashboard />}
        />

        <Route
          path="/student/modules"
          element={<StudentModules />}
        />

        <Route
          path="/student/attendance"
          element={<StudentAttendance />}
        />

        <Route
          path="/student/check-in"
          element={<StudentCheckIn />}
        />


        {/* ========================= */}
        {/* LECTURER */}
        {/* ========================= */}

        <Route
          path="/lecturer"
          element={<LecturerDashboard />}
        />

        <Route
          path="/lecturer/modules"
          element={<LecturerModules />}
        />

        <Route
          path="/lecturer/attendance/:moduleId"
          element={<LecturerAttendance />}
        />


        {/* ========================= */}
        {/* ACCOUNT */}
        {/* ========================= */}

        <Route
          path="/update-information"
          element={<UpdateInformation />}
        />

      </Routes>
    </BrowserRouter>
  );
}


export default App;


