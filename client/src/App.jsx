import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login, { getDashboardPath } from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Navbar from "./components/Navbar.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import SubmitProject from "./pages/student/SubmitProject.jsx";
import MyProjects from "./pages/student/MyProjects.jsx";
import UploadDocument from "./pages/student/UploadDocument.jsx";
import ViewGrades from "./pages/student/ViewGrades.jsx";
import StudentHome from "./pages/student/StudentHome.jsx";
import ReviewDocuments from "./pages/supervisor/ReviewDocuments.jsx";
import EvaluateProject from "./pages/supervisor/EvaluateProject.jsx";
import SupervisorHome from "./pages/supervisor/SupervisorHome.jsx";
import SupervisorProjects from "./pages/supervisor/SupervisorProjects.jsx";
import AdminHome from "./pages/admin/AdminHome.jsx";
import ManageUsers from "./pages/admin/ManageUsers.jsx";
import AssignSupervisor from "./pages/admin/AssignSupervisor.jsx";
import Reports from "./pages/admin/Reports.jsx";
import AdminAllProjects from "./pages/admin/AdminAllProjects.jsx";
import NotFound from "./pages/NotFound.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

/** Collapses `//admin/...` → `/admin/...` so routes still match after a bad link or manual URL. */
function PathSlashNormalizer() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const raw = location.pathname;
    const normalized = raw.replace(/\/{2,}/g, "/");
    if (normalized !== raw) {
      navigate(`${normalized}${location.search}${location.hash}`, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);
  return null;
}

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getDashboardPath(user.role)} replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PathSlashNormalizer />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/login"
          element={
            <>
              <Navbar />
              <Login />
            </>
          }
        />
        <Route
          path="/register"
          element={
            <>
              <Navbar />
              <Register />
            </>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
        </Route>

        <Route element={<PrivateRoute allowedRoles={["student"]} />}>
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
          <Route element={<DashboardLayout />}>
            <Route path="/student/dashboard" element={<StudentHome />} />
            <Route path="/student/submit-project" element={<SubmitProject />} />
            <Route path="/student/projects" element={<MyProjects />} />
            <Route path="/student/documents" element={<UploadDocument />} />
            <Route path="/student/grades" element={<ViewGrades />} />
          </Route>
        </Route>

        <Route element={<PrivateRoute allowedRoles={["supervisor"]} />}>
          <Route path="/supervisor" element={<Navigate to="/supervisor/dashboard" replace />} />
          <Route element={<DashboardLayout />}>
            <Route path="/supervisor/dashboard" element={<SupervisorHome />} />
            <Route path="/supervisor/projects" element={<SupervisorProjects />} />
            <Route path="/supervisor/documents" element={<ReviewDocuments />} />
            <Route path="/supervisor/evaluate" element={<EvaluateProject />} />
          </Route>
        </Route>

        <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminHome />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/assign" element={<AssignSupervisor />} />
            <Route path="/admin/projects" element={<AdminAllProjects />} />
            <Route path="/admin/reports" element={<Reports />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
