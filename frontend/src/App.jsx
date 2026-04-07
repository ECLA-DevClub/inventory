import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import FurnitureList from "./pages/FurnitureList";
import FurnitureCreate from "./pages/FurnitureCreate";
import FurnitureEdit from "./pages/FurnitureEdit";
import FurnitureDetail from "./pages/FurnitureDetail";
import FurnitureLabel from "./pages/FurnitureLabel";
import ScanPage from "./pages/ScanPage";
import AuditSession from "./pages/AuditSession";
import { AuthContext } from "./context/AuthContext";

function RoleRoute({ allow, children }) {
  const { role } = useContext(AuthContext);

  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { isAuthenticated, authReady } = useContext(AuthContext);

  if (!authReady) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),_transparent_28%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white/80 backdrop-blur-xl">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/furniture" element={<FurnitureList />} />
        <Route path="/furniture/:id" element={<FurnitureDetail />} />
        <Route path="/furniture/:id/label" element={<FurnitureLabel />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/audit" element={<AuditSession />} />

        <Route
          path="/furniture/create"
          element={
            <RoleRoute allow={["admin", "manager"]}>
              <FurnitureCreate />
            </RoleRoute>
          }
        />

        <Route
          path="/furniture/:id/edit"
          element={
            <RoleRoute allow={["admin", "manager"]}>
              <FurnitureEdit />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;