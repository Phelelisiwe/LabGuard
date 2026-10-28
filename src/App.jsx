import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import AdminLayout from "./pages/AdminLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OTPVerification from "./pages/OTPVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";
import ResetPassword from "./pages/ResetPassword";

import AdminDashboard from "./pages/AdminDashboard";
import LecturerLayout from "./pages/LecturerLayout";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterEmployee from "./pages/RegisterEmployee";
import ManageStudents from "./pages/ManageStudents";
import ManageEmployees from "./pages/ManageEmployees";
import DeleteUser from "./pages/DeleteUser";
import CreateModule from "./pages/CreateModule";
import AssignStudentModule from "./pages/AssignStudentModule";
import AssignLecturer from "./pages/AssignLecturer";
import StudentDashboard from "./pages/StudentDashboard";
import StudentModules from "./pages/StudentModules";
import StudentAttendance from "./pages/StudentAttendance";
import StudentCheckIn from "./pages/StudentCheckIn";
import StudentLayout from "./pages/StudentLayout";

import LecturerDashboard from "./pages/LecturerDashboard";
import LecturerModules from "./pages/LecturerModules";
import LecturerAttendance from "./pages/LecturerAttendance";
import LecturerStudents from "./pages/LecturerStudents";
import LecturerOverallAttendance from "./pages/LecturerOverallAttendance";
import LecturerPrediction from "./pages/LecturerPrediction";

import UpdateInformation from "./pages/UpdateInformation";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LANDING PAGE */}
        <Route path="/" element={<LandingPage />} />

        {/* AUTHENTICATION */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<OTPVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        
        {/* SUPER ADMIN - SHARED LAYOUT */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="register-student" element={<RegisterStudent />} />
          <Route path="register-employee" element={<RegisterEmployee />} />
          <Route path="students" element={<ManageStudents />} />
          <Route path="employees" element={<ManageEmployees />} />
          <Route path="delete-user" element={<DeleteUser />} />
          <Route path="create-module" element={<CreateModule />} />
          <Route path="assign-student" element={<AssignStudentModule />} />
          <Route path="assign-lecturer" element={<AssignLecturer />} />
          <Route path="update-information" element={<UpdateInformation />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        {/* STUDENT */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="modules" element={<StudentModules />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="check-in" element={<StudentCheckIn />} />
          <Route path="update-information" element={<UpdateInformation />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        {/* LECTURER */}
        <Route path="/lecturer" element={<LecturerLayout />}>
          <Route index element={<LecturerDashboard />} />
          <Route path="modules" element={<LecturerModules />} />
          <Route path="students/:moduleId" element={<LecturerStudents />} />
          <Route path="attendance/:moduleId" element={<LecturerAttendance />} />
          <Route
            path="attendance/:moduleId/overall"
            element={<LecturerOverallAttendance />}
          />
          <Route
            path="attendance/:moduleId/prediction"
            element={<LecturerPrediction />}
          />
          <Route path="update-information" element={<UpdateInformation />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>

        {/* ACCOUNT */}
        <Route path="/update-information" element={<UpdateInformation />} />
        <Route path="/change-password" element={<ChangePassword />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;