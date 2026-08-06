import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import StudentDashboard from './pages/StudentDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminStudents from './pages/AdminStudents';
import AcademicStructureManager from './pages/AcademicStructureManager';
import StudentProfile from './pages/StudentProfile';
import SessionsManager from './pages/SessionsManager';
import AuditLogViewer from './pages/AuditLogViewer';
import StudentAudit from './pages/StudentAudit';
import SecurityDashboard from './pages/SecurityDashboard';
import RoleProtectedRoute from './components/RoleProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route
          path="/change-password"
          element={
            <RoleProtectedRoute roles={['student', 'officer', 'admin']}>
              <ChangePassword />
            </RoleProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/student"
          element={
            <RoleProtectedRoute roles={['student']}>
              <StudentDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <RoleProtectedRoute roles={['student']}>
              <StudentProfile />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/student/sessions"
          element={
            <RoleProtectedRoute roles={['student', 'officer', 'admin']}>
              <SessionsManager />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/student/audit"
          element={
            <RoleProtectedRoute roles={['student']}>
              <StudentAudit />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/officer"
          element={
            <RoleProtectedRoute roles={['officer']}>
              <OfficerDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/academic"
          element={
            <RoleProtectedRoute roles={['admin']}>
              <AcademicStructureManager />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <RoleProtectedRoute roles={['admin']}>
              <AdminStudents />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RoleProtectedRoute roles={['admin']}>
              <AuditLogViewer />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <RoleProtectedRoute roles={['admin']}>
              <SecurityDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
